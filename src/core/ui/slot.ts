import { createContext, useContext } from 'react';

// 대시보드의 칸. 칸이 높이를 정하고, 그 안에 놓인 카드는 칸 크기에 맞춰 모습을 바꾼다.

/** 칸 크기: 아주 작은(영상 줄) · 작은 · 보통 · 큰 */
export type SlotSize = 'tiny' | 'small' | 'medium' | 'large';

/** 카드가 놓인 칸의 크기. 대시보드 밖에서 그리면 null. */
export const SlotContext = createContext<SlotSize | null>(null);
export const useSlotSize = () => useContext(SlotContext);

/** 작은 칸(아주 작은 · 작은)에서는 카드가 제목과 상태 한 줄만 보여 준다 */
export const isCompact = (size: SlotSize) => size === 'tiny' || size === 'small';
