import { describe, expect, it } from 'vitest';
import { ddayDiff, ddayLabel, ddaySorted, fmtDdayDate } from './model';

const base = new Date(2026, 9, 10, 15, 30);   // 2026-10-10 오후

describe('D-DAY', () => {
  it('남은 날 수는 시각과 무관하게 날짜로만 센다', () => {
    expect(ddayDiff('2026-10-10', base)).toBe(0);
    expect(ddayDiff('2026-10-20', base)).toBe(10);
    expect(ddayDiff('2026-10-01', base)).toBe(-9);
    expect(ddayDiff('2027-01-01', base)).toBe(83);
  });
  it('표시', () => {
    expect([0, 3, -2].map(ddayLabel)).toEqual(['D-DAY', 'D-3', 'D+2']);
    expect(fmtDdayDate('2026-03-05')).toBe('2026. 3. 5.');
  });
  it('가까운 미래 → 먼 미래 → 최근에 지난 것 → 오래 지난 것', () => {
    const list = [
      { id: 'a', name: '오래전', date: '2026-09-01' }, { id: 'b', name: '먼 미래', date: '2026-12-25' },
      { id: 'c', name: '오늘', date: '2026-10-10' }, { id: 'd', name: '어제', date: '2026-10-09' }, { id: 'e', name: '내일', date: '2026-10-11' },
    ];
    expect(ddaySorted(list, base).map((x) => x.name)).toEqual(['오늘', '내일', '먼 미래', '어제', '오래전']);
  });
});
