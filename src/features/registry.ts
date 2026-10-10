import type { CardDef, FeatureManifest } from './types';

// src/features/*/manifest.ts(x) 를 빌드할 때 자동으로 모은다.
// 새 기능을 추가할 때 이 파일은 고치지 않는다 — 자기 폴더에 manifest 만 만든다.
const modules = import.meta.glob<{ default: FeatureManifest }>('./*/manifest.{ts,tsx}', { eager: true });

export const FEATURES: FeatureManifest[] = Object.values(modules).map((m) => m.default);

export const CARDS: CardDef[] = FEATURES.flatMap((f) => f.cards ?? []);

export function cardsOfColumn(col: CardDef['col']): CardDef[] {
  return CARDS.filter((c) => c.col === col).sort((a, b) => a.order - b.order);
}
