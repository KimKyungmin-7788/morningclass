// 오늘의 어휘 자료 만들기: 단계별 어휘 학습 콘텐츠(1,200개)에서 앱이 쓰는 것만 추려 src/features/word/vocabData.ts 를 만든다.
// 쓰는 법: node scripts/build-vocab.mjs <vocabulary-content 폴더>
//  · 어휘마다 표기 · 쉬운 뜻풀이 · 예문 · 주제 · 국립국어원 등급 · 감수 표시만 옮긴다 (확인 문제 · 채점 기준 등은 앱에서 쓰지 않는다)
//  · 시기 · 행사 연결은 어휘의 event_ids 가 정본이고, 차례는 event-links.json 에 적힌 순서를 따른다
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) { console.error('쓰는 법: node scripts/build-vocab.mjs <vocabulary-content 폴더>'); process.exit(1); }
const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));

const BANDS = ['preschool', 'grade12', 'grade34', 'grade56'];
const topics = [];   // [band, name]
const words = [];    // [word, meaning, sentence, topic, grade, review]
const linked = new Map();   // event id → 어휘 번호들
for (const band of BANDS) {
  const { lessons } = read(`${band}-300.json`);
  if (lessons.length !== 300) throw new Error(`${band}: 300개가 아니다 (${lessons.length})`);
  for (const l of lessons) {
    let t = topics.findIndex((x) => x[0] === band && x[1] === l.topic);
    if (t < 0) t = topics.push([band, l.topic]) - 1;
    for (const k of ['headword', 'child_definition', 'example']) if (!l[k] || l[k] !== l[k].trim()) throw new Error(`${l.lesson_id}: ${k} 가 비었거나 앞뒤에 빈칸이 있다`);
    const review = l.review_flags.includes('source_original_form_and_meaning_conflict') ? 1 : 0;
    const i = words.push([l.headword, l.child_definition, l.example, t, l.source_grade ?? 0, review]) - 1;
    for (const e of l.event_ids) linked.set(e, [...(linked.get(e) ?? []), i]);
  }
}
for (const [band, name] of topics) {
  const n = words.filter((w) => topics[w[3]][0] === band && topics[w[3]][1] === name).length;
  if (n !== 20) throw new Error(`${band} ${name}: 20개가 아니다 (${n})`);
}

const order = read('event-links.json');
const flat = (s) => s.replace(/\s/g, '');
const events = read('events.json').map((e) => {
  const listed = (order[e.id]?.words ?? '').split(' ').map(flat);
  const rank = (i) => { const at = listed.indexOf(flat(words[i][0])); return at < 0 ? listed.length : at; };
  const ids = [...(linked.get(e.id) ?? [])].sort((a, b) => rank(a) - rank(b) || a - b);
  if (!ids.length) throw new Error(`${e.id}: 이어진 어휘가 없다`);
  const r = e.date_rule;
  const when = r.type === 'fixed_solar' ? { on: [r.month, r.day] } : r.type === 'months' ? { months: r.months } : r.type === 'lunar' ? { lunar: [r.month, r.day] } : {};
  return { id: e.id, name: e.name, kind: e.category, ...when, lead: e.recommended_lead_days, words: ids };
});

const out = `// 자동으로 만든 파일 — 손으로 고치지 않는다 (scripts/build-vocab.mjs).
// 단계별 어휘 학습 콘텐츠 1,200개 (편집 초안 v1, 2026-10-11): 국립국어원 「국어 기초 어휘 선정 및 어휘 등급화 목록」(2024 공개, 공공누리 제1유형)의
// 1~4등급과 대조해 가려 뽑고, 쉬운 뜻풀이와 예문을 붙인 것. 등급 0 은 그 목록(1~4등급)에서 찾지 못해 편집에서 더한 어휘.

export type VocabBand = 'preschool' | 'grade12' | 'grade34' | 'grade56';
/** [대상, 주제 이름] — 주제마다 어휘 20개 */
export const VOCAB_TOPICS: [VocabBand, string][] = ${JSON.stringify(topics)};
/** [표기, 뜻, 예문, 주제 번호, 국립국어원 등급(0 = 목록 밖), 원본 대조 감수가 필요한지(1)] */
export type VocabRow = [string, string, string, number, number, number];
export const VOCAB_WORDS: VocabRow[] = [
${words.map((w) => JSON.stringify(w)).join(',\n')},
];
export interface VocabEventRow {
  id: string; name: string; kind: string;
  /** 해마다 같은 양력 [월, 일] */
  on?: [number, number];
  /** 음력 [월, 일] — 양력 날짜는 해마다 따로 확인한다 */
  lunar?: [number, number];
  /** 달 묶음 (계절 · 독서의 달) */
  months?: number[];
  /** 미리 익히기를 권하는 날 수 */
  lead: number;
  /** 이어진 어휘 번호 (그 시기에 먼저 권하는 차례) */
  words: number[];
}
export const VOCAB_EVENTS: VocabEventRow[] = [
${events.map((e) => JSON.stringify(e)).join(',\n')},
];
`;
const target = fileURLToPath(new URL('../src/features/word/vocabData.ts', import.meta.url));
writeFileSync(target, out);
console.log(`어휘 ${words.length}개 · 주제 ${topics.length}개 · 시기 ${events.length}개 (연결 ${events.reduce((n, e) => n + e.words.length, 0)}개) → ${target}`);
