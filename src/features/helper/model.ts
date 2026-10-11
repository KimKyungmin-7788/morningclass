// 도우미 · 행운 뽑기 규칙 (화면과 무관한 계산).
// 누가 뽑히는지는 언제나 먼저 공평하게 정하고(후보 전체에서 무작위), 뽑는 방식은 그 결과를 보여 주는 연출만 다르다.

export type DrawStyle = 'basic' | 'scratch' | 'ladder' | 'marble' | 'wheel';
export const DRAW_STYLES: { id: DrawStyle; label: string; icon: string }[] = [
  { id: 'basic', label: '기본', icon: '🎰' },
  { id: 'scratch', label: '복권', icon: '🎟️' },
  { id: 'ladder', label: '사다리', icon: '🪜' },
  { id: 'marble', label: '구슬', icon: '🔮' },
  { id: 'wheel', label: '돌림판', icon: '🎡' },
];
export const drawStyleOf = (v: unknown): DrawStyle => DRAW_STYLES.find((s) => s.id === v)?.id ?? 'basic';

type Rnd = () => number;

export function shuffle<T>(list: T[], rnd: Rnd = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * 판(사다리 · 빠칭코 · 돌림판)에 올릴 후보. 후보가 많으면 한 화면에 다 못 그리므로 max 명만 올린다 —
 * 뽑힌 학생은 모두 들어가고, 나머지 자리는 다른 후보로 무작위로 채워 자리를 섞는다.
 */
export function boardCandidates<T>(pool: T[], winners: T[], max: number, rnd: Rnd = Math.random): T[] {
  if (pool.length <= max) return shuffle(pool, rnd);
  const others = shuffle(pool.filter((p) => !winners.includes(p)), rnd).slice(0, Math.max(0, max - winners.length));
  return shuffle([...winners, ...others], rnd);
}

// ── 사다리 ──
/** rungs[단][i] = i 번째 줄과 i+1 번째 줄 사이에 가로대가 있는가 */
export interface Ladder { cols: number; levels: number; rungs: boolean[][] }

/** 가로대를 무작위로 놓는다. 한 단에서 가로대가 서로 붙지 않고, 이웃한 줄 사이마다 적어도 하나는 있다 */
export function makeLadder(cols: number, levels: number, rnd: Rnd = Math.random): Ladder {
  const rungs = Array.from({ length: levels }, () => Array<boolean>(Math.max(0, cols - 1)).fill(false));
  for (let l = 0; l < levels; l += 1) for (let i = 0; i < cols - 1; i += 1) if (!rungs[l][i - 1] && rnd() < 0.42) rungs[l][i] = true;
  for (let i = 0; i < cols - 1; i += 1) {
    if (rungs.some((row) => row[i])) continue;
    const free = rungs.map((_, l) => l).filter((l) => !rungs[l][i - 1] && !rungs[l][i + 1]);
    if (free.length) rungs[free[Math.floor(rnd() * free.length)]][i] = true;
  }
  return { cols, levels, rungs };
}

/** start 번째 줄에서 내려가면 어디에 닿는지. path 는 지나는 점 [줄, 단] (단 0 = 맨 위, levels+1 = 맨 아래) */
export function traceLadder(l: Ladder, start: number): { end: number; path: [number, number][] } {
  let c = start;
  const path: [number, number][] = [[c, 0]];
  for (let lv = 0; lv < l.levels; lv += 1) {
    const next = l.rungs[lv][c] ? c + 1 : l.rungs[lv][c - 1] ? c - 1 : c;
    if (next !== c) { path.push([c, lv + 1], [next, lv + 1]); c = next; }
  }
  path.push([c, l.levels + 1]);
  return { end: c, path };
}
/** 아래쪽 end 번째 줄에 닿으려면 위쪽 몇 번째 줄에서 출발해야 하는지 */
export function ladderStartFor(l: Ladder, end: number): number {
  for (let c = 0; c < l.cols; c += 1) if (traceLadder(l, c).end === end) return c;
  return end;
}
/** 길의 꺾이는 점마다, 전체 길이를 1 로 봤을 때 어디쯤인지 (내려가는 동안 꺾일 때마다 소리를 내는 데 쓴다) */
export function pathFractions(points: [number, number][]): number[] {
  const acc = [0];
  for (let i = 1; i < points.length; i += 1) acc.push(acc[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const total = acc[acc.length - 1] || 1;
  return acc.map((d) => d / total);
}

// ── 구슬 뽑기 ──
/** 못이 박힌 줄 수. 구슬이 오래 굴러 내려오도록 길게 잡고, 마지막에 칸 한가운데로 떨어지도록 짝을 맞춘다 */
export function marbleRows(slots: number): number {
  const rows = Math.max(16, slots * 2);
  return (slots + rows) % 2 === 1 ? rows : rows + 1;
}
/**
 * 구슬이 지나는 가로 자리(반 칸 단위, 판 너비 = 칸 수 × 2). 가운데에서 떨어져 못마다 왼쪽이나 오른쪽으로 반 칸씩 튀고,
 * 마지막에는 target 번째 칸의 한가운데(2 × target + 1)에 닿는다. 튀는 방향은 그 칸에 닿을 수 있는 범위 안에서 무작위.
 */
export function marblePath(slots: number, target: number, rnd: Rnd = Math.random): number[] {
  const rows = marbleRows(slots);
  const goal = 2 * target + 1;
  const path = [slots];
  for (let r = 1; r <= rows; r += 1) {
    const pos = path[path.length - 1];
    const ok = [-1, 1].filter((d) => pos + d >= 0 && pos + d <= 2 * slots && Math.abs(goal - (pos + d)) <= rows - r);   // 양 끝은 벽 — 벽에 닿으면 안쪽으로 튄다
    path.push(pos + ok[Math.floor(rnd() * ok.length)]);
  }
  return path;
}

// ── 돌림판 ──
/** index 번째 조각(전체 count 조각, 위에서 시계 방향)이 위쪽 바늘에 오도록 돌릴 각도 — 지금 각도에서 spins 바퀴를 더 돌고 멈춘다 */
export function wheelTurn(current: number, index: number, count: number, spins = 4): number {
  const center = ((index + 0.5) * 360) / count;
  const rest = (((-center - current) % 360) + 360) % 360;
  return current + spins * 360 + rest;
}
