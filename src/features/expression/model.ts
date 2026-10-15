// 오늘의 생활표현 규칙 (화면과 무관한 계산).
// 주마다 주제 하나, 요일마다 상황 하나. 토 · 일에는 그 주 금요일 상황을 보여 준다.
import { EXPR_TOPICS, type ExprSituation, type ExprTopic } from './data';

/** 월 = 0 … 금 = 4 (토 · 일은 4) */
export function weekdayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 || d === 6 ? 4 : d - 1;
}

/** 1970-01-05(월)부터 몇 번째 주인가 — 주제를 차례로 돌리는 데 쓴다 */
export function weekNumber(date: Date): number {
  const day = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
  return Math.floor((day - 4) / 7);
}

/** 첫 주제를 시작한 주 (2026-10-12 월요일) — 주제가 늘어도 그 주부터 차례로 돈다 */
const FIRST_WEEK = weekNumber(new Date(2026, 9, 12));

export interface ExprPick { topic: ExprTopic; situation: ExprSituation; index: number }

export function pickExpr(date: Date, topics: ExprTopic[] = EXPR_TOPICS): ExprPick {
  const n = topics.length;
  const w = weekNumber(date) - FIRST_WEEK;
  const topic = topics[((w % n) + n) % n];
  const index = Math.min(weekdayIndex(date), topic.days.length - 1);
  return { topic, situation: topic.days[index], index };
}

/** 그림 카드 고르기에서 맞는 카드가 왼쪽인가 — 늘 같은 자리에 있지 않게 날짜 · 상황마다 바꾼다 */
export const correctFirst = (date: Date, index: number) => (date.getDate() + index) % 2 === 0;

// ── 학생별 수준 ──
export type ExprLevel = 'sentence' | 'word' | 'card';
export const EXPR_LEVELS: ExprLevel[] = ['sentence', 'word', 'card'];

/** 학급별로 저장하는 설정: 학생 → 수준 */
export interface ExprBook { levels: Record<string, ExprLevel> }
export const emptyExprBook = (): ExprBook => ({ levels: {} });
export function normalizeExprBook(saved: unknown): ExprBook {
  const raw = (saved as { levels?: Record<string, unknown> } | null)?.levels ?? {};
  const levels: Record<string, ExprLevel> = {};
  for (const [s, l] of Object.entries(raw)) if (EXPR_LEVELS.includes(l as ExprLevel)) levels[s] = l as ExprLevel;
  return { levels };
}

export function setLevel(book: ExprBook, id: string, level: ExprLevel | undefined): ExprBook {
  const levels = { ...book.levels };
  if (level) levels[id] = level; else delete levels[id];
  return { levels };
}

/** 상황 그림 주소 후보: webp → png (둘 다 없으면 화면이 emoji 를 보여 준다) */
export const sceneImages = (id: string) => [`/img/expression/${id}.webp`, `/img/expression/${id}.png`];

/**
 * 오늘 따라 말하기를 마친 학생. 예전 판에서는 같은 칸(exprDone)에 true 를 저장했었다 — 목록이 아니면 빈 목록으로 본다
 */
export const doneList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** 따라 말하기 완료 표시를 켜고 끈다 */
export function toggleDone(list: unknown, id: string): string[] {
  const cur = doneList(list);
  return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
}
