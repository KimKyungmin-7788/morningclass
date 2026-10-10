import type { AbsentReason, AttendanceStatus, ClassRoom, DayRecord, Student } from '@/core/data/types';

// 출결 집계 (화면과 무관한 계산) — 기존 dashAggregate·dashRows 와 같은 기준

export const ABSENT_REASONS: AbsentReason[] = ['질병', '인정', '기타', '미인정'];
export const STATUS_LABEL: Record<AttendanceStatus, string> = { present: '출석', late: '지각', early: '조퇴', absent: '결석' };

const pad = (n: number) => String(n).padStart(2, '0');
export const fmtISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 한국 학년도: 3월~다음 해 2월 */
export const schoolYearOf = (d: Date) => (d.getMonth() + 1 >= 3 ? d.getFullYear() : d.getFullYear() - 1);
export const MONTH_ORDER = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];

/** 학년도와 달(또는 '전체')로 조회 기간을 정한다 */
export function periodOf(sy: number, month: string): { start: string; end: string } {
  if (month === '전체') return { start: `${sy}-03-01`, end: fmtISO(new Date(sy + 1, 2, 0)) };
  const m = Number(month);
  const yr = m >= 3 ? sy : sy + 1;
  return { start: `${yr}-${pad(m)}-01`, end: fmtISO(new Date(yr, m, 0)) };
}

/** 학년도 순서(3,4,…,12,1,2)로 한 달 이동. 처음·마지막을 넘으면 null */
export function stepMonth(month: string, dir: 1 | -1): string | null {
  const i = MONTH_ORDER.indexOf(Number(month)) + dir;
  return i < 0 || i >= MONTH_ORDER.length || month === '전체' ? null : String(MONTH_ORDER[i]);
}

/** 기록이 있는 학년도 목록 (최근 것 먼저). 지금 보는 학년도는 항상 포함 */
export function schoolYearsOf(records: DayRecord[], current: number): number[] {
  const set = new Set<number>([current]);
  for (const r of records) { const y = Number(r.date.slice(0, 4)); set.add(Number(r.date.slice(4, 6)) >= 3 ? y : y - 1); }
  return [...set].sort((a, b) => b - a);
}

export interface DayAtt { date: string; att: DayRecord['attendance'] }
export interface Aggregate {
  /** 출석을 체크한 날 수 (체크하지 않은 날은 수업일에서 뺀다) */
  autoSchoolDays: number;
  days: DayAtt[];
  /** 명단의 학생 + 이 기간에 기록이 있는 보관된 학생 */
  students: Student[];
  per: Record<string, { late: number; early: number; absent: number }>;
}

export function aggregate(cls: ClassRoom | undefined, records: DayRecord[], start: string, end: string): Aggregate {
  const s = start.replace(/-/g, '');
  const e = end.replace(/-/g, '');
  const days = records.filter((r) => r.date >= s && r.date <= e && Object.keys(r.attendance).length > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1)).map((r) => ({ date: r.date, att: r.attendance }));
  const students = (cls?.students ?? []).filter((st) => !st.archived || days.some((d) => d.att[st.id]));
  const per: Aggregate['per'] = {};
  for (const st of students) {
    const c = { late: 0, early: 0, absent: 0 };
    for (const d of days) { const v = d.att[st.id]?.status; if (v === 'late') c.late += 1; else if (v === 'early') c.early += 1; else if (v === 'absent') c.absent += 1; }
    per[st.id] = c;
  }
  return { autoSchoolDays: days.length, days, students, per };
}

export interface Row { no: number; id: string; name: string; archived: boolean; attend: number; late: number; early: number; absent: number; rate: number }

export function rowsOf(agg: Aggregate, schoolDays: number): Row[] {
  return agg.students.map((st, i) => {
    const o = agg.per[st.id];
    const attend = Math.max(0, schoolDays - o.absent);
    return { no: i + 1, id: st.id, name: st.name, archived: !!st.archived, attend, late: o.late, early: o.early, absent: o.absent, rate: schoolDays > 0 ? (attend / schoolDays) * 100 : 0 };
  });
}

export function totalsOf(rows: Row[], schoolDays: number) {
  const sum = (k: 'late' | 'early' | 'absent' | 'attend') => rows.reduce((a, r) => a + r[k], 0);
  const attend = sum('attend');
  return { late: sum('late'), early: sum('early'), absent: sum('absent'), attend, avg: rows.length > 0 && schoolDays > 0 ? (attend / (rows.length * schoolDays)) * 100 : 0 };
}

/** 오늘 출결 카드의 숫자 (조퇴는 출석으로 센다) */
export function todayCounts(students: Student[], att: DayRecord['attendance']) {
  let present = 0; let late = 0; let absent = 0; let unchecked = 0;
  for (const st of students) {
    const v = att[st.id]?.status;
    if (v === 'present' || v === 'early') present += 1; else if (v === 'late') late += 1; else if (v === 'absent') absent += 1; else unchecked += 1;
  }
  return { present, late, absent, unchecked };
}
