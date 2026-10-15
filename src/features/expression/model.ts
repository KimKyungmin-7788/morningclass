// 오늘의 생활표현 규칙 (화면과 무관한 계산).
// 요일에 묶지 않고, 학급마다 날마다 하나를 무작위로 뽑는다. 뽑힌 상황은 100개가 한 바퀴 다 나온 뒤에야 다시 나온다(주머니 뽑기).
import { EXPR_TOPICS, type ExprSituation, type ExprTopic } from './data';

export interface ExprPick { topic: ExprTopic; situation: ExprSituation }

/** 모든 상황 (id → 주제 · 상황) */
const ALL = new Map<string, ExprPick>(EXPR_TOPICS.flatMap((topic) => topic.items.map((situation) => [situation.id, { topic, situation }] as const)));
export const EXPR_IDS: string[] = [...ALL.keys()];
export const exprById = (id: string | undefined): ExprPick | undefined => (id ? ALL.get(id) : undefined);

/** 학급별 뽑기 기록: 이번 바퀴에 나온 상황, 날짜별로 뽑힌 상황 */
export interface ExprBag { used: string[]; days: Record<string, string> }
/** 날짜별 기록은 최근 것만 남긴다 (문장 띠 인쇄 · 같은 날 다시 열기에 쓴다) */
const KEEP_DAYS = 60;

/**
 * 그날의 상황을 정한다.
 *  - 그날 이미 뽑았으면 그대로 (같은 날 다시 열어도 같은 상황)
 *  - 아니면 이번 바퀴에 아직 안 나온 것 중에서 무작위로. 다 나왔으면 새 바퀴를 시작한다 (바로 전날 것은 피한다)
 */
export function drawToday(bag: ExprBag, dateKey: string, ids: string[] = EXPR_IDS, rand: () => number = Math.random): { id: string; bag: ExprBag } {
  const known = new Set(ids);
  const today = bag.days[dateKey];
  if (today && known.has(today)) return { id: today, bag };
  let used = bag.used.filter((x) => known.has(x));
  let pool = ids.filter((x) => !used.includes(x));
  if (!pool.length) {
    const last = used[used.length - 1];
    used = [];
    pool = ids.length > 1 ? ids.filter((x) => x !== last) : ids;
  }
  const id = pool[Math.floor(rand() * pool.length) % pool.length];
  const days = Object.fromEntries([...Object.entries(bag.days).filter(([k]) => k !== dateKey), [dateKey, id]].slice(-KEEP_DAYS));
  return { id, bag: { used: [...used, id], days } };
}

/** 최근에 나온 상황 (오늘 포함, 최근 것부터) — 문장 띠 인쇄용 */
export function recentPicks(bag: ExprBag, n: number): ExprPick[] {
  const t = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
  return Object.entries(bag.days).sort(([a], [b]) => t(b) - t(a)).map(([, id]) => ALL.get(id)).filter((p): p is ExprPick => !!p).slice(0, n);
}

/** 그림 카드 고르기에서 맞는 카드가 왼쪽인가 — 늘 같은 자리에 있지 않게 날짜 · 상황마다 바꾼다 */
export const correctFirst = (date: Date, id: string) => ([...id].reduce((a, c) => a + c.charCodeAt(0), 0) + date.getDate()) % 2 === 0;

// ── 학생별 수준 ──
export type ExprLevel = 'sentence' | 'word' | 'card';
export const EXPR_LEVELS: ExprLevel[] = ['sentence', 'word', 'card'];

/** 학급별로 저장하는 설정: 학생 → 수준, 상황 뽑기 기록 */
export interface ExprBook { levels: Record<string, ExprLevel>; bag: ExprBag }
export const emptyExprBook = (): ExprBook => ({ levels: {}, bag: { used: [], days: {} } });
export function normalizeExprBook(saved: unknown): ExprBook {
  const v = (saved ?? {}) as { levels?: Record<string, unknown>; bag?: { used?: unknown; days?: unknown } };
  const levels: Record<string, ExprLevel> = {};
  for (const [s, l] of Object.entries(v.levels ?? {})) if (EXPR_LEVELS.includes(l as ExprLevel)) levels[s] = l as ExprLevel;
  const used = Array.isArray(v.bag?.used) ? v.bag.used.filter((x): x is string => typeof x === 'string') : [];
  const days: Record<string, string> = {};
  if (v.bag?.days && typeof v.bag.days === 'object') for (const [k, x] of Object.entries(v.bag.days)) if (typeof x === 'string') days[k] = x;
  return { levels, bag: { used, days } };
}

export function setLevel(book: ExprBook, id: string, level: ExprLevel | undefined): ExprBook {
  const levels = { ...book.levels };
  if (level) levels[id] = level; else delete levels[id];
  return { ...book, levels };
}

/** 상황 그림 주소 후보: webp → png (둘 다 없으면 화면이 emoji 를 보여 준다) */
export const sceneImages = (id: string) => [`/img/expression/${id}.webp`, `/img/expression/${id}.png`];

/** 바르게 말하는 그림 주소 후보: <id>-say (webp → png). 없으면 상황 그림으로 대신한다 */
export const sayImages = (id: string) => [`/img/expression/${id}-say.webp`, `/img/expression/${id}-say.png`, ...sceneImages(id)];

/**
 * 오늘 따라 말하기를 마친 학생. 예전 판에서는 같은 칸(exprDone)에 true 를 저장했었다 — 목록이 아니면 빈 목록으로 본다
 */
export const doneList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** 따라 말하기 완료 표시를 켜고 끈다 */
export function toggleDone(list: unknown, id: string): string[] {
  const cur = doneList(list);
  return cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
}
