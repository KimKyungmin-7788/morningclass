import { describe, expect, it } from 'vitest';
import { ddaySheet, mealSheet, notesSheet, sheetEmpty, timetableSheet, weatherSheet, wrapText } from './morning';

const icon = (s: string) => (s === '국어' ? '📚' : '📖');

describe('아침교실 내용을 판서용 종이로', () => {
  it('시간표: 맞춘 것이 있으면 그것과 메모를, 없으면 설정의 시간표를 쓴다 (빈 교시는 뺀다)', () => {
    const done = timetableSheet(['국어', '', '수학'], ['체육'], { 0: ' 받아쓰기 ', 2: '' }, icon);
    expect(done.rows).toEqual([{ badge: '1교시', text: '📚 국어', sub: '받아쓰기' }, { badge: '3교시', text: '📖 수학', sub: undefined }]);
    const planned = timetableSheet(null, ['체육', '음악'], { 0: '안 쓰는 메모' }, icon);
    expect(planned.rows.map((r) => [r.badge, r.text, r.sub])).toEqual([['1교시', '📖 체육', undefined], ['2교시', '📖 음악', undefined]]);
    expect(sheetEmpty(timetableSheet([], [], {}, icon))).toBe(true);
    expect(sheetEmpty(timetableSheet(['', ''], [], {}, icon))).toBe(true);
  });

  it('날씨: 고른 것만 줄로 넣고, 아무것도 안 골랐으면 비어 있다', () => {
    const sunny = { emoji: '☀️', label: '맑음', temp: 18.6 };
    const feel = { emoji: '🍃', label: '적당해요', say: '가벼운 옷이면 돼요' };
    const dust = { emoji: '🌿', label: '보통', hint: '평소처럼 활동해요' };
    expect(weatherSheet(sunny, feel, dust).rows).toEqual([
      { badge: '날씨', text: '☀️ 맑음', sub: '19°' },
      { badge: '옷차림', text: '🍃 적당해요', sub: '가벼운 옷이면 돼요' },
      { badge: '미세먼지', text: '🌿 보통', sub: '평소처럼 활동해요' },
    ]);
    expect(weatherSheet(null, null, dust).rows.map((r) => r.badge)).toEqual(['미세먼지']);
    expect(weatherSheet({ emoji: '☁️', label: '흐림' }, null, null).rows[0].sub).toBeUndefined();
    expect(sheetEmpty(weatherSheet(null, null, null))).toBe(true);
  });

  it('유의사항 · 급식 · D-DAY: 내용이 없으면 비어 있다고 본다', () => {
    expect(sheetEmpty(notesSheet('  \n '))).toBe(true);
    expect(notesSheet(' 우산 챙기기 ').body).toBe('우산 챙기기');
    expect(mealSheet(['쌀밥', ' ', '김치 ']).rows).toEqual([{ text: '쌀밥' }, { text: '김치' }]);
    expect(sheetEmpty(mealSheet([]))).toBe(true);
    expect(ddaySheet([{ name: '현장학습', label: 'D-3', date: '2026. 10. 14.' }]).rows).toEqual([{ badge: 'D-3', text: '현장학습', sub: '2026. 10. 14.' }]);
  });

  it('긴 글은 띄어쓰기에서 줄을 바꾸고, 너무 긴 낱말은 글자 단위로 끊는다', () => {
    const measure = (s: string) => s.length * 10;                   // 글자 하나에 10
    expect(wrapText('가나 다라 마바사', 50, measure)).toEqual(['가나 다라', '마바사']);
    expect(wrapText('가나다라마바사아', 30, measure)).toEqual(['가나다', '라마바', '사아']);
    expect(wrapText('첫 줄\n\n셋째 줄', 100, measure)).toEqual(['첫 줄', '', '셋째 줄']);
  });
});
