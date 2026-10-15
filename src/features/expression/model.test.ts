import { describe, expect, it } from 'vitest';
import { EXPR_TOPICS } from './data';
import { EXPR_IDS, correctFirst, doneList, drawToday, emptyExprBook, normalizeExprBook, recentPicks, sayImages, sceneImages, setLevel, toggleDone } from './model';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('생활표현 자료', () => {
  it('상황은 100개이고 id 가 겹치지 않는다', () => {
    expect(EXPR_IDS).toHaveLength(100);
    expect(new Set(EXPR_IDS).size).toBe(100);
  });

  it('상황마다 세 수준의 말과 이어서 할 말이 있고, 낱말은 문장 안에 있다', () => {
    for (const t of EXPR_TOPICS) {
      for (const s of t.items) {
        for (const k of ['sentence', 'word', 'card'] as const) expect(s[k], s.id).not.toBe('');
        expect(s.next.when).not.toBe(''); expect(s.next.say).not.toBe(''); expect(s.wrong.text, s.id).not.toBe(s.card);
        expect(s.sentence.replace(/[.,!? ]/g, ''), `${s.id} 낱말은 문장 안에 있어야 해요`).toContain(s.word.replace(/[.,!? ]/g, ''));
      }
    }
  });
});

describe('날마다 무작위로 뽑기 (한 바퀴 다 돌기 전에는 다시 안 나옴)', () => {
  const empty = () => normalizeExprBook(undefined).bag;
  it('같은 날은 다시 뽑아도 같은 상황', () => {
    const a = drawToday(empty(), '2026-10-15');
    expect(drawToday(a.bag, '2026-10-15', EXPR_IDS, () => 0.99).id).toBe(a.id);
  });
  it('100일 동안 100개가 한 번씩 모두 나온다', () => {
    let bag = empty();
    const seen: string[] = [];
    for (let d = 0; d < 100; d += 1) { const r = drawToday(bag, `day-${d}`); bag = r.bag; seen.push(r.id); }
    expect(new Set(seen).size).toBe(100);
  });
  it('한 바퀴가 끝나면 새 바퀴를 시작하고, 바로 전날 것은 피한다', () => {
    const ids = ['a', 'b', 'c'];
    let bag = empty();
    const seen: string[] = [];
    for (let d = 0; d < 3; d += 1) { const r = drawToday(bag, `d${d}`, ids, () => 0); bag = r.bag; seen.push(r.id); }
    expect(seen.sort()).toEqual(['a', 'b', 'c']);
    const next = drawToday(bag, 'd3', ids, () => 0.999);
    expect(next.id).not.toBe(bag.used[bag.used.length - 1]);
    expect(next.bag.used).toEqual([next.id]);
  });
  it('자료에서 없어진 상황은 건너뛴다', () => {
    const r = drawToday({ used: ['x', 'a'], days: { old: 'x' } }, 'd', ['a', 'b'], () => 0);
    expect(r.id).toBe('b');
  });
  it('최근에 나온 상황을 날짜 순서로 (최근 것부터)', () => {
    const [a, b, c] = EXPR_IDS;
    const list = recentPicks({ used: [], days: { '2026-10-2': b, '2026-9-30': a, '2026-10-14': c } }, 2);
    expect(list.map((p) => p.situation.id)).toEqual([c, b]);
  });
  it('학생 수준을 바꿔도 뽑기 기록은 남는다', () => {
    const book = { levels: {}, bag: { used: ['a'], days: { d: 'a' } } };
    expect(setLevel(book, 's1', 'word').bag).toEqual(book.bag);
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
    expect(correctFirst(d(2026, 10, 14), 'help-3-shelf')).not.toBe(correctFirst(d(2026, 10, 15), 'help-3-shelf'));
  });
});

describe('상황 그림 · 완료 표시', () => {
  it('그림은 webp 다음 png', () => {
    expect(sceneImages('help-1-bottle')).toEqual(['/img/expression/help-1-bottle.webp', '/img/expression/help-1-bottle.png']);
  });
  it('말하기 그림은 -say 를 먼저, 없으면 상황 그림', () => {
    expect(sayImages('help-1-bottle')).toEqual([
      '/img/expression/help-1-bottle-say.webp', '/img/expression/help-1-bottle-say.png',
      '/img/expression/help-1-bottle.webp', '/img/expression/help-1-bottle.png',
    ]);
  });
  it('완료 켜고 끄기', () => {
    expect(toggleDone(undefined, 'a')).toEqual(['a']);
    expect(toggleDone(['a', 'b'], 'a')).toEqual(['b']);
    expect(toggleDone(true, 'a')).toEqual(['a']);   // 예전 판이 남긴 값
    expect(doneList(true)).toEqual([]);
  });
});
