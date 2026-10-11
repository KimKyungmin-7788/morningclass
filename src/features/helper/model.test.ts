import { describe, expect, it } from 'vitest';
import { boardCandidates, drawStyleOf, ladderStartFor, makeLadder, marblePath, marbleRows, pathFractions, shuffle, traceLadder, wheelTurn } from './model';

/** 시험마다 같은 순서로 나오는 무작위 */
const seeded = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

describe('뽑기 규칙', () => {
  it('모르는 방식은 기본으로 본다', () => {
    expect(drawStyleOf('wheel')).toBe('wheel');
    expect(drawStyleOf(undefined)).toBe('basic');
    expect(drawStyleOf('없는것')).toBe('basic');
  });

  it('섞어도 구성은 그대로다', () => {
    const list = [1, 2, 3, 4, 5, 6];
    expect(shuffle(list, seeded(1)).sort()).toEqual(list);
  });

  it('판에 올릴 후보: 뽑힌 학생은 꼭 들어가고, 많으면 정한 수만큼만 올린다', () => {
    const pool = Array.from({ length: 20 }, (_, i) => `s${i}`);
    const winners = ['s3', 's17', 's9'];
    for (let seed = 1; seed <= 20; seed += 1) {
      const c = boardCandidates(pool, winners, 8, seeded(seed));
      expect(c).toHaveLength(8);
      expect(new Set(c).size).toBe(8);
      expect(winners.every((w) => c.includes(w))).toBe(true);
    }
    expect(boardCandidates(['a', 'b', 'c'], ['a'], 8, seeded(1)).sort()).toEqual(['a', 'b', 'c']);   // 적으면 모두
  });

  it('사다리: 가로대가 붙지 않고, 줄마다 서로 다른 곳에 닿는다', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const l = makeLadder(6, 9, seeded(seed));
      for (const row of l.rungs) for (let i = 1; i < row.length; i += 1) expect(row[i] && row[i - 1]).toBe(false);
      for (let i = 0; i < 5; i += 1) expect(l.rungs.some((row) => row[i])).toBe(true);
      const ends = [0, 1, 2, 3, 4, 5].map((c) => traceLadder(l, c).end);
      expect([...ends].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    }
    // 길은 맨 위에서 시작해 맨 아래에서 끝나고, 한 번에 옆으로 한 줄씩만 옮긴다
    const l = makeLadder(4, 6, seeded(7));
    const { end, path } = traceLadder(l, 1);
    expect(path[0]).toEqual([1, 0]);
    expect(path[path.length - 1]).toEqual([end, 7]);
    for (let i = 1; i < path.length; i += 1) expect(Math.abs(path[i][0] - path[i - 1][0])).toBeLessThanOrEqual(1);
    expect(traceLadder(makeLadder(1, 5, seeded(1)), 0).end).toBe(0);   // 혼자여도 된다
    // 아래쪽 이름에서 거꾸로: 그 이름에 닿는 위쪽 출발점을 찾는다
    for (let c = 0; c < 4; c += 1) expect(traceLadder(l, ladderStartFor(l, c)).end).toBe(c);
    expect(pathFractions([[0, 0], [0, 3], [1, 3], [1, 4]])).toEqual([0, 0.6, 0.8, 1]);
  });

  it('구슬 뽑기: 구슬은 가운데에서 떨어져 못마다 반 칸씩 튀고, 정한 칸 한가운데에 닿는다', () => {
    for (const slots of [1, 2, 3, 5, 8]) {
      for (let target = 0; target < slots; target += 1) {
        for (let seed = 1; seed <= 5; seed += 1) {
          const path = marblePath(slots, target, seeded(seed * 31 + target));
          expect(path).toHaveLength(marbleRows(slots) + 1);
          expect(path[0]).toBe(slots);
          expect(path[path.length - 1]).toBe(2 * target + 1);
          for (let i = 1; i < path.length; i += 1) {
            expect(Math.abs(path[i] - path[i - 1])).toBe(1);
            expect(path[i]).toBeGreaterThanOrEqual(0);
            expect(path[i]).toBeLessThanOrEqual(2 * slots);
          }
        }
      }
    }
  });

  it('돌림판: 뽑힌 조각이 위쪽 바늘에 오고, 언제나 앞으로 여러 바퀴 돈다', () => {
    const top = (rot: number, index: number, count: number) => ((((index + 0.5) * 360) / count + rot) % 360 + 360) % 360;
    let rot = 0;
    for (const index of [0, 3, 7, 2]) {
      const next = wheelTurn(rot, index, 8);
      expect(next - rot).toBeGreaterThanOrEqual(4 * 360);
      expect(next - rot).toBeLessThan(5 * 360);
      expect(Math.min(top(next, index, 8), 360 - top(next, index, 8))).toBeLessThan(1e-6);
      rot = next;
    }
  });
});
