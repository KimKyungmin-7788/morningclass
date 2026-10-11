import { useMemo } from 'react';
import { useDay } from '@/core/data/day';
import { useCurrentClass } from '@/core/data/store';
import type { Student } from '@/core/data/types';
import { columnInk, presentStudents } from './model';
import { useBoard } from './store';

// 학생별 칸 나누기는 오늘 출석부와 이어져 있다: 고를 수 있는 학생 = 오늘 결석이 아닌 학생.
// 칸을 준 뒤에 결석으로 바뀌거나 명단에서 빠진 학생의 칸은 화면에서 사라진다.

/** 칸 하나: 학생과 그 학생의 펜 색 */
export interface Column extends Student { ink: string }

export function useColumns(): { present: Student[]; columns: Column[] } {
  const cls = useCurrentClass();
  const attendance = useDay((s) => s.record.attendance);
  const split = useBoard((s) => s.split);
  const colors = useBoard((s) => s.splitColors);
  return useMemo(() => {
    const present = presentStudents(cls?.students ?? [], attendance);
    const columns = split.map((id) => present.find((s) => s.id === id)).filter((s): s is Student => !!s).map((s, i) => ({ ...s, ink: columnInk(colors, s.id, i) }));
    return { present, columns };
  }, [cls, attendance, split, colors]);
}
