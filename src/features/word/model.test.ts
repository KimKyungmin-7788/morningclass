import { describe, expect, it } from 'vitest';
import { wordsOfWeek, fitText, writeColumns, writeGroups, BASE_WORDS, EVENTS, TOPICS, VOCAB_STATS, WORD_LEVELS, bestHit, emptyBook, eventWords, findVocab, parseDictExamples, parseDictSearch, pickOfDay, seasonalEvents, sourceLine, weekKey, weekdayIndex, wordOfDay, wordSpan } from './model';

describe('오늘의 어휘', () => {
  it('주의 열쇠는 그 주 월요일이고, 일요일은 지난 주에 든다', () => {
    expect(weekKey(new Date(2026, 9, 12))).toBe('20261012');       // 월요일
    expect(weekKey(new Date(2026, 9, 16))).toBe('20261012');       // 금요일
    expect(weekKey(new Date(2026, 9, 11))).toBe('20261005');       // 일요일
    expect([11, 12, 16, 17].map((d) => weekdayIndex(new Date(2026, 9, d)))).toEqual([-1, 0, 4, -1]);
  });

  it('기본 목록은 가 · 나 · 다 300개씩이고 주제마다 20개씩, 빠진 칸이 없다', () => {
    expect(WORD_LEVELS.map((l) => l.label)).toEqual(['가', '나', '다']);
    expect([BASE_WORDS.easy.length, BASE_WORDS.mid.length, BASE_WORDS.hard.length]).toEqual([300, 300, 300]);
    expect(VOCAB_STATS).toMatchObject({ total: 900, topics: 45 });
    expect(VOCAB_STATS.listed + VOCAB_STATS.added).toBe(900);
    for (const level of WORD_LEVELS) {
      expect(TOPICS[level.id].every((t) => t.words.length === 20)).toBe(true);
      expect(BASE_WORDS[level.id].every((w) => w.word && w.meaning && w.sentence)).toBe(true);
    }
    expect(TOPICS.hard.every((t) => t.band === 'grade34')).toBe(true);   // 다 단계는 초등 3~4학년까지
  });

  it('한 주에는 한 주제의 어휘가 월~금 차례로 나오고, 다음 주에는 주제가 바뀐다', () => {
    const book = emptyBook();
    const days = [19, 20, 21, 22, 23].map((d) => pickOfDay(book, new Date(2026, 9, d))!);   // 2026년 10월 19~23일
    expect(new Set(days.map((p) => p.entry.word)).size).toBe(5);
    expect(new Set(days.map((p) => p.topic)).size).toBe(1);
    expect(days.every((p) => p.from === 'theme' && BASE_WORDS.easy.includes(findVocab(p.entry)!))).toBe(true);
    expect(wordOfDay(book, new Date(2026, 9, 19))).toBe(wordOfDay(book, new Date(2026, 9, 19, 15)));   // 같은 날에는 같은 어휘
    expect(wordOfDay(book, new Date(2026, 9, 24))).toBe(days[4].entry);                              // 주말에는 금요일 것
    expect(pickOfDay(book, new Date(2026, 9, 26))!.topic).not.toBe(days[0].topic);
    expect(BASE_WORDS.hard).toContain(wordOfDay({ ...book, level: 'hard' }, new Date(2026, 9, 19)));
  });

  it('시기 · 행사마다 단계별로 권하는 어휘가 있고, 날짜는 확인한 것만 쓴다', () => {
    const hangul = EVENTS.find((e) => e.id === 'hangul_day')!;
    expect(eventWords(hangul, 'easy')[0].word).toBe('한글');
    expect(eventWords(hangul, 'hard').every((w) => BASE_WORDS.hard.includes(w))).toBe(true);
    expect(EVENTS).toHaveLength(34);
    for (const e of EVENTS) for (const l of WORD_LEVELS) expect(eventWords(e, l.id).length).toBeGreaterThan(0);
    expect(hangul.dateIn(2026)).toEqual(new Date(2026, 9, 9));
    expect(EVENTS.find((e) => e.id === 'chuseok')!.dateIn(2026)).toEqual(new Date(2026, 8, 25));
    expect(EVENTS.find((e) => e.id === 'chuseok')!.dateIn(2040)).toBeNull();                        // 음력 명절은 확인한 날짜가 있는 해에만
    expect(EVENTS.find((e) => e.id === 'daeboreum')!.dateIn(2026)).toEqual(new Date(2026, 2, 3));   // 설날(2월 17일) 14일 뒤
    expect(EVENTS.find((e) => e.id === 'sports_day')!.dateIn(2026)).toBeNull();                      // 학교마다 다른 행사는 날짜가 없다
    // 그 무렵에 권하는 시기: 9월 마지막 주에는 가을 · 독서의 달 · 개천절 · 한글날, 3주 넘게 남은 날은 아직 권하지 않는다
    const near = seasonalEvents(new Date(2026, 8, 30)).map((e) => e.id);
    expect(near).toEqual(expect.arrayContaining(['autumn', 'reading_month', 'national_foundation_day', 'hangul_day']));
    expect(near).not.toContain('christmas');
    expect(seasonalEvents(new Date(2026, 11, 28)).map((e) => e.id)).toContain('new_year');           // 해가 바뀌는 주
  });

  it('선생님이 그 주 요일에 정한 어휘가 가장 먼저 나오고, 추가한 어휘는 금요일마다 차례로 나온다', () => {
    const mine = { word: '소풍', meaning: '밖에 나가 노는 일', sentence: '내일 소풍을 가요.' };
    const book = { ...emptyBook(), weeks: { 20261019: [null, mine, { word: ' ', meaning: '', sentence: '' }] }, custom: [mine, { word: '', meaning: '', sentence: '' }, { word: '급식', meaning: '', sentence: '' }] };
    expect(pickOfDay(book, new Date(2026, 9, 20))).toEqual({ entry: mine, from: 'set' });     // 화요일에 정해 둠
    expect(pickOfDay(book, new Date(2026, 9, 19))!.from).toBe('theme');                       // 월요일은 비어 있다
    expect(pickOfDay(book, new Date(2026, 9, 21))!.from).toBe('theme');                       // 낱말이 빈 칸은 정하지 않은 것으로 본다
    const fridays = [23, 30].map((d) => pickOfDay(book, new Date(2026, 9, d))!);
    expect(fridays.map((p) => p.from)).toEqual(['custom', 'custom']);
    expect(fridays.map((p) => p.entry.word).sort()).toEqual(['급식', '소풍']);                 // 빈 낱말은 빼고 차례로
  });

  it('어휘마다 근거를 밝힌다', () => {
    const find = (word: string, level: 'easy' | 'mid' | 'hard') => BASE_WORDS[level].find((w) => w.word === word)!;
    expect(sourceLine(find('눈', 'easy'))).toBe('국립국어원 1등급(4~6세 · 학교 가기 전) 어휘');
    expect(sourceLine(find('촉감', 'easy'))).toContain('3등급');                              // 원래 등급보다 일찍 넣은 어휘
    expect(sourceLine(find('촉감', 'easy'))).toContain('일찍');
    expect(sourceLine(find('감상', 'mid'))).toContain('사전과 견주어');                        // 원본 정보가 어긋나 보이는 어휘
    expect(BASE_WORDS.hard.filter((w) => !w.grade).every((w) => sourceLine(w).includes('목록에는 없어'))).toBe(true);
    expect(findVocab({ word: ' 눈 ', meaning: '빛과 모양을 보는 몸의 부분', sentence: '' })?.topic).toBe('몸과 감각');
    expect(findVocab({ word: '눈', meaning: '하늘에서 내리는 것', sentence: '' })).toBeNull();
  });

  it('문장에서 낱말이 쓰인 자리를 찾는다 (모양이 바뀐 말도)', () => {
    const cut = (w: string, s: string) => { const at = wordSpan(w, s); return at ? s.slice(at[0], at[1]) : null; };
    expect(cut('학교', '아침에 학교에 가요.')).toBe('학교');
    expect(cut('웃다', '재미있는 이야기에 웃어요.')).toBe('웃어요');
    expect(cut('신나다', '소풍을 가게 되어 신난다.')).toBe('신난다');
    expect(cut('덥다', '여름에는 날씨가 더워요.')).toBe('더워요');
    expect(cut('길다', '기린의 목이 길어요.')).toBe('길어요');               // 줄기가 그대로 든 어절이 먼저
    expect(cut('좋아하다', '나는 그림 그리기를 좋아해요.')).toBe('좋아해요');
    expect(cut('마시다', '물을 마셔요.')).toBe('마셔요');
    expect(cut('다르다', '두 꽃의 모양이 달라요.')).toBe('달라요');
    expect(cut('크다', '코끼리는 몸이 커요.')).toBe('커요');
    // 기본 목록의 문장에는 모두 그 낱말이 쓰인 자리가 있다
    expect(WORD_LEVELS.flatMap((l) => BASE_WORDS[l.id]).filter((w) => !wordSpan(w.word, w.sentence)).map((w) => w.word)).toEqual([]);
    expect(cut('학교', '공부하러 가요.')).toBeNull();
    expect(cut('', '공부하러 가요.')).toBeNull();
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

describe('쓰기 화면', () => {
  it('짧은 낱말은 한 줄로, 칸에 맞는 크기로 넣는다', () => {
    const { lines, size } = fitText('학교', 400, 300);
    expect(lines).toEqual(['학교']);
    expect(size).toBeGreaterThan(100);
    expect(size * 2).toBeLessThanOrEqual(400);
  });
  it('긴 문장은 띄어쓰기에서 줄을 바꿔 글자를 키운다', () => {
    const one = fitText('아침에 학교에 가요.', 2000, 100);
    expect(one.lines).toHaveLength(1);
    const many = fitText('비밀번호는 다른 사람에게 알려 주지 않아요.', 600, 600);
    expect(many.lines.length).toBeGreaterThan(1);
    expect(many.lines.join(' ')).toBe('비밀번호는 다른 사람에게 알려 주지 않아요.');
    expect(many.size).toBeGreaterThan(fitText('비밀번호는 다른 사람에게 알려 주지 않아요.', 600, 60).size);
  });
  it('낱말 안에서는 줄을 바꾸지 않는다', () => {
    expect(fitText('횡단보도', 100, 1000).lines).toEqual(['횡단보도']);
  });
  it('빈 글이나 크기가 없는 칸은 크기 0', () => {
    expect(fitText('', 100, 100).size).toBe(0);
    expect(fitText('학교', 0, 100).size).toBe(0);
  });
  it('12명씩 모둠으로 나누고, 인원에 맞춰 칸 수를 정한다', () => {
    expect(writeGroups([1, 2, 3])).toEqual([[1, 2, 3]]);
    expect(writeGroups(Array.from({ length: 14 }, (_, i) => i)).map((g) => g.length)).toEqual([12, 2]);
    expect([1, 2, 3, 4, 5, 6, 7, 12].map(writeColumns)).toEqual([1, 2, 3, 2, 3, 3, 4, 4]);
  });
});

describe('이번 주 낱말', () => {
  it('월~금의 낱말을 순서대로, 같은 낱말은 한 번만 모은다', () => {
    const book = { ...emptyBook(), weeks: { '20261012': [{ word: '가을', meaning: '', sentence: '' }, null, { word: '가을', meaning: '', sentence: '' }, null, null] } };
    const week = wordsOfWeek(book, new Date(2026, 9, 14));
    expect(week[0].word).toBe('가을');
    expect(week.filter((w) => w.word === '가을')).toHaveLength(1);
    expect(week.length).toBeGreaterThanOrEqual(3);
    expect(wordsOfWeek(book, new Date(2026, 9, 17))).toEqual(week);       // 토요일에 열어도 그 주
  });
});
