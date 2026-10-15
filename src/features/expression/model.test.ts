import { describe, expect, it } from 'vitest';
import { EXPR_TOPICS } from './data';
import { dateKeyOf } from '@/core/data/day';
import { EXPR_IDS, correctFirst, dayId, prunePlan, settleDay, weekDays, doneList, drawToday, emptyExprBook, normalizeExprBook, recentPicks, sayImages, sceneImages, setLevel, toggleDone } from './model';

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
    const a = drawToday(empty(), '20261015');
    expect(drawToday(a.bag, '20261015', EXPR_IDS, () => 0.99).id).toBe(a.id);
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
    const list = recentPicks({ used: [], days: { '20261002': b, '20260930': a, '20261014': c } }, 2);
    expect(list.map((p) => p.situation.id)).toEqual([c, b]);
  });
  it('학생 수준을 바꿔도 뽑기 기록은 남는다', () => {
    const book = { levels: {}, bag: { used: ['a'], days: { d: 'a' } }, plan: {} };
    expect(setLevel(book, 's1', 'word').bag).toEqual(book.bag);
  });
});

describe('선생님이 정한 일주일', () => {
  const [a, b, c] = EXPR_IDS;
  const book = (plan: Record<string, string>, days: Record<string, string> = {}) => ({ levels: {}, bag: { used: Object.values(days), days }, plan });
  it('정해 둔 날은 그 상황, 이미 무작위로 뽑힌 날이어도 정한 것으로 바뀐다', () => {
    expect(dayId(book({ '20261019': a }), '20261019')).toBe(a);
    const next = settleDay(book({ '20261019': a }, { '20261019': b }), '20261019');
    expect(next?.days['20261019']).toBe(a);
    expect(next?.used).toContain(a);
  });
  it('정하지 않은 날은 무작위로 뽑되, 앞으로 정해 둔 상황은 피한다', () => {
    const ids = EXPR_IDS.filter((x) => x !== c);   // 남은 후보를 c 하나만 남기는 대신, c 를 피하는지 여러 번 본다
    for (let i = 0; i < 20; i += 1) {
      const bag = settleDay(book({ '20261023': c }), '20261019', () => i / 20);
      expect(ids).toContain(bag?.days['20261019']);
    }
  });
  it('주말에는 다가오는 주의 월~금', () => {
    const days = weekDays(d(2026, 10, 18)).map((x) => x.getDate());   // 일요일
    expect(days).toEqual([19, 20, 21, 22, 23]);
    expect(weekDays(d(2026, 10, 15)).map((x) => x.getDate())).toEqual([12, 13, 14, 15, 16]);
    expect(weekDays(d(2026, 10, 15), 1)[0].getDate()).toBe(19);
  });
  it('앱의 날짜 열쇠(dateKeyOf) 모양 그대로 다룬다', () => {
    const k = dateKeyOf(d(2026, 10, 20));
    expect(prunePlan({ [k]: a }, d(2026, 10, 15))).toEqual({ [k]: a });
    expect(weekDays(d(2026, 10, 15)).map(dateKeyOf)).toContain(dateKeyOf(d(2026, 10, 15)));
  });
  it('한 달 넘게 지난 날과 없는 상황은 지운다', () => {
    expect(prunePlan({ '20260801': a, '20261020': b, '20261021': 'zzz' }, d(2026, 10, 15))).toEqual({ '20261020': b });
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
