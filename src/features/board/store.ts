import { create } from 'zustand';
import { DEFAULT_BG_COLOR, DEFAULT_PAPER, type PaperId } from './papers';
import { INK_COLORS, commit, densify, emptyHistory, redo, undo, type History, type InkTool, type SizeId, type Stroke } from './model';

// 판서 상태. 창을 닫아도 그린 것이 남도록 화면 밖(저장소)에 둔다. 기기에 저장하지는 않으므로 새로 고치면 빈 칠판이 된다.

interface BoardState {
  strokes: Stroke[];
  history: History;
  tool: InkTool;
  color: string;
  /** 도구마다 마지막에 고른 굵기를 기억한다 */
  sizes: Record<InkTool, SizeId>;
  paper: PaperId;
  bg: string;
  setTool: (t: InkTool) => void;
  setColor: (c: string) => void;
  setSize: (s: SizeId) => void;
  setPaper: (p: PaperId) => void;
  setBg: (c: string) => void;
  /** 획 하나를 더한다 */
  add: (s: Stroke) => void;
  /** 지우는 동안에는 화면만 바꾸고(live), 손을 떼면 한 번에 되돌릴 수 있게 기록한다(commitFrom) */
  setLive: (strokes: Stroke[]) => void;
  commitFrom: (before: Stroke[]) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useBoard = create<BoardState>((set, get) => ({
  strokes: [],
  history: emptyHistory(),
  tool: 'pen',
  color: INK_COLORS[0].hex,
  sizes: { pen: 'M', highlighter: 'M', eraser: 'L' },
  paper: DEFAULT_PAPER,
  bg: DEFAULT_BG_COLOR,
  setTool: (tool) => set({ tool }),
  setColor: (color) => set((s) => ({ color, tool: s.tool === 'eraser' ? 'pen' : s.tool })),   // 색을 고르면 다시 쓰는 도구로
  setSize: (size) => set((s) => ({ sizes: { ...s.sizes, [s.tool]: size } })),
  setPaper: (paper) => set({ paper }),
  setBg: (bg) => set({ bg }),
  add: (stroke) => set((s) => ({ history: commit(s.history, s.strokes), strokes: [...s.strokes, { ...stroke, points: densify(stroke.points) }] })),
  setLive: (strokes) => set({ strokes }),
  commitFrom: (before) => { if (before !== get().strokes) set((s) => ({ history: commit(s.history, before) })); },
  undo: () => { const r = undo(get().history, get().strokes); if (r) set(r); },
  redo: () => { const r = redo(get().history, get().strokes); if (r) set(r); },
  clear: () => { if (get().strokes.length) set((s) => ({ history: commit(s.history, s.strokes), strokes: [] })); },
}));
