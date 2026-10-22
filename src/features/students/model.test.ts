import { describe, expect, it } from 'vitest';
import { emptyClass, emptyRecord, type Iep, type StudentNote } from '@/core/data/types';
import { currentMonthlyGoals, doneToday, filterNotes, monthsOfSemester, notesForGoal, semesterOf, studentSummary, supportTrend } from './model';
const note = (id: string, at: string, rest: Partial<StudentNote> = {}): StudentNote => ({ id, at, updatedAt: at, classId: 'c', studentId: 's', text: '관찰', ...rest });
describe('학생 카드 계산', () => {
  it('2월은 전 해 2학기이고 3월과 9월에 학기가 바뀐다', () => {
    expect(semesterOf(new Date(2027, 1, 28))).toBe('2026-2');
    expect(semesterOf(new Date(2027, 2, 1))).toBe('2027-1');
    expect(semesterOf(new Date(2027, 8, 1))).toBe('2027-2');
    expect(monthsOfSemester('2026-1')).toEqual([3,4,5,6,7,8]);
    expect(monthsOfSemester('2026-2')).toEqual([9,10,11,12,1,2]);
    expect(monthsOfSemester('x')).toEqual([]);
  });
  it('같은 학기에 속하고 이번 달을 체크한 목표만 고른다', () => {
    const iep: Iep = { id: 'i', classId: 'c', studentId: 's', semester: '2026-2', subjects: [{ id: 'subject', name: '국어', goals: [{ id: 'g', text: '읽기', monthly: [{ id: 'm', text: '낱말', months: [10,1] }] }] }] };
    expect(currentMonthlyGoals(iep, new Date(2027,0,1)).map((g) => g.id)).toEqual(['m']);
    expect(currentMonthlyGoals(iep, new Date(2027,9,1))).toEqual([]);
    expect(currentMonthlyGoals(iep, new Date(2026,10,1))).toEqual([]);
  });
  it('다른 학생·학급·기간의 자료는 합치지 않고 역할은 하루에 한 번 센다', () => {
    const r = emptyRecord('c','20261022'); r.attendance.s = { status: 'late' }; r.attendance.other = { status: 'present' };
    r.emotions.s = { items: [{ k: 'joy', x: 0, y: 0, zone: '' }, { k: 'excited', x: 1, y: 1, zone: '' }] };
    r.roleDone = { a: ['s'], b: ['s'] }; r.praise = [{ id: 'p', s: 's', r: '도왔어요', at: '2026-10-22' }, { id: 'x', s: 'other', r: '다른 학생', at: '2026-10-22' }];
    const summary = studentSummary([r, { ...r, classId: 'other' }, { ...r, date: '20261021' }], emptyClass('c'), 's', { from: '20261022', to: '20261022' });
    expect(summary.emotions.joy).toBe(1); expect(summary.emotions.excited).toBe(1);
    expect(summary.attendance).toEqual({ present: 0, late: 1, early: 0, absent: 0 }); expect(summary.roleDays).toBe(1); expect(summary.praise.map((p) => p.id)).toEqual(['p']);
  });
  it('출석과 감정을 모두 골라야 완료된다', () => {
    const r = emptyRecord('c','20261022'); expect(doneToday(r,'s')).toBe(false);
    r.attendance.s = { status: 'present' }; expect(doneToday(r,'s')).toBe(false);
    r.emotions.s = { items: [{ k: 'joy', x: 0, y: 0, zone: '' }] }; expect(doneToday(r,'s')).toBe(true);
  });
  it('복합 필터와 목표별 도움 수준은 원래 목록을 바꾸지 않는다', () => {
    const a = note('a','2026-10-01T00:00:00Z',{ goalId: 'g', support: 'physical', category: 'study', share: true });
    const b = note('b','2026-10-02T00:00:00Z',{ goalId: 'g', support: 'independent', category: 'study' });
    const c = note('c','2026-10-03T00:00:00Z',{ goalId: 'other' });
    const rows = [c,b,a];
    expect(notesForGoal(rows,'g').map((n) => n.id)).toEqual(['a','b']);
    expect(supportTrend(rows,'g').map((n) => n.support)).toEqual(['physical','independent']);
    expect(filterNotes(rows,{ category: 'study', share: true, from: a.at, to: b.at }).map((n) => n.id)).toEqual(['a']);
    expect(rows.map((n) => n.id)).toEqual(['c','b','a']);
  });
});
