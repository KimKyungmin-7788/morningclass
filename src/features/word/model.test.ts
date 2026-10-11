import { describe, expect, it } from 'vitest';
import { BASE_WORDS, bestHit, emptyBook, parseDictExamples, parseDictSearch, weekKey, weekdayIndex, wordOfDay, wordPool } from './model';

describe('오늘의 낱말', () => {
  it('주의 열쇠는 그 주 월요일이고, 일요일은 지난 주에 든다', () => {
    expect(weekKey(new Date(2026, 9, 12))).toBe('20261012');       // 월요일
    expect(weekKey(new Date(2026, 9, 16))).toBe('20261012');       // 금요일
    expect(weekKey(new Date(2026, 9, 11))).toBe('20261005');       // 일요일
    expect([11, 12, 16, 17].map((d) => weekdayIndex(new Date(2026, 9, d)))).toEqual([-1, 0, 4, -1]);
  });

  it('기본 목록은 단계마다 있고, 빠진 칸이 없다', () => {
    for (const list of Object.values(BASE_WORDS)) {
      expect(list.length).toBeGreaterThanOrEqual(10);
      expect(list.every((w) => w.word && w.meaning && w.sentence.includes(w.word))).toBe(true);
    }
  });

  it('날마다 차례로 하나씩, 같은 날에는 같은 낱말이 나온다', () => {
    const book = emptyBook();
    const mon = new Date(2026, 9, 12);
    expect(wordOfDay(book, mon)).toBe(wordOfDay(book, new Date(2026, 9, 12, 15)));
    const tue = wordOfDay(book, new Date(2026, 9, 13));
    expect(tue).not.toBe(wordOfDay(book, mon));
    const pool = wordPool(book);
    expect((pool.indexOf(tue!) - pool.indexOf(wordOfDay(book, mon)!) + pool.length) % pool.length).toBe(1);
    expect(BASE_WORDS.hard).toContain(wordOfDay({ ...book, level: 'hard' }, mon));
  });

  it('선생님이 그 주 요일에 정한 낱말이 먼저 나오고, 추가한 낱말은 묶음에 들어간다', () => {
    const mine = { word: '소풍', meaning: '밖에 나가 노는 일', sentence: '내일 소풍을 가요.' };
    const book = { ...emptyBook(), weeks: { 20261012: [null, mine, { word: ' ', meaning: '', sentence: '' }] }, custom: [mine, { word: '', meaning: '', sentence: '' }] };
    expect(wordOfDay(book, new Date(2026, 9, 13))).toBe(mine);     // 화요일에 정해 둠
    expect(BASE_WORDS.easy.concat(mine)).toContain(wordOfDay(book, new Date(2026, 9, 12)));   // 월요일은 비어 있어 묶음에서
    expect(wordOfDay(book, new Date(2026, 9, 14))?.word.trim()).not.toBe('');                 // 낱말이 빈 칸은 정하지 않은 것으로 본다
    expect(wordOfDay(book, new Date(2026, 9, 20))).not.toBe(null);                            // 다음 주에는 정한 것이 없다
    expect(wordPool(book)).toHaveLength(BASE_WORDS.easy.length + 1);
  });

  it('사전 응답에서 뜻풀이와 예문을 읽는다', () => {
    const search = `<channel><total>2</total>
      <item><target_code>111</target_code><word>학교</word><pos>명사</pos><word_grade>초급</word_grade>
        <sense><sense_order>1</sense_order><definition><![CDATA[일정한 목적, 교과 과정에 의하여 학생을 가르치는 기관.]]></definition></sense>
        <sense><sense_order>2</sense_order><definition>둘째 뜻</definition></sense></item>
      <item><target_code>222</target_code><word>학교생활</word><pos>명사</pos><word_grade></word_grade><sense><definition>학교에서 하는 생활.</definition></sense></item>
    </channel>`;
    const hits = parseDictSearch(search);
    expect(hits.map((h) => [h.code, h.word, h.grade])).toEqual([['111', '학교', '초급'], ['222', '학교생활', '']]);
    expect(hits[0].definition).toBe('일정한 목적, 교과 과정에 의하여 학생을 가르치는 기관.');
    expect(bestHit(hits, '학교')?.code).toBe('111');
    expect(bestHit(hits, '없는말')?.code).toBe('111');               // 똑같은 낱말이 없으면 쉬운 등급부터
    expect(bestHit([], '학교')).toBeNull();
    const view = `<item><word_info><sense_info>
      <example_info><type>구</type><example>학교 운동장.</example></example_info>
      <example_info><type>문장</type><example>나는 매일 학교에 간다.</example></example_info>
      <example_info><type>대화</type><example>가: 어디 가? 나: 학교.</example></example_info>
    </sense_info></word_info></item>`;
    expect(parseDictExamples(view)).toEqual(['나는 매일 학교에 간다.', '학교 운동장.']);
    expect(parseDictSearch('<error><error_code>020</error_code></error>')).toEqual([]);
  });
});
