// 오늘의 낱말 규칙 (화면과 무관한 계산).
// 낱말은 단계(초급 · 중급 · 고급)별 기본 목록에서 날마다 하나씩 돌아가며 나오고,
// 선생님이 그 주의 요일에 낱말을 정해 두면 그 낱말이 먼저 나온다. 목록에 없는 낱말은 직접 추가한다.

export type WordLevel = 'easy' | 'mid' | 'hard';
export const WORD_LEVELS: { id: WordLevel; label: string }[] = [{ id: 'easy', label: '초급' }, { id: 'mid', label: '중급' }, { id: 'hard', label: '고급' }];

export interface WordEntry { word: string; meaning: string; sentence: string }

/** 학급별로 저장하는 낱말 설정 */
export interface WordBook {
  level: WordLevel;
  /** 주(그 주 월요일 'YYYYMMDD')마다 월~금에 정해 둔 낱말. 빈 칸은 기본 목록에서 나온다 */
  weeks: Record<string, (WordEntry | null)[]>;
  /** 선생님이 추가한 낱말 — 기본 목록과 함께 돌아가며 나온다 */
  custom: WordEntry[];
}
export const emptyBook = (): WordBook => ({ level: 'easy', weeks: {}, custom: [] });

/**
 * 기본 낱말 목록 (임시). 선생님이 정한 초급 · 중급 · 고급 목록을 받으면 이 자리를 바꾼다.
 */
export const BASE_WORDS: Record<WordLevel, WordEntry[]> = {
  easy: [
    { word: '물', meaning: '마시는 것', sentence: '목이 말라서 물을 마셔요.' },
    { word: '밥', meaning: '쌀로 지은 먹는 것', sentence: '점심에 밥을 먹어요.' },
    { word: '손', meaning: '물건을 잡는 몸의 한 부분', sentence: '밥 먹기 전에 손을 씻어요.' },
    { word: '신발', meaning: '발에 신는 것', sentence: '밖에 나갈 때 신발을 신어요.' },
    { word: '가방', meaning: '물건을 넣어 들고 다니는 것', sentence: '가방에 책을 넣어요.' },
    { word: '우산', meaning: '비를 막으려고 쓰는 것', sentence: '비가 와서 우산을 써요.' },
    { word: '친구', meaning: '가깝게 지내는 사람', sentence: '친구와 같이 놀아요.' },
    { word: '학교', meaning: '공부하러 가는 곳', sentence: '아침에 학교에 가요.' },
    { word: '화장실', meaning: '볼일을 보고 손을 씻는 곳', sentence: '화장실에 다녀올게요.' },
    { word: '인사', meaning: '만나거나 헤어질 때 하는 말과 몸짓', sentence: '선생님께 인사를 해요.' },
  ],
  mid: [
    { word: '약속', meaning: '하기로 정한 일', sentence: '친구와 한 약속을 지켜요.' },
    { word: '차례', meaning: '순서대로 돌아오는 내 순서', sentence: '줄을 서서 차례를 기다려요.' },
    { word: '준비물', meaning: '미리 챙겨야 하는 물건', sentence: '내일 준비물은 색연필이에요.' },
    { word: '정류장', meaning: '버스를 타고 내리는 곳', sentence: '정류장에서 버스를 기다려요.' },
    { word: '횡단보도', meaning: '길을 건너는 곳', sentence: '초록불에 횡단보도를 건너요.' },
    { word: '영수증', meaning: '물건값을 냈다고 적어 주는 종이', sentence: '물건을 사고 영수증을 받아요.' },
    { word: '도움', meaning: '남을 거들어 주는 일', sentence: '어려울 때 도움을 청해요.' },
    { word: '정리', meaning: '물건을 제자리에 두는 일', sentence: '수업이 끝나면 책상을 정리해요.' },
    { word: '계산', meaning: '값을 치르는 일', sentence: '계산대에서 계산을 해요.' },
    { word: '시간표', meaning: '할 일을 시간 순서로 적은 표', sentence: '시간표를 보고 교과서를 꺼내요.' },
  ],
  hard: [
    { word: '예약', meaning: '쓸 날짜와 시간을 미리 정해 두는 일', sentence: '병원에 가려고 예약을 했어요.' },
    { word: '환승', meaning: '다른 버스나 지하철로 갈아타는 일', sentence: '지하철에서 버스로 환승해요.' },
    { word: '유통기한', meaning: '먹을 것을 팔 수 있는 마지막 날', sentence: '우유를 살 때 유통기한을 확인해요.' },
    { word: '분리배출', meaning: '쓰레기를 종류별로 나누어 버리는 일', sentence: '페트병은 분리배출을 해요.' },
    { word: '신분증', meaning: '내가 누구인지 알려 주는 카드', sentence: '은행에 갈 때 신분증을 챙겨요.' },
    { word: '비밀번호', meaning: '나만 아는 숫자나 글자', sentence: '비밀번호는 다른 사람에게 알려 주지 않아요.' },
    { word: '출근', meaning: '일하러 일터에 가는 일', sentence: '아버지는 아침에 출근을 해요.' },
    { word: '면접', meaning: '일할 사람을 뽑으려고 만나서 묻고 답하는 일', sentence: '면접에서 또박또박 대답해요.' },
    { word: '안내문', meaning: '알릴 내용을 적은 글', sentence: '안내문을 읽고 준비물을 챙겨요.' },
    { word: '응급실', meaning: '갑자기 아플 때 가는 병원의 방', sentence: '많이 다치면 응급실에 가요.' },
  ],
};

const two = (n: number) => String(n).padStart(2, '0');
/** 그 날짜가 든 주의 월요일 'YYYYMMDD' (일요일은 지난 주로 본다) */
export function weekKey(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}`;
}
/** 월요일 = 0 … 금요일 = 4, 주말은 -1 */
export const weekdayIndex = (date: Date) => (date.getDay() >= 1 && date.getDay() <= 5 ? date.getDay() - 1 : -1);

/** 돌아가며 나오는 낱말 묶음: 고른 단계의 기본 목록 + 선생님이 추가한 낱말 */
export const wordPool = (book: WordBook): WordEntry[] => [...BASE_WORDS[book.level], ...book.custom.filter((w) => w.word.trim())];

/**
 * 그날의 낱말. 선생님이 그 주 그 요일에 정해 둔 낱말이 있으면 그것,
 * 없으면 낱말 묶음에서 날마다 하나씩 차례로 (같은 날에는 언제 열어도 같은 낱말).
 */
export function wordOfDay(book: WordBook, date: Date): WordEntry | null {
  const set = book.weeks[weekKey(date)]?.[weekdayIndex(date)];
  if (set?.word.trim()) return set;
  const pool = wordPool(book);
  if (!pool.length) return null;
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return pool[day % pool.length];
}

// ── 한국어기초사전 응답(XML) 읽기 ──
const text = (xml: string, tag: string) => {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim() : '';
};
const blocks = (xml: string, tag: string) => xml.match(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, 'g')) ?? [];

export interface DictHit { code: string; word: string; pos: string; grade: string; definition: string }
/** 낱말 검색 결과: 표제어마다 첫 번째 뜻풀이 */
export function parseDictSearch(xml: string): DictHit[] {
  return blocks(xml, 'item').map((it) => ({
    code: text(it, 'target_code'), word: text(it, 'word'), pos: text(it, 'pos'), grade: text(it, 'word_grade'), definition: text(blocks(it, 'sense')[0] ?? '', 'definition'),
  })).filter((h) => h.word);
}
/** 낱말 하나의 자세한 내용에서 예문만: 문장으로 된 것을 먼저, 없으면 구(짧은 말) */
export function parseDictExamples(xml: string): string[] {
  const all = blocks(xml, 'example_info').map((ex) => ({ type: text(ex, 'type'), example: text(ex, 'example') })).filter((e) => e.example);
  return [...all.filter((e) => e.type === '문장'), ...all.filter((e) => e.type !== '문장' && e.type !== '대화')].map((e) => e.example);
}
/** 검색 결과에서 가장 알맞은 것: 낱말이 똑같은 것 가운데 쉬운 등급부터 */
export function bestHit(hits: DictHit[], word: string): DictHit | null {
  const rank = (g: string) => (g === '초급' ? 0 : g === '중급' ? 1 : g === '고급' ? 2 : 3);
  const same = hits.filter((h) => h.word === word.trim() && h.definition);
  return [...(same.length ? same : hits.filter((h) => h.definition))].sort((a, b) => rank(a.grade) - rank(b.grade))[0] ?? null;
}
