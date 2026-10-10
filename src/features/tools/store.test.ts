import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fmtMS, swElapsed, timerLeft, useTools } from './store';

describe('수업 도구: 타이머·스톱워치', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 9, 10, 9, 0, 0)); useTools.getState().preset(5); useTools.getState().resetSw(); });
  afterEach(() => vi.useRealTimers());

  it('타이머: 시작 → 멈춤 → 다시 시작 → 끝', () => {
    const s = useTools.getState;
    s().preset(1);
    s().toggleTimer();
    vi.advanceTimersByTime(20_000);
    expect(Math.round(timerLeft(s().timer))).toBe(40);
    s().toggleTimer();                       // 멈춤
    vi.advanceTimersByTime(30_000);
    expect(Math.round(timerLeft(s().timer))).toBe(40);
    s().toggleTimer();
    expect(s().finishIfDue()).toBe(false);
    vi.advanceTimersByTime(40_000);
    expect(s().finishIfDue()).toBe(true);
    expect(s().timer).toMatchObject({ left: 0, endAt: null, done: true });
    s().toggleTimer();                       // 끝난 뒤 시작을 누르면 처음 시간으로 다시 간다
    expect(Math.round(timerLeft(s().timer))).toBe(60);
  });

  it('타이머: ±1분은 0초~99분 사이에서만', () => {
    const s = useTools.getState;
    s().preset(1);
    s().adjust(-60); s().adjust(-60);
    expect(timerLeft(s().timer)).toBe(0);
    s().preset(30);
    for (let i = 0; i < 80; i += 1) s().adjust(60);
    expect(timerLeft(s().timer)).toBe(99 * 60);
    s().toggleTimer(); s().adjust(-60);      // 가는 중에도 줄일 수 있다
    expect(Math.round(timerLeft(s().timer))).toBe(98 * 60);
  });

  it('스톱워치: 멈췄다 다시 가도 이어서 잰다', () => {
    const s = useTools.getState;
    s().toggleSw(); vi.advanceTimersByTime(3_000); s().toggleSw();
    vi.advanceTimersByTime(10_000);
    s().toggleSw(); vi.advanceTimersByTime(2_500);
    expect(swElapsed(s().sw)).toBeCloseTo(5.5);
    s().resetSw();
    expect(swElapsed(s().sw)).toBe(0);
  });

  it('시간 표시', () => {
    expect([0, 59.9, 60, 3599, -3].map(fmtMS)).toEqual(['00:00', '00:59', '01:00', '59:59', '00:00']);
  });
});
