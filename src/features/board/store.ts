import { create } from 'zustand';
import * as db from '@/core/storage/db';
import { usePrefs } from '@/core/prefs';
import { toast } from '@/core/ui/toast';
import { getPaper, type PaperId } from './papers';
import { INK_COLORS, MAX_COLUMNS, newStrokeId, commit, emptyHistory, redo, undo, type BoardImage, type DashId, type History, type InkTool, type SizeId, type Snapshot, type Stroke } from './model';
import type { ToolId } from './tools';

// 판서 상태. 창을 닫아도 그린 것이 남도록 화면 밖(저장소)에 둔다.
// 마지막 판서(획 · 붙인 그림 · 옮긴 자리 · 나눈 칸)는 이 기기에 저장해서 다음에 열면 이어서 쓴다. 백업 파일에는 넣지 않는다.
// 용지 · 바탕색 · 도구 영역 펼침 같은 보기 설정은 따로 기억한다(core/prefs).

/** 도구마다 마지막에 고른 색 · 굵기 · 선 모양을 따로 기억한다 */
export interface ToolValues { color: string; size: SizeId; style: DashId }
export type OptionKey = keyof ToolValues;

interface BoardUi {
  /** 왼쪽 도구 영역 펼침 */
  panelOpen: boolean;
  /** 옵션 카드(로고를 누르면 펼쳐짐) */
  optionOpen: boolean;
  /** 배경(용지 · 바탕색) 고르기 */
  bgOpen: boolean;
  /** 학생별 칸 나누기 */
  splitOpen: boolean;
  /** 모두 지우기 확인 창 */
  confirmClear: boolean;
  /** 쓰기 시작하면 옵션 카드를 닫는다 */
  autoClose: boolean;
}

interface BoardState {
  strokes: Stroke[];
  images: BoardImage[];
  history: History<Snapshot>;
  /** 선택 도구로 고른 그림 */
  selected: string | null;
  /** 복사하거나 잘라낸 그림 — 다음에 붙여넣을 자리까지 담고 있다 */
  clip: BoardImage | null;
  /** 칸을 나눠 준 학생(왼쪽부터). 비어 있으면 나누지 않는다 */
  split: string[];
  /** 칸을 나눴을 때 학생마다 고른 펜 색 (없으면 칸 순서의 기본색) */
  splitColors: Record<string, string>;
  /** 저장해 둔 판서를 읽었는가 (읽기 전에는 저장하지 않는다) */
  loaded: boolean;
  tool: ToolId;
  values: Record<InkTool, ToolValues>;
  /** 손 도구로 옮긴 거리. 획의 좌표는 그대로 두고 보는 자리만 옮긴다 */
  viewport: { x: number; y: number };
  paper: PaperId;
  bg: string;
  ui: BoardUi;
  setTool: (t: ToolId) => void;
  setOption: (key: OptionKey, value: string) => void;
  setPaper: (p: PaperId) => void;
  setBg: (c: string) => void;
  panBy: (dx: number, dy: number) => void;
  /** 획 하나를 더한다 */
  add: (s: Stroke) => void;
  /** 지우거나 그림을 옮기기 시작할 때 한 번 부른다 — 지금 상태를 기억해 두어 되돌리기 한 번으로 돌아온다 */
  begin: () => void;
  /** 끄는 동안 화면만 바꾼다 (기록은 begin 이 맡는다) */
  setLive: (patch: Partial<Snapshot>) => void;
  addImage: (img: BoardImage) => void;
  removeImage: (id: string) => void;
  select: (id: string | null) => void;
  /** 고른 그림을 복사한다 (붙여넣으면 조금 옆에 하나 더 생긴다) */
  copyImage: (id: string) => void;
  /** 고른 그림을 잘라낸다 (붙여넣으면 있던 자리에 돌아온다) */
  cutImage: (id: string) => void;
  pasteImage: () => void;
  /** 학생을 칸에 넣거나 뺀다 (최대 4명) */
  toggleSplit: (studentId: string) => void;
  clearSplit: () => void;
  setSplitColor: (studentId: string, color: string) => void;
  /** 저장해 둔 마지막 판서를 읽는다 (처음 한 번) */
  load: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  setUi: (patch: Partial<BoardUi>) => void;
  /** 칠판을 눌렀을 때: 배경 고르기는 닫고, 쓰거나 지우기 시작했으면(자동 닫기가 켜져 있을 때) 옵션 카드도 닫는다 */
  touchCanvas: (writing: boolean) => void;
}

const saved = usePrefs.getState().board;
const toolValues = (size: SizeId): ToolValues => ({ color: INK_COLORS[0].hex, size, style: 'draw' });

const DOC_KEY = 'board';
const IMAGES_KEY = 'boardImages';
interface SavedDoc { strokes: Stroke[]; viewport: { x: number; y: number }; split: string[]; splitColors?: Record<string, string> }
let loading = false;

export const useBoard = create<BoardState>((set, get) => {
  const snap = (): Snapshot => ({ strokes: get().strokes, images: get().images });
  const closed = { optionOpen: false, bgOpen: false, splitOpen: false };
  /** 보기 설정을 이 기기에 기억한다 */
  const keep = () => {
    const s = get();
    usePrefs.getState().set({ board: { paper: s.paper, bg: s.bg, panelOpen: s.ui.panelOpen, autoClose: s.ui.autoClose } });
  };
  return {
    strokes: [],
    images: [],
    history: emptyHistory<Snapshot>(),
    selected: null,
    clip: null,
    split: [],
    splitColors: {},
    loaded: false,
    tool: 'pen',
    values: { pen: toolValues('M'), highlighter: toolValues('M'), eraser: toolValues('L') },
    viewport: { x: 0, y: 0 },
    paper: getPaper(saved.paper as PaperId).id,
    bg: saved.bg,
    ui: { panelOpen: saved.panelOpen, ...closed, confirmClear: false, autoClose: saved.autoClose },
    setTool: (tool) => set((s) => ({ tool, selected: tool === 'select' ? s.selected : null, ui: { ...s.ui, ...closed } })),   // 도구를 바꾸면 열려 있던 카드는 닫는다
    setOption: (key, value) => set((s) => (s.tool in s.values ? { values: { ...s.values, [s.tool]: { ...s.values[s.tool as InkTool], [key]: value } } } : {})),
    setPaper: (paper) => { set({ paper }); keep(); },
    setBg: (bg) => { set({ bg }); keep(); },
    panBy: (dx, dy) => set((s) => ({ viewport: { x: s.viewport.x + dx, y: s.viewport.y + dy } })),
    add: (stroke) => set((s) => ({ history: commit(s.history, snap()), strokes: [...s.strokes, stroke] })),
    begin: () => set((s) => ({ history: commit(s.history, snap()) })),
    setLive: (patch) => set(patch),
    addImage: (img) => set((s) => ({ history: commit(s.history, snap()), images: [...s.images, img], selected: img.id, tool: 'select', ui: { ...s.ui, ...closed } })),   // 바로 옮기거나 크기를 바꿀 수 있게 선택 도구로
    removeImage: (id) => set((s) => ({ history: commit(s.history, snap()), images: s.images.filter((m) => m.id !== id), selected: null })),
    select: (selected) => set({ selected }),
    copyImage: (id) => { const m = get().images.find((it) => it.id === id); if (m) set({ clip: { ...m, x: m.x + 24, y: m.y + 24 } }); },
    cutImage: (id) => { const m = get().images.find((it) => it.id === id); if (m) { set({ clip: m }); get().removeImage(id); } },
    pasteImage: () => {
      const clip = get().clip;
      if (!clip) return;
      get().addImage({ ...clip, id: newStrokeId() });
      set({ clip: { ...clip, x: clip.x + 24, y: clip.y + 24 } });   // 여러 번 붙여도 겹쳐서 가려지지 않게 조금씩 옮긴다
    },
    undo: () => { const r = undo(get().history, snap()); if (r) set({ history: r.history, ...r.current, selected: null }); },
    redo: () => { const r = redo(get().history, snap()); if (r) set({ history: r.history, ...r.current, selected: null }); },
    clear: () => { if (get().strokes.length || get().images.length) set((s) => ({ history: commit(s.history, snap()), strokes: [], images: [], selected: null })); },
    toggleSplit: (id) => set((s) => ({ split: s.split.includes(id) ? s.split.filter((x) => x !== id) : s.split.length < MAX_COLUMNS ? [...s.split, id] : s.split })),
    clearSplit: () => set({ split: [] }),
    setSplitColor: (id, color) => set((s) => ({ splitColors: { ...s.splitColors, [id]: color } })),
    load: async () => {
      if (get().loaded || loading) return;
      loading = true;
      try {
        const [doc, images] = await Promise.all([db.kvGet<SavedDoc>(DOC_KEY), db.kvGet<BoardImage[]>(IMAGES_KEY)]);
        // 읽는 사이에 벌써 쓰기 시작했다면 지금 것을 그대로 둔다
        if (!get().strokes.length && !get().images.length) set({ strokes: doc?.strokes ?? [], viewport: doc?.viewport ?? { x: 0, y: 0 }, split: doc?.split ?? [], splitColors: doc?.splitColors ?? {}, images: images ?? [] });
      } catch {
        /* 저장소를 못 읽으면 빈 칠판으로 시작한다 */
      }
      set({ loaded: true });
    },
    setUi: (patch) => { set((s) => ({ ui: { ...s.ui, ...patch } })); if ('panelOpen' in patch || 'autoClose' in patch) keep(); },
    touchCanvas: (writing) => set((s) => {
      const optionOpen = s.ui.optionOpen && !(writing && s.ui.autoClose);
      return s.ui.bgOpen || s.ui.splitOpen || optionOpen !== s.ui.optionOpen ? { ui: { ...s.ui, bgOpen: false, splitOpen: false, optionOpen } } : {};
    }),
  };
});

// ── 마지막 판서를 이 기기에 저장 ── 바뀌고 잠시 뒤에 한 번 쓴다. 그림은 크기가 커서 그림이 바뀔 때만 따로 쓴다.
let docTimer: ReturnType<typeof setTimeout> | undefined;
let imagesTimer: ReturnType<typeof setTimeout> | undefined;
let warned = false;
const failed = () => { if (!warned) { warned = true; toast('판서를 이 기기에 저장하지 못했어요', 'error'); } };
useBoard.subscribe((s, prev) => {
  if (!s.loaded) return;
  if (!prev.loaded || s.strokes !== prev.strokes || s.viewport !== prev.viewport || s.split !== prev.split || s.splitColors !== prev.splitColors) {
    clearTimeout(docTimer);
    docTimer = setTimeout(() => { const { strokes, viewport, split, splitColors } = useBoard.getState(); db.kvSet(DOC_KEY, { strokes, viewport, split, splitColors } satisfies SavedDoc).catch(failed); }, 500);
  }
  if (prev.loaded && s.images !== prev.images) {
    clearTimeout(imagesTimer);
    imagesTimer = setTimeout(() => { db.kvSet(IMAGES_KEY, useBoard.getState().images).catch(failed); }, 500);
  }
});
