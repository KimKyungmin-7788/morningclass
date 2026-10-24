import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { playSound } from '@/core/sound';
import { toast } from '@/core/ui/toast';
import { BoardPanel } from './BoardPanel';
import { useColumns } from './columns';
import { Icon } from './icons';
import { boardToPng, downloadBlob, fileToBoardImage, sheetToBoardImage } from './image';
import { INK_COLORS, SIZES, columnOf, columnRange, dashArray, eraseAlong, eraserRadius, imageAt, imageBox, inkPressure, isUniformLine, linePath, newStrokeId, resizeImage, rotateImage, smoothPoints, strokeOpacity, strokePath, toImageLocal, type BoardImage, type InkTool, type Stroke } from './model';
import { getPaper } from './papers';
import { useBoard } from './store';
import { getTool } from './tools';

// 판서 창(전체 화면 칠판). 칠판이 화면을 가득 채우고 그 위에 왼쪽 도구 영역 · 위쪽 날짜와 시각 · 오른쪽 위 단추가 떠 있다.
// 손가락 · 펜 · 마우스를 모두 포인터 입력으로 받는다. 평소에는 한 손가락(포인터 하나)만 받고,
// 학생별로 칸을 나눴을 때는 칸마다 하나씩 받아서 여러 학생이 동시에 쓴다.
// 획과 그림의 좌표는 칠판 좌표(손 도구로 옮긴 만큼을 뺀 값)로 가지고 있다.

/** 획 하나. 바뀌지 않은 획은 다시 계산하지 않는다 */
const StrokeShape = memo(({ s }: { s: Stroke }) => (isUniformLine(s)
  ? <path d={linePath(s)} fill="none" stroke={s.color} strokeWidth={SIZES[s.size]} strokeDasharray={dashArray(s.dash, SIZES[s.size])} strokeLinecap="round" strokeLinejoin="round" />
  : <path d={strokePath(s)} fill={s.color} opacity={strokeOpacity(s)} />));

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const clockLabel = (d: Date) => `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]}) ${d.getHours() < 12 ? '오전' : '오후'} ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
/** "10월 11일 (일) 오전 2:44" — 분이 바뀔 때마다 고친다 */
function useClock() {
  const [label, setLabel] = useState(() => clockLabel(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setLabel(clockLabel(now));
      timer = setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return label;
}

/** 고른 그림의 손잡이 (크기 바꾸기 · 돌리기)를 잡았다고 보는 거리 — 손가락으로도 잡히게 넉넉히 */
const HANDLE = 26;
/** 돌리기 손잡이가 그림 위쪽 변에서 떨어진 거리 */
const ROTATE_GAP = 36;
/** 왼쪽 위 되돌리기 상자의 너비 — 이름표가 이 밑으로 들어가지 않게 피한다 */
const TOP_BOX = 190;
/** 오른쪽 위 상자(그림 파일로 저장 · 닫기)의 너비 */
const RIGHT_BOX = 140;
/** 붙여넣기 단추가 생겼을 때 오른쪽 위 상자가 더 넓어지는 만큼 */
const PASTE_BTN = 52;
const two = (n: number) => String(n).padStart(2, '0');

/** 누르고 있는 포인터 하나가 하는 일 */
interface Active {
  kind: 'draw' | 'erase' | 'pan' | 'move' | 'resize' | 'rotate';
  /** 칸을 나눴을 때 이 포인터의 칸 (나누지 않았으면 -1) */
  col: number;
  draft?: Stroke;
  /** 바로 앞 점 (칠판 좌표) */
  last: { x: number; y: number };
  /** 바로 앞 화면 위치 (손 도구) */
  screen: { x: number; y: number };
  /** 이번에 끌면서 되돌리기 기록을 남겼는가 */
  began: boolean;
  /** 옮기거나 크기를 바꾸는 그림과, 잡은 자리 */
  image?: BoardImage;
  grab?: { dx: number; dy: number };
}

export function BoardWindow({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  const b = useBoard();
  const { columns } = useColumns();
  const areaRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [drafts, setDrafts] = useState<Stroke[]>([]);
  const [cursors, setCursors] = useState<Record<number, { x: number; y: number }>>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  /** 펜 색을 고르는 중인 칸 */
  const [picking, setPicking] = useState<number | null>(null);
  const actives = useRef(new Map<number, Active>());
  const raf = useRef(0);
  const clock = useClock();
  const tool = getTool(b.tool);
  const n = columns.length;
  const live = useRef({ n, size, onClose, columns });             // 입력 처리와 단축키는 늘 지금 값을 본다
  live.current = { n, size, onClose, columns };

  useEffect(() => { void useBoard.getState().load(); }, []);

  // 용지(줄 · 격자 등)는 캔버스에 그린다. 칠판 크기가 바뀌거나 손 도구로 옮기면 다시 그린다
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    const ro = new ResizeObserver(() => setSize({ w: area.clientWidth, h: area.clientHeight }));
    ro.observe(area);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const cv = paperRef.current;
    if (!cv || !size.w) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(size.w * dpr); cv.height = Math.round(size.h * dpr);
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.save();
    const { x, y } = b.viewport;
    ctx.translate(x, y);                                           // 무늬는 칠판 원점에 맞춰 그려서, 옮겨도 획과 어긋나지 않는다
    getPaper(b.paper).draw(ctx, { left: -x, top: -y, right: size.w - x, bottom: size.h - y, scale: 1 });
    ctx.restore();
  }, [b.paper, b.viewport, size]);

  /** 그림 파일을 칠판에 붙인다 */
  const addImages = async (files: Blob[]) => {
    for (const file of files) {
      try {
        const st = useBoard.getState();
        const area = areaRef.current!;                             // 크기는 그때 직접 잰다 (기억해 둔 값은 화면이 가려져 있던 동안 낡았을 수 있다)
        st.addImage(await fileToBoardImage(file, { w: area.clientWidth, h: area.clientHeight }, st.viewport));
        toast('그림을 붙였어요. 끌어서 옮기고, 손잡이로 크기를 바꾸거나 돌려요');
      } catch {
        toast('그림을 읽지 못했어요', 'error');
      }
    }
  };
  const addImagesRef = useRef(addImages);
  addImagesRef.current = addImages;

  useEffect(() => {
    const owner = areaRef.current?.ownerDocument ?? document;
    const host = owner.defaultView ?? window;
    const prev = owner.body.style.overflow;
    if(!embedded) owner.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      const st = useBoard.getState();
      const key = e.key.toLowerCase();
      if (e.key === 'Escape') { if(owner.fullscreenElement)return; e.preventDefault(); if (st.ui.confirmClear) st.setUi({ confirmClear: false }); else live.current.onClose(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'z') { e.preventDefault(); if (e.shiftKey) st.redo(); else st.undo(); }
      else if ((e.ctrlKey || e.metaKey) && key === 'y') { e.preventDefault(); st.redo(); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && st.selected) { e.preventDefault(); st.removeImage(st.selected); }
      else if ((e.ctrlKey || e.metaKey) && key === 'c' && st.selected) { e.preventDefault(); st.copyImage(st.selected); }
      else if ((e.ctrlKey || e.metaKey) && key === 'x' && st.selected) { e.preventDefault(); st.cutImage(st.selected); }
    };
    // 붙여넣기(Ctrl+V): 다른 곳에서 복사해 온 그림이 있으면 그것을, 없으면 칠판에서 복사하거나 잘라낸 그림을 붙인다
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.items ?? [])].filter((it) => it.type.startsWith('image/')).map((it) => it.getAsFile()).filter((f): f is File => !!f);
      if (files.length) { e.preventDefault(); void addImagesRef.current(files); }
      else if (useBoard.getState().clip) { e.preventDefault(); useBoard.getState().pasteImage(); }
    };
    host.addEventListener('keydown', onKey, true);
    host.addEventListener('paste', onPaste);
    return () => { if(!embedded)owner.body.style.overflow = prev; host.removeEventListener('keydown', onKey, true); host.removeEventListener('paste', onPaste); };
  }, []);

  /** 화면 위치 → 칠판 좌표. 칸을 나눴으면 자기 칸 밖으로 나가지 않게 한다 */
  const pos = (e: { clientX: number; clientY: number }, col = -1) => {
    const r = areaRef.current!.getBoundingClientRect();
    const v = useBoard.getState().viewport;
    let sx = e.clientX - r.left;
    if (col >= 0) { const { left, right } = columnRange(col, r.width, live.current.n); sx = Math.min(right - 4, Math.max(left + 4, sx)); }
    return { x: sx - v.x, y: e.clientY - r.top - v.y };
  };
  /** 그리는 중인 획들 — 입력 점을 부드러운 곡선으로 다듬은 모습 (손을 떼면 이 모습 그대로 획이 된다) */
  const smoothDrafts = () => [...actives.current.values()].filter((a) => a.draft).map((a) => ({ ...a.draft!, points: smoothPoints(a.draft!.points) }));
  /** 그리는 중인 획들을 다음 프레임에 한 번만 화면에 반영한다 */
  const flush = () => {
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => { raf.current = 0; setDrafts(smoothDrafts()); });
  };
  /** 지우개: 바로 앞 위치에서 지금 위치까지 지나간 길을 지운다 */
  const erase = (a: Active, x: number, y: number) => {
    const st = useBoard.getState();
    const next = eraseAlong(st.strokes, a.last.x, a.last.y, x, y, eraserRadius(st.values.eraser.size));
    a.last = { x, y };
    if (next === st.strokes) return;
    if (!a.began) { st.begin(); a.began = true; }                  // 한 번 끌어서 지운 것은 되돌리기 한 번으로 돌아온다
    st.setLive({ strokes: next });
  };

  const down = (e: React.PointerEvent) => {
    if (e.button > 0) return;
    const st = useBoard.getState();
    const { behavior } = getTool(st.tool);
    const writing = behavior === 'draw' || behavior === 'erase';
    const r = e.currentTarget.getBoundingClientRect();
    // 칸을 나눴으면 칸마다 한 명씩 동시에 쓴다. 그 밖에는 먼저 닿은 하나만 받는다 (손바닥 · 다른 손가락은 무시)
    const col = writing && live.current.n ? columnOf(e.clientX - r.left, r.width, live.current.n) : -1;
    if (col >= 0 ? [...actives.current.values()].some((a) => a.col === col) : actives.current.size) return;
    st.touchCanvas(writing);
    setPicking((p) => (p === null || (col >= 0 && p !== col) ? p : null));   // 색을 고르던 칸에 쓰기 시작하면 색 고르기는 닫는다
    const { x, y } = pos(e, col);
    const a: Active = { kind: 'pan', col, last: { x, y }, screen: { x: e.clientX, y: e.clientY }, began: false };

    if (behavior === 'select') {
      // 선택 도구: 그림을 골라 옮기고, 고른 그림의 오른쪽 아래 손잡이로 크기를 바꾸고, 위쪽 손잡이로 돌린다
      const sel = st.images.find((m) => m.id === st.selected);
      const l = sel && toImageLocal(sel, x, y);                     // 돌린 그림도 손잡이 자리는 그림 기준으로 따진다
      if (sel && l && Math.hypot(l.x - sel.w / 2, l.y - sel.h / 2) <= HANDLE) { a.kind = 'resize'; a.image = sel; }
      else if (sel && l && Math.hypot(l.x, l.y + sel.h / 2 + ROTATE_GAP) <= HANDLE) { a.kind = 'rotate'; a.image = sel; }
      else {
        const hit = imageAt(st.images, x, y);
        st.select(hit?.id ?? null);
        if (!hit) return;
        a.kind = 'move'; a.image = hit; a.grab = { dx: x - hit.x, dy: y - hit.y };
      }
    } else if (behavior === 'erase') {
      a.kind = 'erase';
      setCursors((c) => ({ ...c, [e.pointerId]: { x, y } }));
      erase(a, x, y);
    } else if (behavior === 'draw') {
      const variant = st.tool as Exclude<InkTool, 'eraser'>;
      const v = st.values[variant];
      a.kind = 'draw';
      a.draft = { id: newStrokeId(), variant, color: col >= 0 ? live.current.columns[col].ink : v.color, size: v.size, dash: variant === 'pen' ? v.style : 'draw', points: [x, y, 0.5] };
      flush();
    }
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 그리기는 된다 (칠판 밖으로 나가면 거기서 끝난다) */ }
    actives.current.set(e.pointerId, a);
  };
  const move = (e: React.PointerEvent) => {
    const a = actives.current.get(e.pointerId);
    const st = useBoard.getState();
    if (getTool(st.tool).behavior === 'erase') { const p = pos(e, a?.col); setCursors((c) => ({ ...c, [e.pointerId]: p })); }   // 지우개는 닿기 전에도 크기를 보여 준다
    if (!a) return;
    if (a.kind === 'pan') { st.panBy(e.clientX - a.screen.x, e.clientY - a.screen.y); a.screen = { x: e.clientX, y: e.clientY }; return; }
    if (a.kind === 'erase') { const p = pos(e, a.col); erase(a, p.x, p.y); return; }
    if (a.kind === 'move' || a.kind === 'resize' || a.kind === 'rotate') {
      const m = a.image!;
      const p = pos(e);
      const next = a.kind === 'move' ? { ...m, x: p.x - a.grab!.dx, y: p.y - a.grab!.dy } : a.kind === 'resize' ? resizeImage(m, p.x, p.y) : rotateImage(m, p.x, p.y);
      if (!a.began) { st.begin(); a.began = true; }
      st.setLive({ images: st.images.map((it) => (it.id === m.id ? next : it)) });
      return;
    }
    const d = a.draft;
    if (!d) return;
    // 빠르게 그을 때 빠지는 중간 점까지 모은다 → 곡선이 끊기지 않는다
    const native = e.nativeEvent;
    const list = typeof native.getCoalescedEvents === 'function' && native.getCoalescedEvents().length ? native.getCoalescedEvents() : [native];
    for (const ev of list) {
      const p = pos(ev, a.col);
      // 펜 굵기(누르는 힘)는 그을 때 정해서 점에 적어 둔다 → 손을 떼거나 지우개로 잘라도 굵기가 변하지 않는다
      const force = d.variant === 'pen' ? inkPressure(d.points[d.points.length - 1], Math.hypot(p.x - a.last.x, p.y - a.last.y), d.size) : 0.5;
      d.points.push(p.x, p.y, force);
      a.last = p;
    }
    flush();
  };
  const up = (e: React.PointerEvent) => {
    const a = actives.current.get(e.pointerId);
    if (e.pointerType !== 'mouse') setCursors((c) => { const { [e.pointerId]: _gone, ...rest } = c; return rest; });   // 손가락 · 펜은 떼면 지우개 동그라미도 사라진다
    if (!a) return;
    actives.current.delete(e.pointerId);
    if (!a.draft) return;
    useBoard.getState().add({ ...a.draft, points: smoothPoints(a.draft.points) });
    cancelAnimationFrame(raf.current); raf.current = 0;            // 방금 넣은 획이 그리는 중 모습과 한 프레임 겹쳐 보이지 않게 바로 반영한다
    setDrafts(smoothDrafts());
  };
  const leave = (e: React.PointerEvent) => {
    setCursors((c) => { const { [e.pointerId]: _gone, ...rest } = c; return rest; });
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) up(e);
  };

  /** 지금 화면에 보이는 판서를 그림 파일(PNG)로 내려받는다 */
  const savePicture = async () => {
    try {
      const st = useBoard.getState();
      const blob = await boardToPng({ strokes: st.strokes, images: st.images, paper: st.paper, bg: st.bg, viewport: st.viewport, columns: columns.map((c) => ({ name: c.name, ink: c.ink })) }, areaRef.current!.clientWidth, areaRef.current!.clientHeight);
      const d = new Date();
      downloadBlob(blob, `판서_${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}_${two(d.getHours())}${two(d.getMinutes())}.png`);
      playSound('check');
      toast('판서를 그림 파일로 저장했어요');
    } catch {
      toast('그림으로 저장하지 못했어요', 'error');
    }
  };

  const radius = eraserRadius(b.values.eraser.size);
  const selected = b.tool === 'select' ? b.images.find((m) => m.id === b.selected) : undefined;
  const content = <div className="bd" role="dialog" aria-modal="true" aria-label="판서" style={{ background: b.bg }}>
      <div className="bd-area" ref={areaRef} style={{ cursor: tool.cursor }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={leave}
        onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={paperRef} className="bd-paper" aria-hidden="true" />
        <svg className="bd-ink" width={size.w} height={size.h} aria-hidden="true">
          <g transform={`translate(${b.viewport.x} ${b.viewport.y})`}>
            {b.images.map((m) => <image key={m.id} href={m.src} x={m.x} y={m.y} width={m.w} height={m.h} preserveAspectRatio="none" opacity={m.opacity ?? 1} transform={`rotate(${m.rot ?? 0} ${m.x + m.w / 2} ${m.y + m.h / 2})`} />)}
            {b.strokes.map((s) => <StrokeShape key={s.id} s={s} />)}
            {drafts.map((s) => <StrokeShape key={s.id} s={s} />)}
            {selected && (
              <g transform={`rotate(${selected.rot ?? 0} ${selected.x + selected.w / 2} ${selected.y + selected.h / 2})`}>
                <rect x={selected.x} y={selected.y} width={selected.w} height={selected.h} fill="none" stroke="#1A1A1A" strokeWidth="1.5" strokeDasharray="6 5" />
                <path d={`M${selected.x + selected.w / 2} ${selected.y}v${-ROTATE_GAP}`} stroke="#1A1A1A" strokeWidth="1.5" />
                <circle cx={selected.x + selected.w / 2} cy={selected.y - ROTATE_GAP} r="10" fill="#fff" stroke="#1A1A1A" strokeWidth="2" />
                <path d="M4.2 0a4.2 4.2 0 1 1-1.4-3.1M4.4-4.6v2.6H1.8" transform={`translate(${selected.x + selected.w / 2} ${selected.y - ROTATE_GAP})`} fill="none" stroke="#1A1A1A" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={selected.x + selected.w} cy={selected.y + selected.h} r="9" fill="#fff" stroke="#1A1A1A" strokeWidth="2" />
              </g>
            )}
            {tool.behavior === 'erase' && Object.entries(cursors).map(([id, c]) => <circle key={id} cx={c.x} cy={c.y} r={radius} fill="none" stroke="#D0D0D0" strokeWidth="1.5" strokeDasharray="4 4" />)}
          </g>
        </svg>
        {!b.strokes.length && !b.images.length && !drafts.length && !n && <div className="bd-hint">손가락이나 펜으로 써 보세요 ✏️</div>}
      </div>

      {/* 학생별 칸: 칸 사이의 선과, 칸마다 위쪽 가운데에 붙는 이름표. 이름표를 누르면 그 칸의 펜 색을 고른다 */}
      {n > 0 && (
        <div className="bd-cols">
          {columns.map((s, i) => {
            const { left, right } = columnRange(i, size.w, n);
            // 위쪽 단추 상자를 피해서, 남는 자리의 가운데에 붙인다
            const from = Math.max(left + 8, b.ui.panelOpen ? TOP_BOX : 8);
            const to = Math.min(right - 8, size.w - RIGHT_BOX - (b.clip ? PASTE_BTN : 0));
            const fits = to - from >= 96;
            return (
              <div key={s.id}>
                {i > 0 && <i className="bd-col-line" style={{ left }} />}
                <div className="bd-col-top" style={{ left: fits ? (from + to) / 2 : (left + right) / 2, top: fits ? 18 : 84 }}>
                  <button className={`bd-col-name${picking === i ? ' on' : ''}`} style={{ maxWidth: fits ? to - from : right - left - 16 }} title="펜 색 고르기" aria-label={`${s.name} 펜 색 고르기`} aria-expanded={picking === i}
                    onClick={() => setPicking(picking === i ? null : i)}>
                    <i style={{ background: s.ink }} /><span>{s.name}</span>
                  </button>
                  {picking === i && (
                    <div className="bd-box bd-col-inks" role="group" aria-label={`${s.name} 펜 색`}>
                      {INK_COLORS.map((c) => <button key={c.hex} className={s.ink === c.hex ? 'on' : ''} style={{ background: c.hex }} aria-label={c.name} aria-pressed={s.ink === c.hex} title={c.name} onClick={() => { b.setSplitColor(s.id, c.hex); setPicking(null); playSound('select'); }} />)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!n && <div className="bd-clock">{clock}</div>}

      {/* 고른 그림의 도구 막대: 그림 아래(자리가 없으면 위)에 뜬다 */}
      {selected && (() => {
        const box = imageBox(selected);
        const below = box.bottom + b.viewport.y + 20;
        const patch = (next: Partial<BoardImage>) => b.setLive({ images: b.images.map((it) => (it.id === selected.id ? { ...it, ...next } : it)) });
        const percent = Math.round((selected.opacity ?? 1) * 100);
        return (
          <div className="bd-box bd-imgbar" role="toolbar" aria-label="그림 도구"
            style={{ left: Math.min(size.w - 250, Math.max(250, (box.left + box.right) / 2 + b.viewport.x)), top: below + 64 <= size.h ? below : Math.max(84, box.top + b.viewport.y - ROTATE_GAP - 84) }}>
            <button className="bd-btn" title="복사 (한 장 더)" aria-label="그림 복사" onClick={() => { b.copyImage(selected.id); b.pasteImage(); playSound('select'); }}><Icon id="copy" /></button>
            <button className="bd-btn" title="잘라내기" aria-label="그림 잘라내기" onClick={() => { b.cutImage(selected.id); toast('잘라냈어요. 오른쪽 위 붙여넣기 단추로 다시 붙여요'); }}><Icon id="cut" /></button>
            <i className="bd-sep" />
            <button className="bd-btn" title="오른쪽으로 90° 돌리기" aria-label="그림을 오른쪽으로 90도 돌리기" onClick={() => { b.begin(); patch({ rot: (Math.round((selected.rot ?? 0) / 90) * 90 + 90) % 360 }); }}><Icon id="rotate" /></button>
            <label className="bd-fade" title="투명도">
              <Icon id="opacity" />
              <input type="range" min={10} max={100} step={5} value={percent} aria-label="그림 투명도"
                onPointerDown={() => b.begin()} onChange={(e) => patch({ opacity: Number(e.target.value) / 100 })} />
              <span>{percent}%</span>
            </label>
            <i className="bd-sep" />
            <button className="bd-btn danger" title="지우기" aria-label="그림 지우기" onClick={() => b.removeImage(selected.id)}><Icon id="trash" /></button>
          </div>
        );
      })()}

      <BoardPanel onAddImage={() => fileRef.current?.click()}
        onAddSheet={(sheet) => {
          const st = useBoard.getState();
          const area = areaRef.current!;
          st.addImage(sheetToBoardImage(sheet, { w: area.clientWidth, h: area.clientHeight }, st.viewport));
          toast(`${sheet.title}을(를) 붙였어요. 펜으로 바꾸면 그 위에 쓸 수 있어요`);
        }} />
      <div className="bd-box bd-actions bd-top-right">
        {b.clip && <button className="bd-btn" title="붙여넣기" aria-label="복사한 그림 붙여넣기" onClick={b.pasteImage}><Icon id="paste" /></button>}
        <button className="bd-btn" title="그림 파일로 저장" aria-label="판서를 그림 파일로 저장" onClick={() => void savePicture()}><Icon id="download" /></button>
        <button className="bd-btn bd-close" title="닫기" aria-label="판서 닫기" onClick={onClose}><Icon id="close" /></button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { const files = [...(e.target.files ?? [])]; e.target.value = ''; void addImages(files); }} />

      {b.ui.confirmClear && (
        <div className="bd-dim" onClick={() => b.setUi({ confirmClear: false })}>
          <div className="bd-confirm" role="alertdialog" aria-label="전체 지우기" onClick={(e) => e.stopPropagation()}>
            <b>전체 지우기</b>
            <p>칠판의 모든 판서와 붙인 그림이 지워집니다. 계속할까요?</p>
            <div>
              <button onClick={() => b.setUi({ confirmClear: false })}>취소</button>
              <button className="danger" onClick={() => { b.clear(); b.setUi({ confirmClear: false }); playSound('check'); }}>전체 지우기</button>
            </div>
          </div>
        </div>
      )}
    </div>;
  return embedded ? content : createPortal(content,document.body);
}
