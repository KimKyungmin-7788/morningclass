import { useMemo } from 'react';
import { create } from 'zustand';
import { useCurrentClass, useData } from '@/core/data/store';
import { CARD_IDS } from '@/features/registry';
import { resolveLayout, type Layout, type Placement } from './model';

// 화면 꾸미기(수정 모드) 상태와 배치표 저장. 배치표는 학급 설정에 들어가므로 백업에 함께 담긴다.

interface EditState {
  editing: boolean;
  setEditing: (on: boolean) => void;
}

export const useLayoutEdit = create<EditState>((set) => ({
  editing: false,
  setEditing: (editing) => set({ editing }),
}));

/** 지금 학급의 배치 (칸마다 놓인 카드 · 보관함) */
export function usePlacement(): Placement {
  const saved = useCurrentClass()?.options.layout;
  return useMemo(() => resolveLayout(saved, CARD_IDS), [saved]);
}

/** 지금 학급의 배치를 방금 저장된 값으로 읽는다 (끌기처럼 화면 밖에서 불릴 때) */
export function currentPlacement(): Placement {
  const { classes, currentClassId } = useData.getState();
  return resolveLayout(classes.find((c) => c.id === currentClassId)?.options.layout, CARD_IDS);
}

/** 배치표를 지금 학급에 저장한다. null 이면 저장된 배치를 지워 기본 배치로 돌아간다. */
export function saveLayout(next: Layout | null): void {
  const { classes, currentClassId, saveClass } = useData.getState();
  const cls = classes.find((c) => c.id === currentClassId);
  if (!cls) return;
  const { layout: _old, ...rest } = cls.options;
  void saveClass({ ...cls, options: next ? { ...rest, layout: next } : rest });
}
