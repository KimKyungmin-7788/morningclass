import type { AttInclude, AttendanceStatus, ClassRoom, DayRecord, Student } from './types';

// 지각·조퇴·결석 학생을 감정·뽑기에 포함할지 (학급별 설정, 기본: 조퇴만 포함)

export type InclKind = 'emo' | 'help';

export const ATT_INCLUDE_DEFAULT: AttInclude = {
  emoLate: false, emoEarly: true, emoAbsent: false,
  helpLate: false, helpEarly: true, helpAbsent: false,
};

export const attIncludeOf = (cls: ClassRoom | undefined): AttInclude => ({ ...ATT_INCLUDE_DEFAULT, ...cls?.options.attInclude });

export function isIncluded(status: AttendanceStatus | undefined, kind: InclKind, inc: AttInclude): boolean {
  if (status === 'late') return inc[`${kind}Late`];
  if (status === 'early') return inc[`${kind}Early`];
  if (status === 'absent') return inc[`${kind}Absent`];
  return true; // 출석했거나 아직 체크하지 않은 학생
}

/** 감정·뽑기에 참여하는 학생 (명단의 학생 중에서) */
export function eligibleStudents(cls: ClassRoom | undefined, rec: DayRecord, kind: InclKind): Student[] {
  const inc = attIncludeOf(cls);
  return (cls?.students ?? []).filter((s) => !s.archived && isIncluded(rec.attendance[s.id]?.status, kind, inc));
}
