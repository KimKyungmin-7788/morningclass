import { create } from 'zustand';

// 타이머·스톱워치 상태. 창을 닫아도 계속 가야 하므로 화면 밖(저장소)에 둔다. 새로 고치면 처음으로 돌아간다.

const MAX_SEC = 99 * 60;

interface ToolsState {
  /** 타이머(초). endAt 이 있으면 가는 중 */
  timer: { total: number; left: number; endAt: number | null; done: boolean };
  /** 스톱워치(초). startAt 이 있으면 가는 중 */
  sw: { acc: number; startAt: number | null };
  preset: (minutes: number) => void;
  adjust: (deltaSec: number) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  /** 시간이 다 됐으면 끝 상태로 바꾸고 true 를 돌려준다 */
  finishIfDue: () => boolean;
  toggleSw: () => void;
  resetSw: () => void;
}

export const timerLeft = (t: ToolsState['timer'], now = Date.now()) => (t.endAt ? Math.max(0, (t.endAt - now) / 1000) : t.left);
export const swElapsed = (w: ToolsState['sw'], now = Date.now()) => w.acc + (w.startAt ? (now - w.startAt) / 1000 : 0);
/** 초 → "MM:SS" */
export function fmtMS(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export const useTools = create<ToolsState>((set, get) => ({
  timer: { total: 300, left: 300, endAt: null, done: false },
  sw: { acc: 0, startAt: null },

  preset: (minutes) => set({ timer: { total: minutes * 60, left: minutes * 60, endAt: null, done: false } }),
  adjust: (delta) => {
    const t = get().timer;
    const left = Math.min(MAX_SEC, Math.max(0, timerLeft(t) + delta));
    const total = Math.max(left, Math.min(MAX_SEC, t.total + delta), 60);
    set({ timer: t.endAt ? { total, left: t.left, endAt: Date.now() + left * 1000, done: false } : { total, left, endAt: null, done: false } });
  },
  toggleTimer: () => {
    const t = get().timer;
    if (t.endAt) { set({ timer: { ...t, left: timerLeft(t), endAt: null } }); return; }
    const left = t.left <= 0 ? t.total : t.left;
    set({ timer: { ...t, left, endAt: Date.now() + left * 1000, done: false } });
  },
  resetTimer: () => set((s) => ({ timer: { total: s.timer.total, left: s.timer.total, endAt: null, done: false } })),
  finishIfDue: () => {
    const t = get().timer;
    if (!t.endAt || Date.now() < t.endAt) return false;
    set({ timer: { ...t, left: 0, endAt: null, done: true } });
    return true;
  },
  toggleSw: () => {
    const w = get().sw;
    set({ sw: w.startAt ? { acc: swElapsed(w), startAt: null } : { acc: w.acc, startAt: Date.now() } });
  },
  resetSw: () => set({ sw: { acc: 0, startAt: null } }),
}));
