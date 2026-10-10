import type { EmotionKind } from './types';

// 감정 8종과 몸 부위 이름 (감정 카드·이전 기록 보기에서 함께 쓴다)
export const EMOTIONS: { k: EmotionKind; e: string; l: string; say: string }[] = [
  { k: 'joy', e: '😊', l: '기쁨', say: '기뻐요' }, { k: 'sad', e: '😢', l: '슬픔', say: '슬퍼요' },
  { k: 'angry', e: '😡', l: '화남', say: '화나요' }, { k: 'tired', e: '😴', l: '피곤', say: '피곤해요' },
  { k: 'excited', e: '😆', l: '신남', say: '신나요' }, { k: 'anxious', e: '😰', l: '불안', say: '불안해요' },
  { k: 'meh', e: '😑', l: '그냥', say: '그냥 그래요' }, { k: 'sick', e: '🤢', l: '아픔', say: '아파요' },
];
export const EMO_ZONES: Record<string, string> = { head: '머리', chest: '가슴', belly: '배', arms: '팔', legs: '다리' };
export const emotionOf = (k: string) => EMOTIONS.find((e) => e.k === k);
