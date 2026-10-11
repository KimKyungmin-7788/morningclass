import { describe, expect, it } from 'vitest';
import { buildWordSheetHTML, letterGrid, lettersOf, otherWords, sentenceLines } from './wordSheet';

const entry = { word: '학교', meaning: '공부하러 가는 곳', sentence: '아침에 학교에 가요.' };
const week = [entry, { word: '친구', meaning: '가깝게 지내는 사람', sentence: '친구와 같이 놀아요.' }, { word: '인사', meaning: '만날 때 하는 말', sentence: '' }];
const base = { entry, week, date: new Date(2026, 9, 12), size: 15, dot: true };

describe('오늘의 낱말 학습지', () => {
  it('글자 찾기 판에는 낱말의 글자가 두 번씩 들어 있고, 같은 낱말이면 늘 같은 판이 나온다', () => {
    const grid = letterGrid('학교');
    expect(grid).toHaveLength(24);
    expect(grid.filter((c) => c === '학')).toHaveLength(2);
    expect(grid.filter((c) => c === '교')).toHaveLength(2);
    expect(letterGrid('학교')).toEqual(grid);
    expect(letterGrid('친구')).not.toEqual(grid);
  });
  it('같은 글자가 겹치는 낱말도 그 글자는 두 번만 넣는다', () => {
    expect(letterGrid('바나나').filter((c) => c === '나')).toHaveLength(2);
    expect(lettersOf('우리 반')).toEqual(['우', '리', '반']);
  });
  it('고르기 · 잇기에는 이번 주의 다른 낱말을 먼저 쓰고, 모자라면 예비 낱말로 채운다', () => {
    expect(otherWords(entry, week, 2).map((w) => w.word)).toEqual(['친구', '인사']);
    expect(otherWords(entry, [entry], 3)).toHaveLength(3);
    expect(otherWords(entry, [entry], 3).map((w) => w.word)).not.toContain('학교');
  });
  it('문장은 띄어쓰기에서만 줄을 바꾼다', () => {
    expect(sentenceLines('아침에 학교에 가요.', 13)).toEqual(['아침에 학교에 가요.']);
    expect(sentenceLines('비밀번호는 다른 사람에게 알려 주지 않아요.', 9)).toEqual(['비밀번호는 다른', '사람에게 알려', '주지 않아요.']);
  });
  it('고른 쪽만큼 쪽이 만들어지고, 아무것도 고르지 않으면 안내 한 쪽', () => {
    const count = (sel: Record<string, boolean>) => (buildWordSheetHTML({ ...base, sel }).match(/<section class="page">/g) ?? []).length;
    expect(count({ trace: true })).toBe(1);
    expect(count({ trace: true, play: true, mine: true, cards: true, week: true })).toBe(5);
    expect(count({})).toBe(1);
    expect(buildWordSheetHTML({ ...base, sel: {} })).toContain('하나 이상 골라');
  });
  it('문장 빈칸 문제는 문장에 낱말이 그대로 들어 있을 때만 낸다', () => {
    expect(buildWordSheetHTML({ ...base, sel: { play: true } })).toContain('빈칸에 알맞은 낱말');
    expect(buildWordSheetHTML({ ...base, entry: { ...entry, sentence: '공부하러 가요.' }, sel: { play: true } })).not.toContain('빈칸에 알맞은 낱말');
  });
  it('낱말에 든 기호는 글자 그대로 찍는다', () => {
    expect(buildWordSheetHTML({ ...base, entry: { word: '<b>', meaning: 'a & b', sentence: '' }, sel: { trace: true } })).toContain('&lt;b&gt;');
  });
});
