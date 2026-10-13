// 소음 측정 규칙 (화면과 무관한 계산). 마이크 소리는 크기만 재고, 녹음하거나 어디로 보내지 않는다.

export type NoiseState = 'quiet' | 'warn' | 'loud';

/** 마이크 입력의 크기(실효값 0~1) → 0~100. 사람 귀처럼 로그(데시벨)로 바꿔서, 조용한 교실이 20 안팎 · 떠드는 교실이 70 안팎이 되게 맞춘다 */
export function noiseLevel(rms: number): number {
  if (!(rms > 0)) return 0;
  const db = 20 * Math.log10(rms);                                 // 0 = 가장 큰 소리, 조용할수록 큰 음수
  return Math.round(Math.min(100, Math.max(0, ((db + 60) / 50) * 100)));
}

/** 컴퓨터에서 나는 소리를 그대로 받는 입력 장치인지 (스테레오 믹스 따위 — 마이크가 아니다) */
export const isLoopbackInput = (label: string) => /stereo\s*mix|스테레오\s*믹스|what\s*u\s*hear|loopback|monitor of|wave\s*out|blackhole|soundflower|vb-audio|voicemeeter|cable output/i.test(label);

/** 기준(limit)에 견준 상태: 기준의 80% 밑이면 조용, 기준 밑이면 주의, 기준을 넘으면 시끄러움 */
export const noiseState = (level: number, limit: number): NoiseState => (level >= limit ? 'loud' : level >= limit * 0.8 ? 'warn' : 'quiet');

/** 바늘이 떨리지 않게 앞의 값과 섞는다 — 커질 때는 빨리, 작아질 때는 천천히 따라간다 */
export const smoothLevel = (prev: number, next: number) => prev + (next - prev) * (next > prev ? 0.5 : 0.18);

export const NOISE_TEXT: Record<NoiseState, { face: string; text: string }> = {
  quiet: { face: '😊', text: '조용해요, 좋아요!' },
  warn: { face: '😯', text: '조금 시끄러워졌어요' },
  loud: { face: '🤫', text: '쉿! 목소리를 낮춰요' },
};
