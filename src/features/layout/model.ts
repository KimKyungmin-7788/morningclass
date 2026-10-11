import type { SlotSize } from '@/core/ui/slot';

// 대시보드 배치: 칸(자리·크기)은 고정이고, 어느 카드가 어느 칸에 들어가는지만 바뀐다.
// 배치표는 학급 설정(options.layout)에 저장한다.

export interface SlotDef {
  /** 칸 이름: 열(a~d) + 위에서부터의 순서 */
  id: string;
  col: 0 | 1 | 2 | 3;
  size: SlotSize;
  /** 열 안에서 차지하는 높이 (어느 카드가 들어와도 같다) */
  flex: number | string;
  minHeight?: number;
}

/** 칸 구성 (열마다 위에서 아래로) */
export const SLOTS: SlotDef[] = [
  { id: 'a1', col: 0, size: 'medium', flex: 1 },
  { id: 'a2', col: 0, size: 'medium', flex: 1 },
  { id: 'a3', col: 0, size: 'medium', flex: 1 },
  { id: 'b1', col: 1, size: 'large', flex: 1 },
  { id: 'b2', col: 1, size: 'small', flex: '0 0 170px' },
  { id: 'c1', col: 2, size: 'large', flex: 1 },
  { id: 'c2', col: 2, size: 'small', flex: '0 0 170px' },
  { id: 'd1', col: 3, size: 'medium', flex: 1.1, minHeight: 110 },
  { id: 'd2', col: 3, size: 'medium', flex: 1.1, minHeight: 110 },
  { id: 'd3', col: 3, size: 'small', flex: '0 0 var(--slot-strip-h)' },
  { id: 'd4', col: 3, size: 'tiny', flex: '0 0 90px', minHeight: 90 },
];

/** 배치표: 칸 이름 → 카드 이름 (null = 빈 칸) */
export type Layout = Record<string, string | null>;

/** 저장된 배치표가 없을 때의 배치 */
export const DEFAULT_LAYOUT: Layout = {
  a1: 'weather', a2: 'word', a3: 'attendance',
  b1: 'timetable', b2: 'dday',
  c1: 'emotions', c2: 'helper',
  d1: 'meal', d2: 'notes', d3: 'tools', d4: 'book',
};

export interface Placement {
  /** 모든 칸의 내용 (빈 칸은 null) */
  slots: Layout;
  /** 어느 칸에도 놓이지 않은 카드 (보관함) */
  drawer: string[];
}

/**
 * 저장된 배치표를 지금의 칸·카드에 맞춰 읽는다.
 * - 저장된 것이 없으면 기본 배치
 * - 없어진 카드, 같은 카드가 두 번 나온 자리는 빈 칸
 * - 배치표에 없는 카드(새로 생긴 카드 포함)는 보관함
 */
export function resolveLayout(saved: unknown, cardIds: string[]): Placement {
  const table = saved && typeof saved === 'object' && !Array.isArray(saved) ? (saved as Record<string, unknown>) : DEFAULT_LAYOUT;
  const known = new Set(cardIds);
  const placed = new Set<string>();
  const slots: Layout = {};
  for (const { id } of SLOTS) {
    const card = table[id];
    if (typeof card === 'string' && known.has(card) && !placed.has(card)) {
      slots[id] = card;
      placed.add(card);
    } else {
      slots[id] = null;
    }
  }
  return { slots, drawer: cardIds.filter((c) => !placed.has(c)) };
}

/** 위에서부터 첫 빈 칸 (없으면 null) */
export function firstEmptySlot(layout: Layout): string | null {
  return SLOTS.find((s) => layout[s.id] === null)?.id ?? null;
}

/** 기본 배치 그대로인지 */
export function isDefaultLayout(layout: Layout): boolean {
  return SLOTS.every((s) => layout[s.id] === (DEFAULT_LAYOUT[s.id] ?? null));
}

const isSlot = (layout: Layout, id: string) => Object.prototype.hasOwnProperty.call(layout, id);

/** 두 칸의 내용을 맞바꾼다 (한쪽이 빈 칸이면 옮기기) */
export function swapSlots(layout: Layout, a: string, b: string): Layout {
  if (a === b || !isSlot(layout, a) || !isSlot(layout, b)) return layout;
  return { ...layout, [a]: layout[b], [b]: layout[a] };
}

/** 칸을 비운다 (카드는 보관함으로) */
export function clearSlot(layout: Layout, slot: string): Layout {
  if (!isSlot(layout, slot) || layout[slot] === null) return layout;
  return { ...layout, [slot]: null };
}

/**
 * 카드를 칸에 넣는다.
 * 그 카드가 다른 칸에 있었으면 두 칸을 맞바꾸고, 보관함에서 왔으면 원래 있던 카드가 보관함으로 간다.
 */
export function placeCard(layout: Layout, slot: string, card: string): Layout {
  if (!isSlot(layout, slot)) return layout;
  const from = Object.keys(layout).find((id) => layout[id] === card);
  if (from) return swapSlots(layout, from, slot);
  return { ...layout, [slot]: card };
}
