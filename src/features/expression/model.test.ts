import { describe, expect, it } from 'vitest';
import { EXPR_TOPICS, type ExprTopic } from './data';
import { correctFirst, doneList, emptyExprBook, normalizeExprBook, pickExpr, sceneImages, setLevel, toggleDone, weekNumber, weekdayIndex } from './model';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('생활표현 고르기', () => {
  it('월~금은 차례로 0~4, 토 · 일은 금요일 상황', () => {
    expect([12, 13, 14, 15, 16, 17, 18].map((day) => weekdayIndex(d(2026, 10, day)))).toEqual([0, 1, 2, 3, 4, 4, 4]);
  });

  it('같은 주는 같은 번호, 다음 월요일은 다음 주', () => {
    expect(weekNumber(d(2026, 10, 12))).toBe(weekNumber(d(2026, 10, 18)));
    expect(weekNumber(d(2026, 10, 19))).toBe(weekNumber(d(2026, 10, 12)) + 1);
  });

  it('주마다 주제를 돌리고, 요일마다 상황이 바뀐다', () => {
    const topics: ExprTopic[] = [EXPR_TOPICS[0], { ...EXPR_TOPICS[0], name: '둘째' }];
    expect(pickExpr(d(2026, 10, 12), topics).topic.name).not.toBe(pickExpr(d(2026, 10, 19), topics).topic.name);
    expect(pickExpr(d(2026, 10, 14)).situation.title).not.toBe(pickExpr(d(2026, 10, 15)).situation.title);
  });

  it('2026-10-12 주는 첫 주제, 다음 주는 둘째 주제, 다 돌면 처음으로', () => {
    expect(pickExpr(d(2026, 10, 14)).topic.id).toBe(EXPR_TOPICS[0].id);
    expect(pickExpr(d(2026, 10, 19)).topic.id).toBe(EXPR_TOPICS[1].id);
    expect(pickExpr(d(2026, 10, 12 + 7 * EXPR_TOPICS.length)).topic.id).toBe(EXPR_TOPICS[0].id);
  });

  it('주제마다 상황이 다섯 개(월~금), 이어서 할 말까지 있다', () => {
    for (const t of EXPR_TOPICS) {
      expect(t.days, t.name).toHaveLength(5);
      for (const s of t.days) { expect(s.next.when).not.toBe(''); expect(s.next.say).not.toBe(''); expect(s.wrong.text).not.toBe(s.card); }
    }
  });

  it('상황마다 세 수준의 말이 모두 있다', () => {
    for (const t of EXPR_TOPICS) for (const s of t.days) for (const k of ['sentence', 'word', 'card'] as const) expect(s[k]).not.toBe('');
  });
});

describe('학생별 수준 · 그림 카드 고르기', () => {
  it('정하기 · 빼기, 모르는 값은 버린다', () => {
    const b = setLevel(emptyExprBook(), 'a', 'word');
    expect(b.levels).toEqual({ a: 'word' });
    expect(setLevel(b, 'a', undefined).levels).toEqual({});
    expect(normalizeExprBook({ levels: { a: 'card', b: 'x' } }).levels).toEqual({ a: 'card' });
  });
  it('맞는 카드 자리는 날마다 바뀐다', () => {
    expect(correctFirst(d(2026, 10, 14), 2)).not.toBe(correctFirst(d(2026, 10, 15), 2));
  });
});

describe('상황 그림 · 완료 표시', () => {
  it('그림은 webp 다음 png', () => {
    expect(sceneImages('help-1-bottle')).toEqual(['/img/expression/help-1-bottle.webp', '/img/expression/help-1-bottle.png']);
  });
  it('상황 id 는 겹치지 않는다', () => {
    const ids = EXPR_TOPICS.flatMap((t) => t.days.map((s) => s.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('완료 켜고 끄기', () => {
    expect(toggleDone(undefined, 'a')).toEqual(['a']);
    expect(toggleDone(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleDone(true, 'a')).toEqual(['a']);   // 예전 판이 남긴 값
    expect(doneList(true)).toEqual([]);
  });
});
