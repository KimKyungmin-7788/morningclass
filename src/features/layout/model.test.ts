import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, SLOTS, clearSlot, firstEmptySlot, isDefaultLayout, makeGate, placeCard, resolveLayout, swapSlots } from './model';

const CARDS = Object.values(DEFAULT_LAYOUT) as string[];

describe('배치표 읽기', () => {
  it('저장된 것이 없으면 기본 배치이고 보관함은 비어 있다', () => {
    for (const saved of [undefined, null, 'x', []]) {
      expect(resolveLayout(saved, CARDS)).toEqual({ slots: DEFAULT_LAYOUT, drawer: [] });
    }
  });
  it('기본 배치는 모든 칸을 채운다', () => {
    expect(Object.keys(DEFAULT_LAYOUT).sort()).toEqual(SLOTS.map((s) => s.id).sort());
    expect(new Set(CARDS).size).toBe(SLOTS.length);
  });
  it('저장된 배치를 그대로 따르고, 적히지 않은 칸은 빈 칸이다', () => {
    const { slots, drawer } = resolveLayout({ a1: 'meal', b1: 'weather', d1: null }, CARDS);
    expect(slots.a1).toBe('meal');
    expect(slots.b1).toBe('weather');
    expect(slots.d1).toBeNull();
    expect(slots.a2).toBeNull();
    expect(Object.keys(slots)).toHaveLength(SLOTS.length);
    expect(drawer).toEqual(CARDS.filter((c) => c !== 'meal' && c !== 'weather'));
  });
  it('새로 생긴 카드는 보관함에 들어간다', () => {
    const { slots, drawer } = resolveLayout(DEFAULT_LAYOUT, [...CARDS, 'newcard']);
    expect(slots).toEqual(DEFAULT_LAYOUT);
    expect(drawer).toEqual(['newcard']);
  });
  it('없어진 카드의 자리는 빈 칸이 된다', () => {
    const { slots, drawer } = resolveLayout(DEFAULT_LAYOUT, CARDS.filter((c) => c !== 'expression'));
    expect(slots.a3).toBeNull();
    expect(drawer).toEqual([]);
  });
  it('같은 카드가 두 번 적혀 있으면 앞의 칸만 인정한다', () => {
    const { slots, drawer } = resolveLayout({ ...DEFAULT_LAYOUT, a3: 'weather' }, CARDS);
    expect(slots.a2).toBe('weather');
    expect(slots.a3).toBeNull();
    expect(drawer).toEqual(['expression']);
  });
  it('모르는 칸 이름과 잘못된 값은 무시한다', () => {
    const { slots } = resolveLayout({ a1: 'weather', z9: 'meal', a2: 7 }, CARDS);
    expect(slots.z9).toBeUndefined();
    expect(slots.a2).toBeNull();
  });
});

describe('배치 바꾸기', () => {
  const base = resolveLayout(undefined, CARDS).slots;

  it('두 칸을 맞바꾼다 (원래 배치표는 그대로)', () => {
    const next = swapSlots(base, 'a1', 'b1');
    expect(next.a1).toBe('timetable');
    expect(next.b1).toBe('attendance');
    expect(base.a1).toBe('attendance');
  });
  it('빈 칸과 바꾸면 옮기기가 된다', () => {
    const next = swapSlots(clearSlot(base, 'a2'), 'a1', 'a2');
    expect(next.a1).toBeNull();
    expect(next.a2).toBe('attendance');
  });
  it('같은 칸이거나 모르는 칸이면 그대로 둔다', () => {
    expect(swapSlots(base, 'a1', 'a1')).toBe(base);
    expect(swapSlots(base, 'a1', 'z9')).toBe(base);
    expect(clearSlot(base, 'z9')).toBe(base);
    expect(placeCard(base, 'z9', 'meal')).toBe(base);
  });
  it('칸을 비우면 그 카드가 보관함으로 간다', () => {
    const next = clearSlot(base, 'd4');
    expect(next.d4).toBeNull();
    expect(resolveLayout(next, CARDS).drawer).toEqual(['book']);
  });
  it('보관함의 카드를 빈 칸에 넣는다', () => {
    const next = placeCard(clearSlot(base, 'd4'), 'd4', 'book');
    expect(next).toEqual(base);
  });
  it('보관함의 카드를 찬 칸에 넣으면 원래 카드가 보관함으로 간다', () => {
    const next = placeCard(clearSlot(base, 'd4'), 'a1', 'book');
    expect(next.a1).toBe('book');
    expect(resolveLayout(next, CARDS).drawer).toEqual(['attendance']);
  });
  it('첫 빈 칸을 위에서부터 찾는다', () => {
    expect(firstEmptySlot(base)).toBeNull();
    expect(firstEmptySlot(clearSlot(clearSlot(base, 'd1'), 'b2'))).toBe('b2');
  });
  it('기본 배치인지 안다', () => {
    expect(isDefaultLayout(base)).toBe(true);
    expect(isDefaultLayout(swapSlots(base, 'a1', 'a2'))).toBe(false);
    expect(isDefaultLayout(swapSlots(swapSlots(base, 'a1', 'a2'), 'a1', 'a2'))).toBe(true);
  });
  it('이미 놓인 카드를 다른 칸에 넣으면 두 칸이 맞바뀐다', () => {
    const next = placeCard(base, 'b1', 'weather');
    expect(next.b1).toBe('weather');
    expect(next.a2).toBe('timetable');
  });
});

describe('확인 문제', () => {
  it('2~9 끼리의 곱셈이고, 보기 네 개에 정답이 한 번만 들어 있다', () => {
    let seed = 7;
    const rand = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    for (let i = 0; i < 300; i += 1) {
      const g = makeGate(rand);
      expect(g.a).toBeGreaterThanOrEqual(2); expect(g.a).toBeLessThanOrEqual(9);
      expect(g.b).toBeGreaterThanOrEqual(2); expect(g.b).toBeLessThanOrEqual(9);
      expect(g.answer).toBe(g.a * g.b);
      expect(g.choices).toHaveLength(4);
      expect(new Set(g.choices).size).toBe(4);
      expect(g.choices.filter((n) => n === g.answer)).toHaveLength(1);
      expect(g.choices.every((n) => n > 0)).toBe(true);
    }
  });
});
