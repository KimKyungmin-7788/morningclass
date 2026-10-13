import { describe, expect, it } from 'vitest';
import { isLoopbackInput, noiseLevel, noiseState, smoothLevel } from './noise';

describe('소음 측정', () => {
  it('소리 크기를 0~100 으로 바꾼다 (클수록 큰 값, 범위를 벗어나지 않는다)', () => {
    expect(noiseLevel(0)).toBe(0);
    expect(noiseLevel(Number.NaN)).toBe(0);
    expect(noiseLevel(0.001)).toBe(0);                              // 거의 무음
    expect(noiseLevel(0.01)).toBe(40);
    expect(noiseLevel(0.1)).toBe(80);
    expect(noiseLevel(1)).toBe(100);
    expect(noiseLevel(0.03)).toBeGreaterThan(noiseLevel(0.01));
  });

  it('기준에 견줘 조용 · 주의 · 시끄러움을 가른다', () => {
    expect(noiseState(30, 60)).toBe('quiet');
    expect(noiseState(48, 60)).toBe('warn');
    expect(noiseState(60, 60)).toBe('loud');
    expect(noiseState(30, 35)).toBe('warn');                        // 기준을 낮추면(엄격하게) 같은 소리도 주의
  });

  it('커질 때는 빨리, 작아질 때는 천천히 따라간다', () => {
    expect(smoothLevel(20, 80)).toBe(50);
    expect(smoothLevel(80, 20)).toBeCloseTo(69.2);
  });

  it('컴퓨터 소리를 받는 입력 장치는 마이크로 치지 않는다', () => {
    expect(isLoopbackInput('스테레오 믹스(Realtek(R) Audio)')).toBe(true);
    expect(isLoopbackInput('Stereo Mix (Realtek High Definition Audio)')).toBe(true);
    expect(isLoopbackInput('마이크 배열(Realtek(R) Audio)')).toBe(false);
    expect(isLoopbackInput('')).toBe(false);
  });
});
