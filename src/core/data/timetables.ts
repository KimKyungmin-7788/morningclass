import { useCallback, useEffect, useState } from 'react';
import * as db from '@/core/storage/db';
import { toast } from '@/core/ui/toast';
import type { ClassId } from './types';

// 요일별 시간표(선생님이 설정에서 넣는 정답). 0=월 … 4=금

export const MAX_PERIODS = 7;
type ByDay = Record<number, string[]>;

const cache = new Map<ClassId, ByDay>();
const listeners = new Set<() => void>();
export function resetTimetableCache(): void { cache.clear(); listeners.forEach((fn) => fn()); }

export function useTimetables(classId: ClassId): { byDay: ByDay | null; save: (day: number, periods: string[]) => void } {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    if (classId && !cache.has(classId)) {
      void db.getTimetablesOf(classId).then((list) => { cache.set(classId, Object.fromEntries(list.map((t) => [t.day, t.periods]))); listeners.forEach((f) => f()); });
    }
    return () => { listeners.delete(fn); };
  }, [classId]);
  const save = useCallback((day: number, periods: string[]) => {
    cache.set(classId, { ...cache.get(classId), [day]: periods });
    listeners.forEach((f) => f());
    db.putTimetable({ classId, day, periods }).catch(() => toast('시간표를 저장하지 못했어요', 'error'));
  }, [classId]);
  return { byDay: cache.get(classId) ?? null, save };
}

/** 그 날짜의 정답 시간표 (주말은 없음). 뒤쪽 빈 칸은 뺀다 — 교과를 넣은 시간만큼만 */
export function periodsOn(date: Date, byDay: ByDay | null): string[] {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return [];
  const arr = (byDay?.[dow - 1] ?? []).map((s) => (s ?? '').trim());
  while (arr.length && !arr[arr.length - 1]) arr.pop();
  return arr;
}
