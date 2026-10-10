import { describe, expect, it } from 'vitest';
import { cardsOfColumn } from '@/features/registry';

// 1단계 연기 시험: 카드 등록 구조가 열·순서대로 카드를 돌려주는지
describe('카드 등록', () => {
  it('열마다 순서대로 정렬된다', () => {
    for (const col of [0, 1, 2, 3] as const) {
      const orders = cardsOfColumn(col).map((c) => c.order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
      expect(orders.length).toBeGreaterThan(0);
    }
  });
});
