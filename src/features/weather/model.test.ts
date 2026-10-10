import { describe, expect, it } from 'vitest';
import { dustFromPm10, feelFromTemp, judgeWeather, weatherFromCode, wxFeel, WEATHER } from './model';

describe('날씨·미세먼지 규칙', () => {
  it('기온 → 체감 단계 (반올림 기준)', () => {
    expect(feelFromTemp(8.4)?.k).toBe('cold');
    expect(feelFromTemp(8.5)?.k).toBe('cool');
    expect(feelFromTemp(24)?.k).toBe('good');
    expect(feelFromTemp(27.6)?.k).toBe('hot');
    expect(feelFromTemp(null)).toBeNull();
  });
  it('기온 숫자가 없으면 직접 고른 체감을 쓴다', () => {
    expect(wxFeel({ ...WEATHER[0], feel: 'warm' })?.label).toBe('살짝 더워요');
    expect(wxFeel({ ...WEATHER[0], feel: 'warm', temp: 3 })?.k).toBe('cold');
    expect(wxFeel(WEATHER[0])).toBeNull();
  });
  it('날씨 코드와 PM10 을 등급으로 바꾼다', () => {
    expect([0, 2, 45, 63, 81, 73, 86, 96, 20].map((c) => weatherFromCode(c)?.label))
      .toEqual(['맑음', '구름조금', '흐림', '비', '비', '눈', '눈', '천둥번개', '흐림']);
    expect([30, 31, 80, 81, 150, 151].map((v) => dustFromPm10(v)?.label)).toEqual(['좋음', '보통', '보통', '나쁨', '나쁨', '매우나쁨']);
    expect(dustFromPm10(undefined)).toBeNull();
  });
  it('정답 판정: 기온을 고르지 않으면 날씨만 본다', () => {
    const ans = { ...WEATHER[3], temp: 12 };
    expect(judgeWeather('비', null, ans)).toEqual({ wOk: true, fOk: null, allOk: true });
    expect(judgeWeather('비', 'cold', ans)).toEqual({ wOk: true, fOk: false, allOk: false });
    expect(judgeWeather('눈', 'cool', ans)).toEqual({ wOk: false, fOk: true, allOk: false });
  });
});
