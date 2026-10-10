import { describe, expect, it } from 'vitest';
import { holidayName, holidaysOfYear } from './holidays';

const d = (ymd: string) => new Date(`${ymd}T00:00:00`);

describe('공휴일', () => {
  it('고정 공휴일과 음력 연휴', () => {
    expect(holidayName(d('2026-10-09'))).toBe('한글날');
    expect(holidayName(d('2026-02-16'))).toBe('설날');
    expect(holidayName(d('2026-02-18'))).toBe('설날');
    expect(holidayName(d('2026-10-12'))).toBe('');
  });
  it('주말과 겹치면 다음 평일이 대체공휴일', () => {
    expect(holidayName(d('2026-03-02'))).toBe('대체공휴일');   // 삼일절(일)
    expect(holidayName(d('2026-08-17'))).toBe('대체공휴일');   // 광복절(토)
    expect(holidayName(d('2026-10-05'))).toBe('대체공휴일');   // 개천절(토)
    expect(holidayName(d('2026-05-25'))).toBe('대체공휴일');   // 부처님오신날(일)
  });
  it('공휴일끼리 겹치거나 연휴가 일요일과 겹칠 때', () => {
    expect(holidayName(d('2025-05-05'))).toBe('어린이날·부처님오신날');
    expect(holidayName(d('2025-05-06'))).toBe('대체공휴일');
    expect(holidayName(d('2025-10-08'))).toBe('대체공휴일');   // 추석 연휴(10/5~7)의 10/5 가 일요일
  });
  it('신정·현충일·선거일은 대체공휴일이 없다', () => {
    expect(holidayName(d('2026-06-08'))).toBe('');             // 현충일(토) 다음 월요일
    expect(holidaysOfYear(2026)['2026-06-03']).toBe('지방선거일');
  });
});
