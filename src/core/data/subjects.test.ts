import { describe, expect, it } from 'vitest';
import { hiddenSubjects, moveSubject, subjectBank, withSubject, withoutSubject } from './subjects';
import { emptyClass } from './types';

const base = { ...emptyClass('c1'), level: 'middle' as const };

describe('교과 보관함', () => {
  it('순서를 정하지 않았으면 기본 순서 + 추가 과목', () => {
    const cls = withSubject(base, '한국사');
    expect(subjectBank(cls).slice(0, 3)).toEqual(['국어', '사회', '수학']);
    expect(subjectBank(cls).at(-1)).toBe('한국사');
  });
  it('정해 둔 순서대로 나오고, 순서에 없는 과목은 뒤에 붙는다', () => {
    const cls = { ...base, subjects: { ...base.subjects, order: ['체육', '국어'] } };
    const bank = subjectBank(cls);
    expect(bank.slice(0, 2)).toEqual(['체육', '국어']);
    expect(bank).toHaveLength(subjectBank(base).length);
    expect(bank.slice(2, 4)).toEqual(['사회', '수학']);
  });
  it('기본 과목을 빼면 숨겨지고 다시 넣을 수 있다', () => {
    const cut = withoutSubject(base, '과학');
    expect(subjectBank(cut)).not.toContain('과학');
    expect(hiddenSubjects(cut)).toEqual(['과학']);
    expect(subjectBank(withSubject(cut, '과학'))).toContain('과학');
  });
  it('추가한 과목을 빼면 지워진다', () => {
    const cut = withoutSubject(withSubject(base, '한국사'), '한국사');
    expect(cut.subjects.custom).toEqual([]);
    expect(hiddenSubjects(cut)).toEqual([]);
  });
  it('오늘 시간표에 들어 있는 과목은 빼도 보관함에 남는다', () => {
    expect(subjectBank(withoutSubject(base, '과학'), ['과학'])).toContain('과학');
  });
  it('자리 옮기기: 다른 과목 앞으로, 또는 맨 뒤로', () => {
    expect(moveSubject(['가', '나', '다', '라'], '라', '나')).toEqual(['가', '라', '나', '다']);
    expect(moveSubject(['가', '나', '다', '라'], '가', '라')).toEqual(['나', '다', '가', '라']);
    expect(moveSubject(['가', '나', '다'], '가', null)).toEqual(['나', '다', '가']);
    const same = ['가', '나'];
    expect(moveSubject(same, '가', '가')).toBe(same);
    expect(moveSubject(same, '없음', '가')).toBe(same);
  });
});
