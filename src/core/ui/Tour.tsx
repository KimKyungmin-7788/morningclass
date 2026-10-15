import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';
import { playSound } from '@/core/sound';

// 처음 한 번 보여 주는 안내(코치마크): 화면을 어둡게 하고 설명할 곳만 밝혀서 말풍선으로 짚어 준다.
// 기능은 useTour(이름, 단계) 만 부르면 된다 — 본 적 없는 안내면 화면이 한가할 때 한 번 띄운다.
// 본 안내 목록은 이 기기에만 기억한다 (설정의 '안내 다시 보기'로 지운다).

export interface TourStep {
  /**
   * 밝힐 곳 (CSS 선택자, 또는 화면 상태에 따라 고르는 함수). 여러 곳에 맞으면 모두 감싸는 한 덩어리로 밝힌다.
   * 없거나 화면에 없으면 가운데에 말풍선만 띄운다
   */
  target?: string | (() => string | undefined);
  /** 말풍선 머리의 짧은 이름 */
  title: string;
  /** 설명 한두 문장 */
  text: ReactNode;
  /** 참이면 이 단계를 건너뛴다 (안내를 시작할 때 본다) */
  skip?: () => boolean;
  /**
   * 직접 해 보는 단계: 밝힌 곳만 누를 수 있고, 이것이 참이 되면 다음 단계로 넘어간다.
   * 밝힌 곳을 눌러 창이 열리면 그동안 안내를 감춘다.
   */
  until?: () => boolean;
  /**
   * 직접 해 보는 단계에서 이것이 참이면 (예: 창을 닫아 버림) 아직 해내지 못한 앞 단계로 돌아간다.
   * 바로 앞 단계부터 거슬러 올라가며, 해낸 단계(until 이 참)를 만나면 그 다음 단계에서 멈춘다.
   */
  back?: () => boolean;
  /** 이 단계로 올 때 (앞으로든 뒤로든) 화면을 맞춘다 — 예: 설명할 화면을 잠깐 띄우기. 돌려준 함수는 단계를 떠날 때 부른다 */
  onEnter?: () => void | (() => void);
}

const KEY = 'mc2_tours';

function loadSeen(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveSeen(seen: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    /* 저장소를 못 쓰면 다음에 또 보일 뿐이다 */
  }
}

interface TourState {
  seen: string[];
  active: { id: string; steps: TourStep[]; onEnd?: () => void } | null;
  start: (id: string, steps: TourStep[], onEnd?: () => void) => void;
  finish: () => void;
  /** 모든 안내를 처음부터 다시 보이게 한다 */
  reset: () => void;
}

export const useTours = create<TourState>((set, get) => ({
  seen: loadSeen(),
  active: null,
  start: (id, steps, onEnd) => {
    const { seen, active } = get();
    const shown = steps.filter((st) => !st.skip?.());
    if (active || seen.includes(id) || !shown.length) return;
    set({ active: { id, steps: shown, onEnd } });
  },
  finish: () => {
    const { active, seen } = get();
    if (!active) return;
    const next = seen.includes(active.id) ? seen : [...seen, active.id];
    saveSeen(next);
    set({ active: null, seen: next });
    active.onEnd?.();
  },
  reset: () => {
    saveSeen([]);
    set({ seen: [] });
  },
}));

/** 안내를 가리는 것들: 창 · 날짜 잠금 · 판서 · 겹친 창 */
const BUSY = '.popup-overlay, .bd, .isub';

/**
 * 처음 한 번 안내를 띄운다.
 * - ready(): 띄워도 되는 때인지. 기본은 '아무 창도 떠 있지 않을 때' (첫 화면 안내용).
 *   카드 창 안의 안내는 () => true 를 넘긴다 — 창이 열린 뒤에 부르므로.
 */
/** onEnd: 안내를 다 보거나 그만둘 때 (단계에서 바꾼 화면을 되돌린다) */
export function useTour(id: string, steps: TourStep[], ready: () => boolean = () => !document.querySelector(BUSY), onEnd?: () => void) {
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;
  const seen = useTours((s) => s.seen.includes(id));
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  useEffect(() => {
    if (seen) return;
    // 창이 열리는 움직임이 끝난 뒤, 화면이 한가해지면 띄운다
    let t = 0;
    const tick = () => {
      const s = useTours.getState();
      if (s.active || s.seen.includes(id)) { t = window.setTimeout(tick, 600); return; }
      if (readyRef.current()) s.start(id, stepsRef.current, () => onEndRef.current?.());
      else t = window.setTimeout(tick, 600);
    };
    t = window.setTimeout(tick, 450);
    return () => clearTimeout(t);
  }, [id, seen]);
  // 안내하던 화면(창)이 닫히면 안내도 거둔다 — 본 것으로 치지 않아 다음에 다시 나온다
  useEffect(() => () => {
    if (useTours.getState().active?.id === id) useTours.setState({ active: null });
  }, [id]);
}

type Box = { top: number; left: number; width: number; height: number };
const PAD = 6;
const GAP = 14;
const EDGE = 16;

/**
 * 선택자에 맞는 요소 하나: 맨 위에 열린 창(바구니 창 뒤에 감춘 창은 빼고) 안의 것을 먼저, 없으면 화면의 첫 것.
 * 같은 카드가 대시보드와 창에 함께 그려져도 지금 보이는 쪽을 고른다.
 */
function pick(sel: string): HTMLElement | null {
  const els = [...document.querySelectorAll<HTMLElement>(sel)].filter((el) => !el.closest('.dock-under'));
  const tops = [...document.querySelectorAll<HTMLElement>('.popup-overlay:not(.dock-under), .video-window')];
  const top = tops[tops.length - 1];
  return (top && els.find((el) => top.contains(el))) ?? els[0] ?? null;
}

/** 밝힐 곳: 쉼표로 여러 곳을 적으면 (각각 하나씩 골라) 모두 감싸는 한 덩어리 */
function rectOf(target?: TourStep['target']): Box | null {
  const sel = typeof target === 'function' ? target() : target;
  if (!sel) return null;
  const rs = sel.split(',').map((part) => pick(part.trim())?.getBoundingClientRect()).filter((r): r is DOMRect => !!r && !!r.width && !!r.height);
  if (!rs.length) return null;
  const top = Math.min(...rs.map((r) => r.top));
  const left = Math.min(...rs.map((r) => r.left));
  const right = Math.max(...rs.map((r) => r.right));
  const bottom = Math.max(...rs.map((r) => r.bottom));
  return { top: top - PAD, left: left - PAD, width: right - left + PAD * 2, height: bottom - top + PAD * 2 };
}

const same = (a: Box | null, b: Box | null) =>
  a === b || (!!a && !!b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height);

/** 앱에 하나만 두는 안내 화면 */
export function TourHost() {
  const active = useTours((s) => s.active);
  if (!active) return null;
  return createPortal(<TourView key={active.id} steps={active.steps} />, document.body);
}

function TourView({ steps }: { steps: TourStep[] }) {
  const finish = useTours((s) => s.finish);
  /** review: '이전'으로 되돌아와 다시 읽는 중 — 직접 해 보는 단계도 설명만 하고 '다음'으로 넘긴다 */
  const [{ i, review }, setCur] = useState({ i: 0, review: false });
  const setI = (n: number, back = false) => setCur({ i: n, review: back && !!steps[n].until });
  const step = steps[i];
  const last = i === steps.length - 1;
  const [box, setBox] = useState<Box | null>(() => rectOf(step.target));
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  /** 직접 해 보는 단계에서 창이 열려 안내를 감춘 동안 */
  const [away, setAway] = useState(false);
  const act = !!step.until && !review;
  const bubble = useRef<HTMLDivElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);

  const go = (d: number) => {
    let n = i + d;
    // 되돌아갈 때는 밝힐 곳이 지금 화면에 없는 '직접 해 보기' 단계(예: 닫힌 달력)를 건너뛴다
    if (d < 0) while (n > 0 && steps[n].until && steps[n].target && !rectOf(steps[n].target)) n--;
    if (n < 0) return;
    if (n >= steps.length) { playSound('save'); finish(); return; }
    playSound('select');
    setI(n, d < 0);
  };
  const goRef = useRef(go);
  goRef.current = go;
  /** 해내지 못한 앞의 '직접 해 보기' 단계로 돌아간다 */
  const backRef = useRef(() => {});
  backRef.current = () => {
    let k = i - 1;
    while (k > 0 && steps[k - 1].until && !steps[k - 1].until!()) k--;
    setI(Math.max(k, 0));
  };

  // 밝힐 곳을 따라간다 (창이 움직이거나 화면 크기가 바뀌어도).
  // 직접 해 보는 단계는 단계를 시작할 때보다 창이 늘면 감추고, 할 일을 마치면 다음으로 넘어간다
  useEffect(() => {
    const sel = typeof step.target === 'function' ? step.target() : step.target;
    if (sel) pick(sel.split(',')[0].trim())?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const busy = () => document.querySelectorAll(BUSY).length;
    const base = busy();
    let raf = 0;
    let prev: Box | null = null;
    let wasAway = false;
    const loop = () => {
      const b = rectOf(step.target);
      if (!same(b, prev)) { prev = b; setBox(b); }
      if (step.until && !review) {
        if (step.until()) { goRef.current(1); return; }
        if (step.back?.()) { backRef.current(); return; }
        const nowAway = busy() > base;
        if (nowAway !== wasAway) { wasAway = nowAway; setAway(nowAway); }
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); setAway(false); };
  }, [step, review]);

  // 말풍선 자리: 밝힌 곳 아래 → 위 → 안쪽 아래, 밝힌 곳이 없으면 가운데
  useLayoutEffect(() => {
    const el = bubble.current;
    if (!el) return;
    const bw = el.offsetWidth;
    const bh = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!box) { setPos({ top: (vh - bh) / 2, left: (vw - bw) / 2 }); return; }
    const left = Math.min(Math.max(box.left + box.width / 2 - bw / 2, EDGE), vw - bw - EDGE);
    let top = box.top + box.height + GAP;
    if (top + bh > vh - EDGE) top = box.top - GAP - bh;
    if (top < EDGE) top = Math.min(box.top + box.height, vh) - bh - GAP * 2; // 밝힌 곳이 화면만큼 크면 그 안쪽 아래에
    setPos({ top: Math.max(top, EDGE), left });
  }, [box, i]);

  useEffect(() => {
    nextBtn.current?.focus({ preventScroll: true });
    return step.onEnter?.() ?? undefined;
  }, [step]);

  const awayRef = useRef(away);
  awayRef.current = away;
  const actRef = useRef(act);
  actRef.current = act;

  // 열쇠: → · Enter 다음, ← 이전, Esc 그만하기. 아래 창(Popup)의 Esc 닫기보다 먼저 받는다
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (awayRef.current) return;  // 감춘 동안의 열쇠는 위에 열린 창이 받는다
      const k = e.key;
      if (k !== 'Escape' && k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      if (k === 'Escape') finish();
      else if (k === 'ArrowLeft') goRef.current(-1);
      else if (!actRef.current) goRef.current(1);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [finish]);

  return (
    <div className={`tour${away ? ' away' : ''}`} role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      {/* 뒤의 화면은 누를 수 없다 — 직접 해 보는 단계만 밝힌 곳을 누를 수 있다 */}
      {act ? (box && <Around box={box} />) : <div className="tour-block" onMouseDown={(e) => e.preventDefault()} />}
      {box ? <div className={`tour-spot${act ? ' act' : ''}`} style={box} /> : <div className="tour-dim" />}
      <div className="tour-bubble" ref={bubble} style={pos ?? { visibility: 'hidden' }}>
        <div className="tour-head">
          <span className="tour-count">{i + 1} / {steps.length}</span>
          <b id="tour-title">{step.title}</b>
          <button type="button" className="tour-quit" onClick={finish}>그만하기</button>
        </div>
        <p id="tour-text">{step.text}</p>
        <div className="tour-foot">
          <div className="tour-dashes" aria-hidden="true">
            {steps.map((_, n) => <i key={n} className={n < i ? 'done' : n === i ? 'now' : undefined} />)}
          </div>
          {i > 0 && <button type="button" className="tour-prev" onClick={() => go(-1)}>이전</button>}
          {act
            ? <span className="tour-wait"><i className="ph-fill ph-hand-tap" /> 눌러 보세요</span>
            : <button type="button" className="tour-next" ref={nextBtn} onClick={() => go(1)}>{last ? '시작하기' : '다음'}</button>}
        </div>
      </div>
    </div>
  );
}

/** 밝힌 곳 둘레만 막는다 (밝힌 곳은 누를 수 있게) */
function Around({ box }: { box: Box }) {
  const stop = (e: MouseEvent) => e.preventDefault();
  const r = box.left + box.width;
  const b = box.top + box.height;
  return (
    <>
      <div className="tour-block" style={{ bottom: 'auto', height: Math.max(box.top, 0) }} onMouseDown={stop} />
      <div className="tour-block" style={{ top: b }} onMouseDown={stop} />
      <div className="tour-block" style={{ top: box.top, height: box.height, right: 'auto', width: Math.max(box.left, 0) }} onMouseDown={stop} />
      <div className="tour-block" style={{ top: box.top, height: box.height, left: r }} onMouseDown={stop} />
    </>
  );
}

/**
 * 끌어 놓기 시범: from 의 첫 요소가 to 쪽으로 손가락과 함께 옮겨 가는 모습을 되풀이한다 (화면만 움직이고 아무것도 바꾸지 않는다).
 * 단계의 onEnter 에서 부르고, 돌려준 함수로 거둔다.
 */
export function dragDemo(from: string, to: string): (() => void) | undefined {
  const src = pick(from);
  const dst = pick(to);
  if (!src || !dst) return undefined;
  const a = src.getBoundingClientRect();
  const b = dst.getBoundingClientRect();
  const ghost = document.createElement('div');
  ghost.className = 'tour-drag-demo';
  const chip = src.cloneNode(true) as HTMLElement;
  chip.style.width = `${a.width}px`;
  ghost.append(chip, Object.assign(document.createElement('span'), { className: 'tour-drag-hand', textContent: '👆' }));
  Object.assign(ghost.style, { left: `${a.left}px`, top: `${a.top}px` });
  document.body.appendChild(ghost);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = ghost.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 0 },
    { transform: 'translate(0,0) scale(1.08)', opacity: 1, offset: 0.15 },
    { transform: `translate(${dx}px,${dy}px) scale(1.08)`, opacity: 1, offset: 0.7 },
    { transform: `translate(${dx}px,${dy}px) scale(1)`, opacity: 0 },
  ], { duration: 2200, iterations: Infinity, easing: 'ease-in-out' });
  return () => { anim.cancel(); ghost.remove(); };
}
