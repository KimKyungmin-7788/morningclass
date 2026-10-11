import { describe, expect, it } from 'vitest';
import { CARDS, CARD_IDS, cardById } from '@/features/registry';
import { DEFAULT_LAYOUT, resolveLayout } from '@/features/layout/model';

describe('카드 등록', () => {
  it('카드 이름이 겹치지 않는다 (자리 표시 카드를 빼지 않고 기능을 옮기면 걸린다)', () => {
    expect(new Set(CARD_IDS).size).toBe(CARDS.length);
  });
  it('기본 배치에 적힌 카드가 모두 등록되어 있다', () => {
    for (const id of Object.values(DEFAULT_LAYOUT)) expect(cardById(id), String(id)).toBeDefined();
  });
  it('기본 배치에서는 보관함이 비어 있다 (새 카드를 만들면 기본 배치에 넣을지 정한다)', () => {
    expect(resolveLayout(undefined, CARD_IDS).drawer).toEqual([]);
  });
});
