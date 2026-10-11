import type { CardDef, FeatureManifest } from './types';

// src/features/*/manifest.ts(x) 를 빌드할 때 자동으로 모은다.
// 새 기능을 추가할 때 이 파일은 고치지 않는다 — 자기 폴더에 manifest 만 만든다.
// 카드가 어느 칸에 놓일지는 배치표(features/layout/model.ts)가 정한다.
const modules = import.meta.glob<{ default: FeatureManifest }>('./*/manifest.{ts,tsx}', { eager: true });

export const FEATURES: FeatureManifest[] = Object.values(modules).map((m) => m.default);

export const CARDS: CardDef[] = FEATURES.flatMap((f) => f.cards ?? []);

export const CARD_IDS: string[] = CARDS.map((c) => c.id);

export function cardById(id: string | null | undefined): CardDef | undefined {
  return id ? CARDS.find((c) => c.id === id) : undefined;
}
