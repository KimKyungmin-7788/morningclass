// 오늘의 어휘 규칙 (화면과 무관한 계산).
// 어휘는 단계(가 · 나 · 다)별 기본 목록에서 주마다 한 주제씩, 날마다 하나씩 나온다.
// 선생님이 그 주의 요일에 어휘를 정해 두면 그 어휘가 먼저 나온다 — 계절 · 국경일 · 기념일에 어울리는 어휘는 그때 목록에서 권한다.
// 목록에 없는 어휘는 직접 추가한다.
import { lunarDays } from '@/core/data/holidays';
import { VOCAB_EVENTS, VOCAB_TOPICS, VOCAB_WORDS, type VocabBand } from './vocabData';

/** 저장되는 값은 그대로 두고(easy · mid · hard) 화면에는 가 · 나 · 다로 보여 준다 */
export type WordLevel = 'easy' | 'mid' | 'hard';
export const WORD_LEVELS: { id: WordLevel; label: string; desc: string; bands: VocabBand[] }[] = [
  { id: 'easy', label: '가', desc: '6~7세', bands: ['preschool'] },
  { id: 'mid', label: '나', desc: '초등 1~2학년', bands: ['grade12'] },
  { id: 'hard', label: '다', desc: '초등 3~4학년', bands: ['grade34'] },
];
export const levelOf = (id: WordLevel) => WORD_LEVELS.find((l) => l.id === id) ?? WORD_LEVELS[0];

export interface WordEntry { word: string; meaning: string; sentence: string }
/** 기본 목록의 어휘 — 주제와 출처가 함께 있다 */
export interface VocabEntry extends WordEntry {
  topic: string;
  band: VocabBand;
  /** 국립국어원 어휘 등급 1~4. 0 은 그 목록(1~4등급)에서 찾지 못해 편집에서 더한 어휘 */
  grade: number;
  /** 원본의 한자 · 동형어 정보와 뜻풀이가 어긋나 보여 사전 대조가 필요한 어휘 */
  review: boolean;
}

/** 학급별로 저장하는 어휘 설정. 정해 둔 어휘와 추가한 어휘는 단계마다 따로 둔다 */
export interface WordBook {
  level: WordLevel;
  /** 단계별로, 주(그 주 월요일 'YYYYMMDD')마다 월~금에 정해 둔 어휘. 빈 칸은 기본 목록에서 나온다 */
  weeks: Record<WordLevel, Record<string, (WordEntry | null)[]>>;
  /** 단계별로 선생님이 추가한 어휘 — 금요일마다 차례로 나온다 */
  custom: Record<WordLevel, WordEntry[]>;
}
export const emptyBook = (): WordBook => ({ level: 'easy', weeks: { easy: {}, mid: {}, hard: {} }, custom: { easy: [], mid: [], hard: [] } });
/**
 * 저장된 설정을 지금 모양으로 맞춘다. 예전에는 정해 둔 어휘 · 추가한 어휘가 단계 구분 없이 하나였다 —
 * 그때 것은 저장할 때 고른 단계의 것으로 옮긴다.
 */
export function normalizeBook(saved: unknown): WordBook {
  const book = emptyBook();
  const s = (saved ?? {}) as { level?: WordLevel; weeks?: Record<string, unknown>; custom?: unknown };
  if (WORD_LEVELS.some((l) => l.id === s.level)) book.level = s.level!;
  for (const [k, v] of Object.entries(s.weeks ?? {})) {
    if (k in book.weeks) Object.assign(book.weeks[k as WordLevel], v);
    else if (Array.isArray(v)) book.weeks[book.level][k] = v as (WordEntry | null)[];
  }
  if (Array.isArray(s.custom)) book.custom[book.level] = s.custom as WordEntry[];
  else for (const l of WORD_LEVELS) { const list = (s.custom as Record<string, unknown> | undefined)?.[l.id]; if (Array.isArray(list)) book.custom[l.id] = list as WordEntry[]; }
  return book;
}

// ── 기본 목록 (vocabData: 단계별 어휘 학습 콘텐츠 1,200개) ──
const ALL: VocabEntry[] = VOCAB_WORDS.map(([word, meaning, sentence, t, grade, review]) => ({ word, meaning, sentence, topic: VOCAB_TOPICS[t][1], band: VOCAB_TOPICS[t][0], grade, review: review === 1 }));
const inLevel = (level: WordLevel) => (w: VocabEntry) => levelOf(level).bands.includes(w.band);

export interface VocabTopic { name: string; band: VocabBand; words: VocabEntry[] }
/** 단계의 주제들 (주제마다 어휘 20개). 대상이 둘인 단계는 번갈아 놓아 쉬운 주제와 어려운 주제가 섞여 나오게 한다 */
function topicsOf(level: WordLevel): VocabTopic[] {
  const per = levelOf(level).bands.map((band) => VOCAB_TOPICS.filter(([b]) => b === band).map(([, name]) => ({ name, band, words: ALL.filter((w) => w.band === band && w.topic === name) })));
  return Array.from({ length: Math.max(...per.map((p) => p.length)) }, (_, i) => per.flatMap((p) => (p[i] ? [p[i]] : []))).flat();
}
export const TOPICS = Object.fromEntries(WORD_LEVELS.map((l) => [l.id, topicsOf(l.id)])) as Record<WordLevel, VocabTopic[]>;
export const BASE_WORDS = Object.fromEntries(WORD_LEVELS.map((l) => [l.id, TOPICS[l.id].flatMap((t) => t.words)])) as Record<WordLevel, VocabEntry[]>;

/** 한 주에 익히는 어휘 수 (월~금) */
const WEEK = 5;
/** 주 묶음: 한 주에 한 주제의 어휘 5개. 주제를 한 바퀴 돈 다음 같은 주제의 다음 5개로 넘어간다 */
function bundlesOf(level: WordLevel): VocabEntry[][] {
  const topics = TOPICS[level];
  const rounds = Math.max(...topics.map((t) => Math.ceil(t.words.length / WEEK)));
  return Array.from({ length: rounds }, (_, r) => topics.map((t) => t.words.slice(r * WEEK, (r + 1) * WEEK)).filter((b) => b.length)).flat();
}
const BUNDLES = Object.fromEntries(WORD_LEVELS.map((l) => [l.id, bundlesOf(l.id)])) as Record<WordLevel, VocabEntry[][]>;

const BY_TEXT = new Map(ALL.map((w) => [`${w.word}\n${w.meaning}`, w]));
/** 기본 목록에 있는 어휘인지 (표기와 뜻이 같은 것). 선생님이 목록에서 골라 넣은 어휘의 출처를 찾는 데 쓴다 */
export const findVocab = (w: WordEntry): VocabEntry | null => BY_TEXT.get(`${w.word.trim()}\n${w.meaning.trim()}`) ?? null;

const two = (n: number) => String(n).padStart(2, '0');
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayNo = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
/** 그 날짜가 든 주의 월요일 (일요일은 지난 주로 본다) */
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));
/** 그 날짜가 든 주의 월요일 'YYYYMMDD' (일요일은 지난 주로 본다) */
export function weekKey(date: Date): string {
  const d = mondayOf(date);
  return `${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}`;
}
/** 월요일 = 0 … 금요일 = 4, 주말은 -1 */
export const weekdayIndex = (date: Date) => (date.getDay() >= 1 && date.getDay() <= 5 ? date.getDay() - 1 : -1);
/** 몇 번째 주인지 (1970년 1월 5일 월요일이 든 주 = 0) */
const weekNo = (date: Date) => Math.floor((dayNo(mondayOf(date)) - 4) / 7);

// ── 시기 · 행사 (계기 교육) ──
export interface VocabEvent {
  id: string; name: string;
  /** season 계절 · national_day 국경일 · commemoration 기념일 · traditional_holiday 명절 · cultural_event 문화 · school_event 학교 행사 · personal_event 개인 행사 */
  kind: string;
  months?: number[];
  /** 날짜가 정해진 날이면 그 해의 양력 날짜. 학교마다 다른 행사 · 계절은 null */
  dateIn: (year: number) => Date | null;
  words: VocabEntry[];
}
export const EVENTS: VocabEvent[] = VOCAB_EVENTS.map((e) => ({
  id: e.id, name: e.name, kind: e.kind, months: e.months, words: e.words.map((i) => ALL[i]),
  dateIn: (y: number) => {
    if (e.on) return new Date(y, e.on[0] - 1, e.on[1]);
    // 음력 명절은 해마다 확인한 설날 · 추석 날짜로만 정한다 (정월대보름은 설날 14일 뒤). 표에 없는 해는 정하지 않는다
    const lunar = e.lunar ? lunarDays(y) : null;
    if (!lunar) return null;
    return e.id === 'chuseok' ? lunar.chuseok : e.id === 'seollal' ? lunar.seol : e.id === 'daeboreum' ? addDays(lunar.seol, 14) : null;
  },
}));
/** 그 단계에서 그 시기에 권하는 어휘 */
export const eventWords = (ev: VocabEvent, level: WordLevel) => ev.words.filter(inLevel(level));

/** 그 주(또는 앞으로 3주 안)에 권할 만한 시기: 지금 계절 · 달, 다가오는 국경일 · 기념일 · 명절 */
export function seasonalEvents(date: Date): VocabEvent[] {
  const from = mondayOf(date);
  return EVENTS.filter((e) => {
    if (e.months) return e.months.includes(from.getMonth() + 1);
    return [from.getFullYear(), from.getFullYear() + 1].some((y) => { const on = e.dateIn(y); return !!on && dayNo(on) - dayNo(from) >= 0 && dayNo(on) - dayNo(from) <= 20; });
  });
}

/** 그날의 어휘가 어디서 나왔는지 */
export interface WordPick {
  entry: WordEntry;
  /** set 선생님이 정함 · custom 선생님이 추가한 어휘 · theme 이번 주 주제 */
  from: 'set' | 'custom' | 'theme';
  /** 이번 주 주제 */
  topic?: string;
}

/**
 * 그날의 어휘와 나온 까닭 (같은 날에는 언제 열어도 같은 어휘).
 *  1. 선생님이 그 단계의 그 주 그 요일에 정해 둔 어휘
 *  2. 금요일은 선생님이 추가한 어휘가 있으면 그 가운데 하나
 *  3. 이번 주 주제의 어휘 (월~금 차례로, 주말에는 금요일 것)
 */
export function pickOfDay(book: WordBook, date: Date): WordPick | null {
  const day = weekdayIndex(date);
  const set = book.weeks[book.level]?.[weekKey(date)]?.[day];
  if (set?.word.trim()) return { entry: set, from: 'set' };
  const week = weekNo(date);
  const at = day < 0 ? WEEK - 1 : day;
  const custom = (book.custom[book.level] ?? []).filter((w) => w.word.trim());
  if (custom.length && at === WEEK - 1) return { entry: custom[week % custom.length], from: 'custom' };
  const bundles = BUNDLES[book.level];
  const bundle = bundles[week % bundles.length];
  const entry = bundle[at % bundle.length];
  return { entry, from: 'theme', topic: entry.topic };
}
export const wordOfDay = (book: WordBook, date: Date): WordEntry | null => pickOfDay(book, date)?.entry ?? null;

/** 그 날짜가 든 주의 월~금 어휘 (학습지의 낱말 카드 · 이번 주 모아 쓰기에 쓴다. 같은 낱말은 한 번만) */
export function wordsOfWeek(book: WordBook, date: Date): WordEntry[] {
  const monday = mondayOf(date);
  const out: WordEntry[] = [];
  for (let i = 0; i < WEEK; i += 1) {
    const w = wordOfDay(book, addDays(monday, i));
    if (w && !out.some((x) => x.word === w.word)) out.push(w);
  }
  return out;
}

// ── 출처 ──
/** 단계에 쓰는 어휘 (자료에는 초등 5~6학년 300개도 있지만 단계에 넣지 않았다) */
const USED = WORD_LEVELS.flatMap((l) => BASE_WORDS[l.id]);
/** 기본 목록의 수 (출처 안내에 쓴다) */
export const VOCAB_STATS = {
  total: USED.length,
  topics: WORD_LEVELS.reduce((n, l) => n + TOPICS[l.id].length, 0),
  /** 국립국어원 1~4등급 목록에 있는 어휘 · 목록에 없어 더한 어휘 */
  listed: USED.filter((w) => w.grade > 0).length,
  added: USED.filter((w) => !w.grade).length,
};
export const VOCAB_SOURCE = {
  title: '국립국어원 「국어 기초 어휘 선정 및 어휘 등급화 목록」',
  note: '2024년 공개 · 공공누리 제1유형',
  url: 'https://www.korean.go.kr/front/reportData/reportDataView.do?report_seq=1160',
};
/** 국립국어원이 밝힌 등급별 나이 · 학년 */
const GRADES = ['', '1등급(4~6세)', '2등급(7~8세 · 초등 1~2학년)', '3등급(9~10세 · 초등 3~4학년)', '4등급(11~12세 · 초등 5~6학년)'];
const BAND_GRADE: Record<VocabBand, number> = { preschool: 1, grade12: 2, grade34: 3, grade56: 4 };
/** 이 어휘의 근거 한 줄 */
export function sourceLine(w: VocabEntry): string {
  if (!w.grade) return '국립국어원 1~4등급 목록에는 없어, 주제에 맞춰 더한 어휘예요';
  const base = `국립국어원 ${GRADES[w.grade]} 어휘`;
  const early = w.grade > BAND_GRADE[w.band] ? ' — 주제에 맞춰 한 단계 일찍 넣었어요' : '';
  return `${base}${early}${w.review ? ' · 원본의 뜻 정보가 어긋나 보여 사전과 견주어 보기를 권해요' : ''}`;
}

/** 한글 한 글자의 [첫소리, 가운뎃소리, 받침] 번호. 한글이 아니면 null */
const jamo = (ch: string): [number, number, number] | null => {
  const c = (ch ?? '').charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 ? [Math.floor(c / 588), Math.floor((c % 588) / 28), c % 28] : null;
};
/** 줄기의 끝 글자가 바뀌는 모양: 가운뎃소리 → 바뀐 가운뎃소리 (하 → 해, 시 → 셔, 추 → 춰, 오 → 와, 크 → 커, 쁘 → 빠) */
const TURNS: Record<number, number[]> = { 0: [1], 20: [6], 13: [14], 8: [9], 18: [4, 0] };
/** 어절이 그 줄기로 시작하는지 (받침이 바뀌거나 소리가 줄어든 것도 본다) */
function startsWithStem(part: string, stem: string): boolean {
  const head = stem.slice(0, -1);
  const end = jamo(stem[stem.length - 1]);
  if (!end) return false;
  if (part.startsWith(head)) {
    const next = jamo(part[head.length]);
    // 받침만 달라진 것(신나 → 신난, 덥 → 더워) 또는 소리가 줄어든 것(마시 → 마셔)
    if (next && next[0] === end[0] && (next[1] === end[1] || (end[2] === 0 && TURNS[end[1]]?.includes(next[1])))) return true;
  }
  // '르'로 끝나는 줄기: 다르다 → 달라요, 부르다 → 불러요
  if (stem.endsWith('르') && head) {
    const before = jamo(head[head.length - 1]);
    const got = jamo(part[head.length - 1]);
    const next = jamo(part[head.length]);
    if (before && got && next && part.startsWith(head.slice(0, -1)) && got[0] === before[0] && got[1] === before[1] && got[2] === 8 && next[0] === 5) return true;
  }
  return false;
}

/**
 * 문장에서 낱말이 쓰인 자리 [시작, 끝). 낱말이 그대로 있으면 그 자리,
 * '-다'로 끝나는 말은 모양이 바뀌므로(웃다 → 웃어요, 덥다 → 더워요, 좋아하다 → 좋아해요) 줄기가 같은 어절을 찾는다. 못 찾으면 null.
 */
export function wordSpan(word: string, sentence: string): [number, number] | null {
  const w = word.trim();
  if (!w) return null;
  const at = sentence.indexOf(w);
  if (at >= 0) return [at, at + w.length];
  if (!w.endsWith('다') || w.length < 2) return null;
  const stem = w.slice(0, -1);
  const parts = sentence.split(' ');
  // 줄기가 그대로 든 어절을 먼저 찾고(길다: "기린의 목이 길어요"의 '길어요'), 없으면 모양이 바뀐 어절을 찾는다
  for (const same of [(p: string) => p.startsWith(stem), (p: string) => startsWithStem(p, stem)]) {
    let from = 0;
    for (const part of parts) {
      if (same(part)) return [from, from + part.replace(/[.,!?…~]+$/, '').length];
      from += part.length + 1;
    }
  }
  return null;
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

// ── 쓰기 화면 ──
/** 글자 하나의 너비(글자 크기 = 1). 한글은 1, 영문 · 숫자 · 문장부호는 좁고, 띄어쓰기는 더 좁다 */
const widthOf = (s: string) => [...s].reduce((n, ch) => n + (ch === ' ' ? 0.3 : /[\x21-\x7e]/.test(ch) ? 0.6 : 1), 0);

/**
 * 따라 쓸 글을 칸(w × h)에 가장 크게 넣는 줄 나눔과 글자 크기(px).
 * 줄은 띄어쓰기에서만 바꾼다 — 긴 문장은 여러 줄로 나눠 글자를 키운다.
 */
export function fitText(text: string, w: number, h: number, lineHeight = 1.3): { lines: string[]; size: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length || w <= 0 || h <= 0) return { lines: words.length ? [words.join(' ')] : [], size: 0 };
  const wrap = (limit: number) => {
    const lines: string[] = [];
    for (const word of words) {
      const last = lines[lines.length - 1];
      if (last !== undefined && widthOf(`${last} ${word}`) <= limit) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    return lines;
  };
  const longest = Math.max(...words.map(widthOf));
  const total = widthOf(words.join(' '));
  let best = { lines: [words.join(' ')], size: 0 };
  for (let limit = longest; limit <= total + 0.5; limit += 0.5) {
    const lines = wrap(limit);
    const size = Math.min((w * 0.9) / Math.max(...lines.map(widthOf)), (h * 0.88) / (lines.length * lineHeight));
    if (size > best.size + 0.01) best = { lines, size };
  }
  return { lines: best.lines, size: Math.floor(best.size) };
}

/** 다같이 써보기에서 한 화면에 나누는 최대 인원. 넘으면 모둠으로 나눠 차례로 쓴다 */
export const WRITE_PAGE = 12;
/** 학생을 한 화면 분량씩 모둠으로 나눈다 */
export function writeGroups<T>(list: T[], size = WRITE_PAGE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}
/** 인원에 따른 칸의 가로 개수 (전자칠판 가로 화면 기준) */
export const writeColumns = (n: number) => (n <= 3 ? Math.max(1, n) : n <= 4 ? 2 : n <= 6 ? 3 : 4);
/** 칸마다 주는 펜 색 */
export const WRITE_INKS = ['#1971C2', '#E8590C', '#2F9E44', '#7048E8', '#C2255C', '#0C8599', '#B08900', '#495057'];
