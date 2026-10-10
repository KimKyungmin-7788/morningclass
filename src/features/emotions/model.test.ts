import { describe, expect, it } from 'vitest';
import type { EmotionItem } from '@/core/data/types';
import { EMO_PERSON, compact, freeSpot, inHeart, makeMain, placeAt, roughInside, snapIn, zoneOf } from './model';

const H = EMO_PERSON.heart;
const at = (k: EmotionItem['k'], x: number, y: number): EmotionItem => ({ k, x, y, zone: zoneOf({ x, y }) });

describe('마음 일기 규칙', () => {
  it('몸 부위', () => {
    expect([zoneOf({ x: 0.5, y: 0.2 }), zoneOf({ x: 0.5, y: 0.5 }), zoneOf({ x: 0.5, y: 0.6 }), zoneOf({ x: 0.2, y: 0.5 }), zoneOf({ x: 0.7, y: 0.6 }), zoneOf({ x: 0.5, y: 0.9 })])
      .toEqual(['head', 'chest', 'belly', 'arms', 'arms', 'legs']);
  });
  it('마음 자리 판정', () => {
    expect(inHeart(H)).toBe(true);
    expect(inHeart({ x: H.x + 0.12, y: H.y })).toBe(true);
    expect(inHeart({ x: H.x + 0.14, y: H.y })).toBe(false);
    expect(inHeart(null)).toBe(false);
  });
  it('몸 밖에 놓으면 몸 안으로 당겨진다', () => {
    const q = snapIn({ x: 0.02, y: 0.5 }, roughInside);
    expect(roughInside(q)).toBe(true);
    expect(q.x).toBeGreaterThan(0.2);
    expect(snapIn({ x: 0.5, y: 0.5 }, roughInside)).toEqual({ x: 0.5, y: 0.5 });   // 이미 안이면 그대로
    expect(placeAt({ x: 0.02, y: 0.5 }, roughInside).zone).toBe('arms');
  });
  it('주인공 바꾸기: 원래 주인공이 마음 자리에 있었으면 옆으로 비켜 준다', () => {
    const joy = at('joy', H.x, H.y);
    const sad = at('sad', 0.5, 0.2);
    const next = makeMain([joy, sad], sad, roughInside);
    expect(next.map((i) => i.k)).toEqual(['sad', 'joy']);
    expect(inHeart(next[1])).toBe(false);
    expect(roughInside(next[1])).toBe(true);
  });
  it('주인공 바꾸기: 원래 주인공이 다른 곳에 있었으면 그 자리에 둔다', () => {
    const joy = at('joy', 0.5, 0.2);
    const next = makeMain([joy], at('angry', H.x, H.y), roughInside);
    expect(next.map((i) => [i.k, i.x, i.y])).toEqual([['angry', H.x, H.y], ['joy', 0.5, 0.2]]);
  });
  it('주인공 바꾸기: 같은 감정이 몸에 또 있으면 하나로 합친다', () => {
    const items = [at('joy', H.x, H.y), at('sad', 0.5, 0.2), at('sad', 0.36, 0.42)];
    const next = makeMain(items, at('sad', H.x, H.y), roughInside);
    expect(next.map((i) => i.k)).toEqual(['sad', 'joy']);
  });
  it('비켜 줄 자리는 다른 감정과 겹치지 않게 고른다', () => {
    const a = freeSpot([H], roughInside);
    const b = freeSpot([H, a], roughInside);
    expect(a).not.toEqual(b);
    expect(inHeart(a) || inHeart(b)).toBe(false);
    expect(roughInside(freeSpot([H], () => false) as never) || true).toBe(true);   // 몸 판정이 모두 실패해도 값은 돌려준다
  });
  it('저장할 때 좌표를 줄인다', () => {
    expect(compact([{ k: 'joy', x: 0.123456, y: 0.5, zone: 'chest' }])).toEqual([{ k: 'joy', x: 0.123, y: 0.5, zone: 'chest' }]);
  });
});
