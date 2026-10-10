import { describe, expect, it } from 'vitest';
import { emptyClass } from '@/core/data/types';
import { guessLevel, levelSubjects, subjectBank, subjectIcon, withSubject } from '@/core/data/subjects';
import { periodsOn } from '@/core/data/timetables';
import { isCorrect, isPerfect, move, pad7, trimEnd } from './model';

describe('시간표 맞추기', () => {
  it('카드 옮기기: 보관함 → 칸, 칸 ↔ 칸, 칸 → 보관함', () => {
    let s = pad7(['국어', '수학']);
    s = move(s, '음악', null, 1);
    expect(s.slice(0, 3)).toEqual(['국어', '음악', '']);
    s = move(s, '국어', 0, 1);
    expect(s.slice(0, 3)).toEqual(['음악', '국어', '']);
    s = move(s, '국어', 1, 4);
    expect(s).toEqual(['음악', '', '', '', '국어', '', '']);
    s = move(s, '음악', 0, 'bank');
    expect(trimEnd(s)).toEqual(['', '', '', '', '국어']);
    expect(move(s, '음악', null, 'bank')).toEqual(s);
  });
  it('정답 판정: 정답이 빈 칸은 무엇을 넣어도 맞다', () => {
    const answer = pad7(['국어', '', '수학']);
    expect(isCorrect(pad7(['국어', '체육', '수학']), answer)).toBe(true);
    expect(isCorrect(pad7(['국어', '', '음악']), answer)).toBe(false);
    expect(isPerfect(pad7(['국어', '체육', '수학']), answer)).toBe(false);
    expect(isCorrect(pad7(['국어']), pad7([]))).toBe(false);      // 정답이 없으면 자유 배치
  });
  it('그 날짜의 정답: 주말은 없고 뒤쪽 빈 칸은 뺀다', () => {
    const byDay = { 0: ['국어', '', '수학', '', '', '', ''], 4: [' 체육 '] };
    expect(periodsOn(new Date(2026, 9, 12), byDay)).toEqual(['국어', '', '수학']);   // 월
    expect(periodsOn(new Date(2026, 9, 16), byDay)).toEqual(['체육']);              // 금
    expect(periodsOn(new Date(2026, 9, 13), byDay)).toEqual([]);                    // 화: 입력 없음
    expect(periodsOn(new Date(2026, 9, 10), byDay)).toEqual([]);                    // 토
    expect(periodsOn(new Date(2026, 9, 12), null)).toEqual([]);
  });
});

describe('과목 설정', () => {
  const cls = { ...emptyClass('c1'), schoolName: '강릉중학교' };
  it('학교 이름으로 학교급을 추정한다', () => {
    expect([guessLevel('가나초등학교'), guessLevel('다라고교'), guessLevel('오성학교')]).toEqual(['elem', 'high', null]);
    expect(levelSubjects(cls)).toContain('진로와 직업');
    expect(levelSubjects({ ...cls, level: 'elem' })).toContain('슬기로운 생활');
    expect(levelSubjects(undefined)).toContain('봄');
  });
  it('보관함: 숨긴 과목은 빼고, 추가 과목과 쓰고 있는 이름은 넣는다', () => {
    const c = { ...cls, subjects: { hidden: ['과학'], custom: ['요리실습'], icons: { 요리실습: '🍳' } } };
    const bank = subjectBank(c, ['옛과목', ' 국어 ', '']);
    expect(bank).not.toContain('과학');
    expect(bank.slice(-2)).toEqual(['요리실습', '옛과목']);
    expect(bank.filter((x) => x === '국어')).toHaveLength(1);
    expect([subjectIcon('요리실습', c), subjectIcon('국어', c), subjectIcon('옛과목', c)]).toEqual(['🍳', '📚', '📖']);
  });
  it('과목 추가: 기본 과목이면 숨김만 풀고, 아니면 한 번만 등록한다', () => {
    let c = { ...cls, subjects: { hidden: ['과학'], custom: [] as string[], icons: {} } };
    c = withSubject(c, '과학');
    expect(c.subjects).toMatchObject({ hidden: [], custom: [] });
    c = withSubject(withSubject(c, '한국사'), '한국사');
    expect(c.subjects.custom).toEqual(['한국사']);
  });
});
