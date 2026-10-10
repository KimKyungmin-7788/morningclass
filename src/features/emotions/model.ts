import type { EmotionItem, EmotionKind } from '@/core/data/types';

// 마음 일기 규칙 (화면과 무관한 계산). 좌표는 사람 그림 기준 비율(0~1).

/** 사람 그림(524×754, 기본·감정별 표정 9장이 같은 틀): 마음 자리(셔츠 점선 동그라미) 중심과 몸 부위 경계 */
export const EMO_PERSON = { w: 524, h: 754, heart: { x: 0.496, y: 0.581 }, zone: { head: 0.414, chest: 0.546, legs: 0.786, armL: 0.309, armR: 0.674 } };
/** 한 사람 몸에 넣을 수 있는 감정 수 (너무 많으면 겹쳐서 안 보인다) */
export const EMO_MAX = 10;

export const emoImg = (k: EmotionKind) => `/img/emotion/${k}.webp`;
/** 첫 감정을 넣으면 사람이 그 감정 표정·몸짓으로 바뀐다 */
export const emoPose = (k: EmotionKind | undefined) => (k ? `/img/emotion/person-${k}.webp` : '/img/emotion/person.webp');

export interface Pt { x: number; y: number }
/** 그 자리가 몸 안인가 (그림의 투명도로 판정) */
export type Inside = (p: Pt) => boolean;

/** 그림을 못 읽었을 때 쓰는 대략적인 몸 범위 */
export const roughInside: Inside = (p) => p.x > 0.2 && p.x < 0.8 && p.y > 0.05 && p.y < 0.95;

export function zoneOf(p: Pt): string {
  const z = EMO_PERSON.zone;
  return p.y < z.head ? 'head' : p.y >= z.legs ? 'legs' : p.x < z.armL || p.x > z.armR ? 'arms' : p.y < z.chest ? 'chest' : 'belly';
}

/** 셔츠 점선 동그라미(마음 자리) 안인가 — 여기에 놓은 감정이 첫 감정(주인공)이 된다 */
export const inHeart = (p: Pt | null | undefined): boolean =>
  !!p && ((p.x - EMO_PERSON.heart.x) / 0.13) ** 2 + ((p.y - EMO_PERSON.heart.y) / 0.11) ** 2 <= 1;

/** 몸 밖에 놓으면 마음 자리 쪽으로 끌어당겨 몸 안에 넣는다 — 손이 정확하지 않아도 들어가게 */
export function snapIn(p: Pt, inside: Inside): Pt {
  const c = EMO_PERSON.heart;
  let q = p;
  for (let i = 0; i <= 24 && !inside(q); i += 1) q = { x: q.x + (c.x - q.x) * 0.12, y: q.y + (c.y - q.y) * 0.12 };
  return q;
}

/** 놓은 자리 → 저장할 위치(몸 안으로 당긴 좌표 + 몸 부위) */
export function placeAt(p: Pt, inside: Inside): { x: number; y: number; zone: string } {
  const q = snapIn(p, inside);
  return { x: q.x, y: q.y, zone: zoneOf(q) };
}

/** 누르기만 했을 때 놓는 자리: 마음 자리 근처 */
export const heartPos = (rand: () => number = Math.random) =>
  ({ x: EMO_PERSON.heart.x + (rand() - 0.5) * 0.16, y: EMO_PERSON.heart.y + (rand() - 0.5) * 0.1, zone: 'belly' });

const SPOTS: [number, number][] = [[0.5, 0.2], [0.36, 0.42], [0.64, 0.42], [0.42, 0.86], [0.58, 0.86], [0.18, 0.5], [0.82, 0.5], [0.24, 0.62], [0.76, 0.62]];

/** 비켜 줄 자리: 몸 안이면서 마음 자리 밖이고, 다른 감정들과 가장 먼 곳 (others[0] 은 주인공 = 마음 자리에 그려진다) */
export function freeSpot(others: Pt[], inside: Inside): Pt {
  const taken = others.map((o, i) => (i === 0 ? EMO_PERSON.heart : o));
  let best: Pt | null = null;
  let bestD = -1;
  for (const [x, y] of SPOTS) {
    if (!inside({ x, y }) || inHeart({ x, y })) continue;
    const d = Math.min(...taken.map((o) => Math.hypot(o.x - x, ((o.y - y) * EMO_PERSON.h) / EMO_PERSON.w)), Infinity);
    if (d > bestD) { bestD = d; best = { x, y }; }
  }
  return best ?? snapIn({ x: EMO_PERSON.heart.x + 0.2, y: EMO_PERSON.heart.y - 0.06 }, inside);
}

/**
 * 주인공 바꾸기: it 을 첫 자리로.
 *  · 같은 감정이 몸에 또 있으면 하나로 합친다
 *  · 원래 주인공이 마음 자리에 있었으면 옆으로 비켜 준다
 */
export function makeMain(items: EmotionItem[], it: EmotionItem, inside: Inside): EmotionItem[] {
  const old = items[0];
  const next = [it, ...items.filter((o) => o !== it && o.k !== it.k)];
  if (old && old !== it && old.k !== it.k && inHeart(old)) {
    const q = freeSpot(next.filter((o) => o !== old), inside);
    return next.map((o) => (o === old ? { ...o, x: q.x, y: q.y, zone: zoneOf(q) } : o));
  }
  return next;
}

/** 저장할 때 좌표를 소수 셋째 자리로 줄인다 */
export const compact = (items: EmotionItem[]): EmotionItem[] =>
  items.map((it) => ({ k: it.k, x: Number(it.x.toFixed(3)), y: Number(it.y.toFixed(3)), zone: it.zone }));
