import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { playSound } from '@/core/sound';
import { BG_COLORS, PAPERS, getPaper } from './papers';
import { INK_COLORS, SIZES, SIZE_IDS, eraseAlong, eraserRadius, newStrokeId, strokeOpacity, strokePath, type InkTool, type Stroke } from './model';
import { useBoard } from './store';

// 판서 창(전체 화면 칠판): 펜 · 형광펜 · 지우개, 색 8가지, 굵기 4단계, 되돌리기, 모두 지우기, 용지 8종.
// 손가락 · 펜 · 마우스를 모두 포인터 입력으로 받는다. 그리는 동안에는 한 손가락(포인터 하나)만 받는다.

const TOOLS: { id: InkTool; label: string; icon: string }[] = [
  { id: 'pen', label: '펜', icon: 'ph-fill ph-pen-nib' },
  { id: 'highlighter', label: '형광펜', icon: 'ph-fill ph-highlighter' },
  { id: 'eraser', label: '지우개', icon: 'ph-fill ph-eraser' },
];

/** 이미 그린 획. 획 하나가 바뀌지 않으면 다시 계산하지 않는다 */
const StrokePath = memo(({ s }: { s: Stroke }) => <path d={strokePath(s)} fill={s.color} opacity={strokeOpacity(s)} />);

export function BoardWindow({ onClose }: { onClose: () => void }) {
  const b = useBoard();
  const areaRef = useRef<HTMLDivElement>(null);
  const paperRef = useRef<HTMLCanvasElement>(null);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const active = useRef<{ id: number; draft: Stroke | null; before: Stroke[]; raf: number; last: { x: number; y: number } } | null>(null);
  const curSize = b.sizes[b.tool];
  const closeRef = useRef(onClose);                               // 부모가 자주 다시 그려져도 아래 준비 작업을 되풀이하지 않게
  closeRef.current = onClose;

  // 용지(줄 · 격자 등)는 캔버스에 그린다. 칠판 크기가 바뀌면 다시 그린다
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
    getPaper(b.paper).draw(ctx, { left: 0, top: 0, right: size.w, bottom: size.h, scale: 1 });
    ctx.restore();
  }, [b.paper, size]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) useBoard.getState().redo(); else useBoard.getState().undo(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey, true); };
  }, []);

  const pos = (e: { clientX: number; clientY: number }) => {
    const r = areaRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  /** 지우개: 바로 앞 위치에서 지금 위치까지 지나간 길을 지운다 */
  const erase = (x: number, y: number) => {
    const st = useBoard.getState();
    const from = active.current?.last ?? { x, y };
    st.setLive(eraseAlong(st.strokes, from.x, from.y, x, y, eraserRadius(st.sizes.eraser)));
    if (active.current) active.current.last = { x, y };
  };

  const down = (e: React.PointerEvent) => {
    if (active.current || e.button > 0) return;                    // 그리는 중에 닿은 다른 손가락(손바닥)은 무시한다
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 그리기는 된다 (칠판 밖으로 나가면 거기서 끝난다) */ }
    setMenu(false);
    const { x, y } = pos(e);
    const st = useBoard.getState();
    if (st.tool === 'eraser') {
      active.current = { id: e.pointerId, draft: null, before: st.strokes, raf: 0, last: { x, y } };
      setCursor({ x, y }); erase(x, y);
      return;
    }
    const stroke: Stroke = { id: newStrokeId(), variant: st.tool, color: st.color, size: st.sizes[st.tool], points: [x, y, e.pressure || 0.5] };
    active.current = { id: e.pointerId, draft: stroke, before: st.strokes, raf: 0, last: { x, y } };
    setDraft(stroke);
  };
  const move = (e: React.PointerEvent) => {
    const a = active.current;
    const eraser = useBoard.getState().tool === 'eraser';
    if (eraser) setCursor(pos(e));                                 // 지우개는 닿기 전에도 크기를 보여 준다
    if (!a || a.id !== e.pointerId) return;
    if (eraser) { const p = pos(e); erase(p.x, p.y); return; }
    if (!a.draft) return;
    // 빠르게 그을 때 빠지는 중간 점까지 모은다 → 곡선이 끊기지 않는다
    const native = e.nativeEvent;
    const list = typeof native.getCoalescedEvents === 'function' && native.getCoalescedEvents().length ? native.getCoalescedEvents() : [native];
    for (const ev of list) { const p = pos(ev); a.draft.points.push(p.x, p.y, ev.pressure || 0.5); }
    if (!a.raf) a.raf = requestAnimationFrame(() => { a.raf = 0; if (a.draft) setDraft({ ...a.draft }); });   // 화면 반영은 프레임마다 한 번
  };
  const up = (e: React.PointerEvent) => {
    const a = active.current;
    if (!a || a.id !== e.pointerId) return;
    active.current = null;
    if (a.raf) cancelAnimationFrame(a.raf);
    if (a.draft) { useBoard.getState().add(a.draft); setDraft(null); }
    else useBoard.getState().commitFrom(a.before);                // 지운 것은 손을 뗄 때 한 번에 기록 → 되돌리기 한 번으로 돌아온다
  };

  const radius = eraserRadius(b.sizes.eraser);
  return createPortal(
    <div className="bd" role="dialog" aria-modal="true" aria-label="판서">
      <div className="bd-bar">
        <div className="bd-group" role="group" aria-label="도구">
          {TOOLS.map((t) => (
            <button key={t.id} className={`bd-tool${b.tool === t.id ? ' on' : ''}`} aria-pressed={b.tool === t.id} title={t.label} onClick={() => { b.setTool(t.id); playSound('select'); }}>
              <i className={t.icon} /><span>{t.label}</span>
            </button>
          ))}
        </div>
        <div className="bd-group" role="group" aria-label="색">
          {INK_COLORS.map((c) => (
            <button key={c.hex} className={`bd-color${b.tool !== 'eraser' && b.color === c.hex ? ' on' : ''}`} style={{ background: c.hex }} aria-label={c.name} aria-pressed={b.color === c.hex} title={c.name} onClick={() => b.setColor(c.hex)} />
          ))}
        </div>
        <div className="bd-group" role="group" aria-label="굵기">
          {SIZE_IDS.map((s) => (
            <button key={s} className={`bd-size${curSize === s ? ' on' : ''}`} aria-label={`굵기 ${s}`} aria-pressed={curSize === s} title={`굵기 ${s}`} onClick={() => b.setSize(s)}>
              <i style={{ width: 6 + SIZES[s] * 0.75, height: 6 + SIZES[s] * 0.75 }} />
            </button>
          ))}
        </div>
        <div className="bd-group bd-right">
          <button className="bd-act" disabled={!b.history.past.length} title="되돌리기" aria-label="되돌리기" onClick={b.undo}><i className="ph-bold ph-arrow-counter-clockwise" /></button>
          <button className="bd-act" disabled={!b.history.future.length} title="다시 하기" aria-label="다시 하기" onClick={b.redo}><i className="ph-bold ph-arrow-clockwise" /></button>
          <button className="bd-act" disabled={!b.strokes.length} title="모두 지우기" aria-label="모두 지우기"
            onClick={() => { if (confirm('칠판을 모두 지울까요? (되돌리기로 다시 살릴 수 있어요)')) { b.clear(); playSound('check'); } }}><i className="ph-bold ph-trash" /></button>
          <button className={`bd-act${menu ? ' on' : ''}`} title="용지 고르기" aria-label="용지 고르기" aria-expanded={menu} onClick={() => setMenu(!menu)}><i className="ph-bold ph-note" /></button>
          <button className="bd-act bd-close" title="닫기" aria-label="판서 닫기" onClick={onClose}>✕</button>
        </div>
      {menu && (
        <div className="bd-menu">
          <div className="bd-menu-h">용지</div>
          <div className="bd-papers">
            {PAPERS.map((p) => <button key={p.id} className={b.paper === p.id ? 'on' : ''} aria-pressed={b.paper === p.id} onClick={() => { b.setPaper(p.id); playSound('select'); }}>{p.name}</button>)}
          </div>
          <div className="bd-menu-h">바탕색</div>
          <div className="bd-bgs">
            {BG_COLORS.map((c) => <button key={c.hex} className={b.bg === c.hex ? 'on' : ''} style={{ background: c.hex }} aria-label={c.name} aria-pressed={b.bg === c.hex} title={c.name} onClick={() => b.setBg(c.hex)} />)}
          </div>
        </div>
      )}
      </div>
      <div className={`bd-area ${b.tool}`} ref={areaRef} style={{ background: b.bg }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={(e) => { setCursor(null); if (!e.currentTarget.hasPointerCapture(e.pointerId)) up(e); }}
        onContextMenu={(e) => e.preventDefault()}>
        <canvas ref={paperRef} className="bd-paper" aria-hidden="true" />
        <svg className="bd-ink" width={size.w} height={size.h} aria-hidden="true">
          {b.strokes.map((s) => <StrokePath key={s.id} s={s} />)}
          {draft && <path d={strokePath(draft)} fill={draft.color} opacity={strokeOpacity(draft)} />}
          {b.tool === 'eraser' && cursor && <circle cx={cursor.x} cy={cursor.y} r={radius} fill="rgba(148,163,184,.18)" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 4" />}
        </svg>
        {!b.strokes.length && !draft && <div className="bd-hint">손가락이나 펜으로 써 보세요 ✏️</div>}
      </div>
    </div>,
    document.body,
  );
}
