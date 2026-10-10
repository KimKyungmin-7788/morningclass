import { describe, expect, it } from 'vitest';
import { emptyClass, emptyRecord, type AttendanceStatus, type DayRecord } from '@/core/data/types';
import { aggregate, periodOf, rowsOf, schoolYearOf, schoolYearsOf, stepMonth, todayCounts, totalsOf } from './model';
import { buildXlsx } from './xlsx';

const cls = { ...emptyClass('c1'), students: [{ id: 'a', name: '가람' }, { id: 'b', name: '나래' }, { id: 'z', name: '전학생', archived: true as const }] };
const rec = (date: string, att: Record<string, AttendanceStatus>): DayRecord => ({
  ...emptyRecord('c1', date), attendance: Object.fromEntries(Object.entries(att).map(([k, status]) => [k, { status }])),
});
const records = [
  rec('20261005', { a: 'present', b: 'absent', z: 'late' }),
  rec('20261006', { a: 'late', b: 'absent' }),
  rec('20261007', {}),                                  // 출석을 체크하지 않은 날
  rec('20261008', { a: 'early', b: 'present' }),
  rec('20261102', { a: 'absent' }),
];

describe('출결 집계', () => {
  it('학년도와 조회 기간', () => {
    expect(schoolYearOf(new Date(2026, 1, 28))).toBe(2025);
    expect(schoolYearOf(new Date(2026, 2, 1))).toBe(2026);
    expect(periodOf(2026, '10')).toEqual({ start: '2026-10-01', end: '2026-10-31' });
    expect(periodOf(2026, '2')).toEqual({ start: '2027-02-01', end: '2027-02-28' });
    expect(periodOf(2027, '2')).toEqual({ start: '2028-02-01', end: '2028-02-29' });   // 윤년
    expect(periodOf(2026, '전체')).toEqual({ start: '2026-03-01', end: '2027-02-28' });
    expect(stepMonth('12', 1)).toBe('1');
    expect(stepMonth('3', -1)).toBeNull();
    expect(stepMonth('2', 1)).toBeNull();
    expect(schoolYearsOf([rec('20250301', {}), rec('20260215', {})], 2026)).toEqual([2026, 2025]);
  });

  it('기간 안에서 출석을 체크한 날만 수업일로 센다', () => {
    const agg = aggregate(cls, records, '2026-10-01', '2026-10-31');
    expect(agg.autoSchoolDays).toBe(3);
    expect(agg.days.map((d) => d.date)).toEqual(['20261005', '20261006', '20261008']);
    expect(agg.per.a).toEqual({ late: 1, early: 1, absent: 0 });
    expect(agg.per.b).toEqual({ late: 0, early: 0, absent: 2 });
  });

  it('보관된 학생은 그 기간에 기록이 있을 때만 나온다', () => {
    expect(aggregate(cls, records, '2026-10-01', '2026-10-31').students.map((s) => s.name)).toEqual(['가람', '나래', '전학생']);
    expect(aggregate(cls, records, '2026-11-01', '2026-11-30').students.map((s) => s.name)).toEqual(['가람', '나래']);
  });

  it('출석일수 = 수업일수 − 결석, 출석률과 합계', () => {
    const agg = aggregate(cls, records, '2026-10-01', '2026-10-31');
    const rows = rowsOf(agg, 3);
    expect(rows.map((r) => [r.name, r.attend, Math.round(r.rate)])).toEqual([['가람', 3, 100], ['나래', 1, 33], ['전학생', 3, 100]]);
    expect(totalsOf(rows, 3)).toMatchObject({ late: 2, early: 1, absent: 2, attend: 7 });
    expect(totalsOf(rows, 3).avg).toBeCloseTo(77.78, 1);
    expect(rowsOf(agg, 0)[0].rate).toBe(0);                // 수업일수를 0 으로 고쳐도 나눗셈 오류가 없다
  });

  it('오늘 카드: 조퇴는 출석으로, 체크하지 않은 학생은 미체크로', () => {
    expect(todayCounts(cls.students.slice(0, 2), records[3].attendance)).toEqual({ present: 2, late: 0, absent: 0, unchecked: 0 });
    expect(todayCounts(cls.students.slice(0, 2), records[4].attendance)).toEqual({ present: 0, late: 0, absent: 1, unchecked: 1 });
  });

  it('엑셀 파일을 만든다 (zip 머리표와 시트 내용)', async () => {
    const blob = buildXlsx([{ name: '출결 현황', rows: [[{ v: '제목', s: 4 }], ['이름', 3, null, { v: 1.5, s: 7 }]], widths: [10, 12] }]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('xl/worksheets/sheet1.xml');
    expect(text).toContain('<sheet name="출결 현황"');
    expect(text).toContain('<c r="B2" s="2"><v>3</v></c>'.replace(' s="2"', ''));
  });
});
