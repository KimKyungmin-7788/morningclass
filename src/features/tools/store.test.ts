import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fmtMS, fmtTenths, swElapsed, timerLeft, timerShown, useTools } from './store';

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

  it('시작하는 순간: 화면이 조금 전에 읽어 둔 시각으로 계산해도 숫자가 튀지 않는다', () => {
    const s = useTools.getState;
    const stale = Date.now();                 // 화면이 0.2초 전에 읽어 둔 시각이라고 하자
    vi.advanceTimersByTime(200);
    s().preset(5); s().toggleTimer();
    expect(timerShown(s().timer, stale)).toBe(300);          // 05:01 로 보이면 안 된다
    expect(timerLeft(s().timer, stale)).toBe(300);
    s().toggleSw(); vi.advanceTimersByTime(3200); s().toggleSw();   // 3.2초에서 멈춤
    const stale2 = Date.now();
    vi.advanceTimersByTime(150);
    s().toggleSw();                           // 다시 시작
    expect(swElapsed(s().sw, stale2)).toBeCloseTo(3.2);      // 3.05 로 뒤로 가면 안 된다
  });

  it('타이머: 가는 중에 1분을 더해도 남은 시간이 바로 늘어난다', () => {
    const s = useTools.getState;
    s().preset(1); s().toggleTimer();
    vi.advanceTimersByTime(10_000);
    s().adjust(60);
    expect(Math.round(timerLeft(s().timer))).toBe(110);
    expect(timerShown(s().timer)).toBe(110);
  });

  it('스톱워치 0.1초 자리: 소수 계산 오차로 한 칸 밀리지 않는다', () => {
    expect([0, 0.3, 2.3, 59.95, 60.04, 754.9].map((x) => { const f = fmtTenths(x); return `${f.ms}.${f.tenth}`; }))
      .toEqual(['00:00.0', '00:00.3', '00:02.3', '00:59.9', '01:00.0', '12:34.9']);
    expect(fmtTenths(0.1 + 0.2).tenth).toBe(3);               // 0.30000000000000004
    expect(fmtTenths(4.35 * 2).tenth).toBe(7);                // 8.7 (실수로는 8.699999…)
  });

  it('시간 표시', () => {
    expect([0, 59.9, 60, 3599, -3].map(fmtMS)).toEqual(['00:00', '00:59', '01:00', '59:59', '00:00']);
  });
});
