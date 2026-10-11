import { createContext, useContext, type CSSProperties } from 'react';

// 대시보드의 칸. 칸이 높이를 정하고, 그 안에 놓인 카드는 칸 크기에 맞춰 모습을 바꾼다.

/** 칸 크기: 아주 작은(영상 줄) · 작은 · 보통 · 큰 */
export type SlotSize = 'tiny' | 'small' | 'medium' | 'large';

export interface SlotInfo {
  size: SlotSize;
  /** 칸이 정하는 높이 (열 안에서의 flex · 최소 높이) */
  style: CSSProperties;
}

/** 카드가 놓인 칸. 대시보드 밖에서 그리면 null. */
export const SlotContext = createContext<SlotInfo | null>(null);
export const useSlot = () => useContext(SlotContext);
