import { useEffect, useMemo, useRef, useState } from 'react';
import { playSound } from '@/core/sound';
import { boardCandidates, ladderStartFor, makeLadder, marblePath, marbleRows, pathFractions, traceLadder, wheelTurn, type DrawStyle } from './model';

// 뽑기 연출 네 가지: 긁는 복권 · 사다리 타기 · 구슬 뽑기 · 돌림판.
// 누가 뽑혔는지(winners)는 이미 정해져서 들어온다. 여기서는 그 결과를 재미있게 보여 주고, 다 보여 주면 onDone 을 한 번 부른다.

export interface StageProps {
  /** 후보 전체의 이름 */
  pool: string[];
  /** 뽑힌 학생의 이름 */
  winners: string[];
  onDone: () => void;
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899', '#eab308'];
const SLICE = ['#fde68a', '#bfdbfe', '#fbcfe8', '#bbf7d0', '#ddd6fe', '#fed7aa'];
/** 사다리 · 구슬 뽑기에 한 번에 올리는 후보 수 (더 많으면 이름이 읽히지 않는다) */
const BOARD_MAX = 8;
/** 돌림판 조각 수 한도 */
const WHEEL_MAX = 16;

/** 창을 닫으면 남은 예약을 모두 취소하는 setTimeout */
function useTimers() {
  const list = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => list.current.forEach(clearTimeout), []);
  return (fn: () => void, ms: number) => { list.current.push(setTimeout(fn, ms)); };
}

// ── 긁는 복권 ── 은박을 손가락으로 긁으면 이름이 나온다. 여러 장을 여러 명이 동시에 긁어도 된다
/** 은박이 이만큼 벗겨져야 이름이 열린다 */
const SCRATCH_OPEN = 0.72;
function ScratchTicket({ name, forced, onReveal }: { name: string; forced: boolean; onReveal: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [open, setOpen] = useState(false);
  const last = useRef(new Map<number, { x: number; y: number }>());
  const moves = useRef(0);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth; const h = cv.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#cbd5e1'); g.addColorStop(0.5, '#f1f5f9'); g.addColorStop(1, '#94a3b8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.max(17, Math.min(28, w / 10))}px 'Paperozi','Noto Sans KR',sans-serif`;
    ctx.fillText('여기를 긁어요 ✨', w / 2, h / 2);
  }, []);

  const reveal = () => { if (!open) { setOpen(true); playSound('correct'); onReveal(); } };
  useEffect(() => { if (forced) reveal(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [forced]);

  /** 은박이 얼마나 벗겨졌는지 (0~1) — 듬성듬성 찍어 본다 */
  const cleared = (cv: HTMLCanvasElement) => {
    const data = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let gone = 0; let all = 0;
    for (let i = 3; i < data.length; i += 4 * 97) { all += 1; if (data[i] < 40) gone += 1; }
    return gone / all;
  };
  const scratch = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cv = e.currentTarget;
    const from = last.current.get(e.pointerId);
    if (!from || open) return;
    const r = cv.getBoundingClientRect();
    const to = { x: e.clientX - r.left, y: e.clientY - r.top };
    const ctx = cv.getContext('2d')!;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = 34; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    last.current.set(e.pointerId, to);
    moves.current += 1;
    if (moves.current % 10 === 0) { playSound('check'); if (cleared(cv) > SCRATCH_OPEN) reveal(); }
  };

  return (
    <div className={`dr-ticket${open ? ' open' : ''}`}>
      <div className="dr-ticket-top">🎟️ 행운 복권</div>
      <div className="dr-ticket-win">
        <b>{name}</b>
        <canvas ref={ref} aria-label="긁어서 이름 보기"
          onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 긁을 수 있다 */ } const r = e.currentTarget.getBoundingClientRect(); last.current.set(e.pointerId, { x: e.clientX - r.left, y: e.clientY - r.top }); }}
          onPointerMove={scratch}
          onPointerUp={(e) => { last.current.delete(e.pointerId); if (!open && cleared(e.currentTarget) > SCRATCH_OPEN) reveal(); }}
          onPointerCancel={(e) => last.current.delete(e.pointerId)} />
      </div>
    </div>
  );
}

function ScratchStage({ winners, onDone }: StageProps) {
  const [opened, setOpened] = useState(0);
  const [forced, setForced] = useState(false);
  const later = useTimers();
  const count = useRef(0);
  const reveal = () => {
    count.current += 1;
    setOpened(count.current);
    if (count.current === winners.length) later(onDone, 1300);
  };
  return (
    <div className="dr-scratch">
      <div className="dr-tickets">{winners.map((w) => <ScratchTicket key={w} name={w} forced={forced} onReveal={reveal} />)}</div>
      {opened < winners.length && <button className="dr-skip" onClick={() => setForced(true)}>한 번에 보기</button>}
    </div>
  );
}

// ── 사다리 타기 ── 이름은 아래에 있고, 선생님이 위쪽 별을 누르면 그 별이 사다리를 타고 내려가 한 명에게 닿는다
function LadderStage({ pool, winners, onDone }: StageProps) {
  const later = useTimers();
  const names = useMemo(() => boardCandidates(pool, winners, BOARD_MAX), [pool, winners]);
  const levels = 11;
  const ladder = useMemo(() => makeLadder(names.length, levels), [names.length]);
  // 별마다: 위쪽 출발 줄과 내려가는 길 (왼쪽 별부터)
  const runs = useMemo(() => winners.map((w) => ladderStartFor(ladder, names.indexOf(w))).sort((p, q) => p - q).map((start) => ({ start, ...traceLadder(ladder, start) })), [ladder, names, winners]);
  const [going, setGoing] = useState<number[]>([]);               // 출발한 별
  const [arrived, setArrived] = useState<number[]>([]);           // 닿은 별
  const reached = useRef(0);
  const GAP = 76; const TOP = 56; const BOTTOM = 330;
  const W = Math.max(1, names.length) * GAP;
  const x = (c: number) => GAP / 2 + c * GAP;
  const y = (lv: number) => TOP + ((BOTTOM - TOP) * lv) / (levels + 1);
  const DUR = 6500;                                               // 한 번 내려가는 데 걸리는 시간 — 눈으로 따라갈 수 있게 천천히

  const start = (i: number) => {
    if (going.includes(i)) return;
    setGoing((g) => [...g, i]);
    playSound('sparkle');
    // 꺾일 때마다 딸깍, 닿으면 딩동
    pathFractions(runs[i].path).slice(1, -1).forEach((f) => later(() => playSound('drum'), f * DUR));
    later(() => {
      playSound('correct');
      setArrived((list) => [...list, i]);
      reached.current += 1;
      if (reached.current === runs.length) later(onDone, 1500);
    }, DUR);
  };

  const waiting = runs.length - going.length;
  return (
    <div className="dr-ladder-wrap">
      <div className="dr-guide">{waiting > 0 ? <>⭐ 별을 눌러 출발시켜요 <b>(남은 별 {waiting}개)</b></> : arrived.length < runs.length ? '별이 내려가고 있어요…' : '🎉 모두 도착!'}</div>
      <svg className="dr-ladder" viewBox={`0 0 ${W} 386`} style={{ maxWidth: W * 1.6 }} role="group" aria-label="사다리 타기">
        {names.map((nm, c) => {
          const run = runs.findIndex((r) => r.end === c);
          return (
            <g key={nm}>
              <line x1={x(c)} y1={TOP} x2={x(c)} y2={BOTTOM} className="dr-rail" />
              <text x={x(c)} y={BOTTOM + 30} className={`dr-name${run >= 0 && arrived.includes(run) ? ' on' : ''}`} style={{ fontSize: nm.length > 3 ? 14 : 18 }}>{nm}</text>
            </g>
          );
        })}
        {ladder.rungs.map((row, lv) => row.map((on, i) => on && <line key={`${lv}-${i}`} x1={x(i)} y1={y(lv + 1)} x2={x(i + 1)} y2={y(lv + 1)} className="dr-rail" />))}
        {runs.map((r, i) => going.includes(i) && (
          <polyline key={i} points={r.path.map(([c, lv]) => `${x(c)},${y(lv)}`).join(' ')} pathLength={1} className="dr-trace"
            style={{ stroke: COLORS[i % COLORS.length], animationDuration: `${DUR}ms` }} />
        ))}
        {runs.map((r, i) => (
          <g key={i} className={`dr-star${going.includes(i) ? ' gone' : ''}`} role="button" tabIndex={0} aria-label={`${i + 1}번째 별 출발`}
            onClick={() => start(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(i); } }}>
            <circle cx={x(r.start)} cy={TOP - 26} r="24" />
            <text x={x(r.start)} y={TOP - 17}>⭐</text>
          </g>
        ))}
        {arrived.map((i) => <text key={i} x={x(runs[i].end)} y={BOTTOM + 2} className="dr-landed">⭐</text>)}
      </svg>
    </div>
  );
}

// ── 구슬 뽑기 ── 구슬이 긴 못판을 타고 천천히 굴러 내려와 한 명의 칸에 떨어진다. 화면이 구슬을 따라 내려간다
function MarbleStage({ pool, winners, onDone }: StageProps) {
  const later = useTimers();
  const names = useMemo(() => boardCandidates(pool, winners, BOARD_MAX), [pool, winners]);
  const slots = names.length;
  const rows = marbleRows(slots);
  const paths = useMemo(() => winners.map((w) => marblePath(slots, names.indexOf(w))), [names, slots, winners]);
  const viewRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const balls = useRef<(HTMLElement | null)[]>([]);
  const [landed, setLanded] = useState(0);
  const [now, setNow] = useState(-1);                             // 지금 굴러가는 구슬
  const ROW = 46;                                                 // 못 줄 사이 높이(px)
  const HEAD = 40;                                                // 첫 못 위의 빈 자리
  const boardH = HEAD + rows * ROW + 20;
  const px = (half: number) => `${(half / (2 * slots)) * 100}%`;
  const py = (row: number) => HEAD + row * ROW;                   // 줄 0 = 첫 못, rows = 칸 바로 위
  /** 못 하나를 지나는 시간 — 끝이 가까워질수록 느려져서 어디에 떨어질지 끝까지 모른다 */
  const stepMs = (r: number) => 470 + Math.max(0, r - (rows - 6)) * 150;
  const times = [0, 420];                                         // 떨어지기 시작 → 첫 못
  for (let r = 1; r <= rows; r += 1) times.push(times[times.length - 1] + stepMs(r));
  const DUR = times[times.length - 1];

  useEffect(() => {
    let at = 700;
    paths.forEach((path, i) => {
      const startAt = at;
      later(() => {
        setNow(i);
        const viewH = viewRef.current?.clientHeight ?? 300;
        const follow = (ballY: number) => `translateY(${Math.min(0, Math.max(viewH - boardH - 52, viewH * 0.42 - ballY))}px)`;   // 구슬이 화면 가운데쯤에 오도록 판을 올린다
        const ball: Keyframe[] = [{ left: px(path[0]), top: '-14px', opacity: 1, offset: 0, easing: 'ease-in' }, { left: px(path[0]), top: `${py(0)}px`, opacity: 1, offset: times[1] / DUR, easing: 'ease-out' }];
        const board: Keyframe[] = [{ transform: follow(0), offset: 0 }, { transform: follow(py(0)), offset: times[1] / DUR }];
        for (let r = 1; r <= rows; r += 1) {
          const mid = (times[r] + times[r + 1]) / 2 / DUR;
          ball.push({ left: px((path[r - 1] + path[r]) / 2), top: `${py(r - 1) - 12}px`, opacity: 1, offset: mid, easing: 'ease-in' });   // 못에 맞고 살짝 튀어 오른다
          ball.push({ left: px(path[r]), top: `${r === rows ? boardH + 26 : py(r)}px`, opacity: 1, offset: times[r + 1] / DUR, easing: 'ease-out' });   // 마지막에는 칸 안으로 쏙
          board.push({ transform: follow(py(r)), offset: times[r + 1] / DUR });
        }
        balls.current[i]?.animate(ball, { duration: DUR, fill: 'forwards' });
        boardRef.current?.animate(board, { duration: DUR, fill: 'forwards', easing: 'linear' });
        for (let r = 0; r < rows; r += 1) later(() => playSound(r >= rows - 6 ? 'drum' : 'check'), times[r + 1]);
      }, startAt);
      later(() => { setLanded(i + 1); playSound('sparkle'); later(() => playSound('correct'), 250); }, startAt + DUR);
      at += DUR + 2200;                                           // 떨어진 칸을 잠깐 보여 주고 다음 구슬
    });
    later(onDone, at - 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pegs: { row: number; half: number }[] = [];
  for (let r = 0; r < rows; r += 1) for (let h = 1; h <= 2 * slots - 1; h += 1) if ((h + slots + r) % 2 === 0) pegs.push({ row: r, half: h });
  const hit = winners.slice(0, landed);
  return (
    <div className="dr-marble" style={{ maxWidth: Math.max(300, slots * 92) }}>
      <div className="dr-guide">{landed >= paths.length ? '🎉 구슬이 모두 떨어졌어요!' : now < 0 ? '🔮 구슬이 곧 떨어져요…' : <>🔮 {now + 1}번째 구슬 <b>({now + 1} / {paths.length})</b></>}</div>
      <div className="dr-marble-view" ref={viewRef}>
        <div className="dr-marble-board" ref={boardRef} style={{ height: boardH }}>
          {pegs.map((p) => <i key={`${p.row}-${p.half}`} className="dr-peg" style={{ left: px(p.half), top: py(p.row) }} />)}
          {paths.map((_, i) => <i key={i} ref={(el) => { balls.current[i] = el; }} className="dr-ball" style={{ background: `radial-gradient(circle at 32% 30%, #fff 0 12%, ${COLORS[i % COLORS.length]} 46%)` }} />)}
          <div className="dr-slots">{names.map((nm) => <div key={nm} className={`dr-slot${hit.includes(nm) ? ' on' : ''}${nm.length > 3 ? ' long' : ''}`}>{nm}</div>)}</div>
        </div>
      </div>
    </div>
  );
}

// ── 돌림판 ── 뽑을 사람 수만큼 돌리고, 위쪽 바늘에 멈춘 조각이 뽑힌 학생이다
function WheelStage({ pool, winners, onDone }: StageProps) {
  const later = useTimers();
  const names = useMemo(() => boardCandidates(pool, winners, WHEEL_MAX), [pool, winners]);
  const n = names.length;
  const [rot, setRot] = useState(0);
  const [dur, setDur] = useState(0);
  const [hit, setHit] = useState(0);
  const first = 8000; const next = 6000;                          // 오래 돌다가 아주 천천히 멈춘다

  useEffect(() => {
    let at = 350; let angle = 0;
    winners.forEach((w, i) => {
      const ms = i === 0 ? first : next;
      angle = wheelTurn(angle, names.indexOf(w), n, i === 0 ? 9 : 6);
      const target = angle;
      later(() => { setDur(ms); setRot(target); }, at);
      for (let t = 0; t < ms * 0.93; t += 90 + (t / ms) ** 2 * 620) later(() => playSound('drum'), at + t);   // 딸깍 소리가 점점 느려진다
      later(() => { setHit(i + 1); playSound('correct'); }, at + ms);
      at += ms + 1400;
    });
    later(onDone, at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slice = 360 / n;
  const point = (deg: number, r: number) => { const a = ((deg - 90) * Math.PI) / 180; return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`; };
  const done = winners.slice(0, hit);
  return (
    <div className="dr-wheel">
      <svg viewBox="-106 -112 212 218" role="img" aria-label="돌림판">
        <g style={{ transform: `rotate(${rot}deg)`, transition: `transform ${dur}ms cubic-bezier(.1,.55,.06,1)` }}>
          {names.map((nm, i) => (
            <g key={nm}>
              {n === 1 ? <circle r="100" fill={SLICE[0]} stroke="#fff" strokeWidth="1.5" />
                : <path d={`M0 0L${point(i * slice, 100)}A100 100 0 ${slice > 180 ? 1 : 0} 1 ${point((i + 1) * slice, 100)}Z`} fill={done.includes(nm) ? '#fb923c' : SLICE[i % SLICE.length]} stroke="#fff" strokeWidth="1.5" />}
              <text transform={`rotate(${(i + 0.5) * slice - 90}) translate(${n === 1 ? 0 : 62} 0)`} className="dr-wheel-nm" style={{ fontSize: Math.max(7, Math.min(15, 150 / n)) - (nm.length > 3 ? 2 : 0) }}>{nm}</text>
            </g>
          ))}
          <circle r="11" fill="#fff" stroke="#e2e8f0" strokeWidth="2" />
        </g>
        <path d="M-9 -112L9 -112L0 -92Z" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
      </svg>
      {done.length > 0 && <div className="dr-wheel-hit">{done.map((w) => <b key={w}>⭐ {w}</b>)}</div>}
    </div>
  );
}

const STAGES: Record<Exclude<DrawStyle, 'basic'>, (p: StageProps) => React.ReactElement> = {
  scratch: ScratchStage, ladder: LadderStage, marble: MarbleStage, wheel: WheelStage,
};

export function DrawStage({ style, ...props }: StageProps & { style: Exclude<DrawStyle, 'basic'> }) {
  const Stage = STAGES[style];
  return <div className={`dr-stage ${style}`}><Stage {...props} /></div>;
}
