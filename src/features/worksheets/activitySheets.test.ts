import { describe, expect, it } from 'vitest';
import { EMOTIONS } from '@/core/data/emotions';
import { EMO_PARTS, SITUATIONS, buildEmotionSheetHTML, facesFor, situationsOn } from './emotionSheet';
import { josa } from './sheetKit';
import { TT_PARTS, buildTimetableSheetHTML, choices, quizzes, slotsOf } from './timetableSheet';

const date = new Date(2026, 9, 12);   // 월요일
const all = (parts: [string, string][]) => Object.fromEntries(parts.map(([k]) => [k, true]));
const pagesIn = (html: string) => html.split('<section class="page">').length - 1;

describe('시간표 활동지', () => {
  const periods = ['국어', '수학', '', '체육', '국어'];
  const tt = { periods, week: [periods, ['수학', '국어'], null, [], ['체육']], bank: ['국어', '수학', '체육', '음악', '미술'], icon: () => '📖', date, dot: true };

  it('수업이 있는 교시만 차례대로 쓴다', () => {
    expect(slotsOf(periods)).toEqual([{ no: 1, name: '국어' }, { no: 2, name: '수학' }, { no: 4, name: '체육' }, { no: 5, name: '국어' }]);
  });
  it('보기는 정답을 포함한 서로 다른 세 과목이고, 같은 문제면 늘 같다', () => {
    const a = choices('수학', ['국어', '수학', '체육'], tt.bank, 'k');
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(a).toContain('수학');
    expect(choices('수학', ['국어', '수학', '체육'], tt.bank, 'k')).toEqual(a);
  });
  it('읽기 문제의 정답은 늘 보기에 있고, 두 번 나오는 과목으로는 "다음 시간"을 묻지 않는다', () => {
    const qs = quizzes(slotsOf(periods), tt.bank, 'k');
    expect(qs.length).toBeGreaterThanOrEqual(3);
    expect(qs.every((q) => q.pick.includes(q.answer))).toBe(true);
    expect(qs.find((q) => q.q.includes('끝나면'))).toMatchObject({ q: '수학 시간이 끝나면 무엇을 하나요?', answer: '체육' });
    expect(qs.some((q) => q.q.startsWith('국어 시간이 끝나면') || q.q.startsWith('국어는 몇'))).toBe(false);
    expect(quizzes(slotsOf(['국어']), tt.bank, 'k')).toEqual([]);
    expect(quizzes(slotsOf(['국어', '수학', '음악']), tt.bank, 'k').some((q) => q.q === '음악은 몇 교시인가요?')).toBe(true);
    expect([josa('음악', '은', '는'), josa('체육', '은', '는'), josa('국어', '은', '는'), josa('PE', '은', '는')]).toEqual(['음악은', '체육은', '국어는', 'PE은(는)']);
  });
  it('고른 쪽만 만들고, 시간표가 없는 날에는 안내를 보여 준다', () => {
    expect(pagesIn(buildTimetableSheetHTML({ ...tt, sel: all(TT_PARTS) }))).toBe(5);
    expect(pagesIn(buildTimetableSheetHTML({ ...tt, sel: { quiz: true } }))).toBe(1);
    expect(buildTimetableSheetHTML({ ...tt, sel: {} })).toContain('하나 이상 골라');
    expect(buildTimetableSheetHTML({ ...tt, periods: [], week: null, sel: all(TT_PARTS) })).toContain('시간표가 아직 없어요');
    expect(buildTimetableSheetHTML({ ...tt, periods: ['<b>'], sel: { write: true } })).toContain('&lt;b&gt;');
  });
  it('이번 주 시간표에서 두 번 넘게 나오는 과목의 횟수를 묻는다', () => {
    const html = buildTimetableSheetHTML({ ...tt, sel: { week: true } });
    expect(html).toContain('국어</b> 시간은 몇 번');
    expect(html).not.toContain('음악</b> 시간은 몇 번');
  });
});

describe('감정 활동지', () => {
  const emo = { emotions: EMOTIONS, date, dot: true };
  it('상황은 날마다 네 가지이고, 보기 네 개에는 들 법한 마음이 꼭 들어 있다', () => {
    const today = situationsOn('2026-10-12');
    expect(today).toHaveLength(4);
    expect(situationsOn('2026-10-12')).toEqual(today);
    const kinds = EMOTIONS.map((e) => e.k);
    for (const s of SITUATIONS) {
      expect(s.likely.every((k) => kinds.includes(k as never))).toBe(true);
      const faces = facesFor(s.likely, kinds, s.text);
      expect(faces).toHaveLength(4);
      expect(new Set(faces).size).toBe(4);
      expect(s.likely.every((k) => faces.includes(k))).toBe(true);
    }
  });
  it('고른 쪽만 만들고, 학생 이름은 싣지 않는다', () => {
    const html = buildEmotionSheetHTML({ ...emo, sel: all(EMO_PARTS) });
    expect(pagesIn(html)).toBe(5);
    expect(html).toContain('/img/emotion/joy.webp');
    expect(pagesIn(buildEmotionSheetHTML({ ...emo, sel: { care: true } }))).toBe(1);
    expect(buildEmotionSheetHTML({ ...emo, sel: {} })).toContain('하나 이상 골라');
  });
});
