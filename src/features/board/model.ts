import { getStroke } from 'perfect-freehand';

// 판서 규칙 (화면과 무관한 계산). 그린 것은 그림(픽셀)이 아니라 획(점 목록)으로 가지고 있다 —
// 그래서 지우개가 지나간 자리만 지우고, 되돌리기·다시 하기가 된다.

export type InkTool = 'pen' | 'highlighter' | 'eraser';
export type SizeId = 'S' | 'M' | 'L' | 'XL';

export interface Stroke {
  id: string;
  variant: 'pen' | 'highlighter';
  color: string;
  size: SizeId;
  /** [x, y, 누르는 힘, x, y, 누르는 힘, …] */
  points: number[];
}

/** 흰 배경에서 잘 보이는 잉크 8색 */
export const INK_COLORS: { name: string; hex: string }[] = [
  { name: '검정', hex: '#1A1A1A' }, { name: '빨강', hex: '#E03131' }, { name: '파랑', hex: '#1971C2' }, { name: '초록', hex: '#2F9E44' },
  { name: '노랑', hex: '#F2C200' }, { name: '주황', hex: '#E8590C' }, { name: '보라', hex: '#7048E8' }, { name: '분홍', hex: '#E64980' },
];

/** 굵기 단계 (펜 기준 px) */
export const SIZES: Record<SizeId, number> = { S: 4, M: 8, L: 16, XL: 28 };
export const SIZE_IDS: SizeId[] = ['S', 'M', 'L', 'XL'];
/** 지우개는 넓게 지우는 것이 자연스러워 같은 단계를 더 크게 환산한다 */
export const eraserRadius = (size: SizeId) => SIZES[size] * 2.2;
export const strokeOpacity = (s: Stroke) => (s.variant === 'highlighter' ? 0.4 : 1);

let seq = 0;
export const newStrokeId = () => `st_${Date.now().toString(36)}_${(seq += 1).toString(36)}`;

/** 획의 외곽선을 매끈한 SVG path 로 — 인접한 점들의 가운데를 지나는 곡선으로 이어 계단 모양을 없앤다 */
export function strokePath(s: Stroke): string {
  const input: number[][] = [];
  for (let i = 0; i < s.points.length; i += 3) input.push([s.points[i], s.points[i + 1], s.points[i + 2] ?? 0.5]);
  if (!input.length) return '';
  const base = SIZES[s.size];
  const outline = getStroke(input, s.variant === 'highlighter'
    ? { size: base * 2.2, thinning: 0, smoothing: 0.5, streamline: 0.5, simulatePressure: false, last: true }   // 형광펜: 굵기 일정
    : { size: base, thinning: 0.6, smoothing: 0.55, streamline: 0.62, simulatePressure: true, last: true });
  if (outline.length < 3) return '';
  const d: (string | number)[] = ['M', r(outline[0][0]), r(outline[0][1]), 'Q'];
  for (let i = 0; i < outline.length; i += 1) {
    const [x0, y0] = outline[i];
    const [x1, y1] = outline[(i + 1) % outline.length];
    d.push(r(x0), r(y0), r((x0 + x1) / 2), r((y0 + y1) / 2));
  }
  d.push('Z');
  return d.join(' ');
}
const r = (n: number) => Math.round(n * 100) / 100;

/**
 * 지우개가 지나간 자리(ex, ey, 반경)를 지운다.
 * 닿은 획은 지워진 점을 경계로 여러 획으로 나뉜다. 바뀐 것이 없으면 같은 배열을 그대로 돌려준다.
 */
export function eraseAt(strokes: Stroke[], ex: number, ey: number, radius: number): Stroke[] {
  const r2 = radius * radius;
  let changed = false;
  const next: Stroke[] = [];
  for (const s of strokes) {
    const runs: number[][] = [];
    let cur: number[] = [];
    let touched = false;
    for (let i = 0; i < s.points.length; i += 3) {
      const dx = s.points[i] - ex; const dy = s.points[i + 1] - ey;
      if (dx * dx + dy * dy <= r2) { touched = true; if (cur.length) { runs.push(cur); cur = []; } }
      else cur.push(s.points[i], s.points[i + 1], s.points[i + 2] ?? 0.5);
    }
    if (cur.length) runs.push(cur);
    if (!touched) { next.push(s); continue; }
    changed = true;
    for (const run of runs) if (run.length >= 6) next.push({ ...s, id: newStrokeId(), points: run });   // 점이 2개 이상 남은 구간만
  }
  return changed ? next : strokes;
}

/**
 * 점 사이가 멀면 사이를 채운다. 빠르게 그은 획은 점이 듬성해서, 그대로 두면 지우개가 점과 점 사이를 지나쳐 버린다.
 */
export function densify(points: number[], maxGap = 6): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 3) {
    if (i > 0) {
      const [x0, y0, p0] = [points[i - 3], points[i - 2], points[i - 1] ?? 0.5];
      const [x1, y1, p1] = [points[i], points[i + 1], points[i + 2] ?? 0.5];
      const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / maxGap);
      for (let k = 1; k <= n; k += 1) { const t = k / (n + 1); out.push(r(x0 + (x1 - x0) * t), r(y0 + (y1 - y0) * t), p0 + (p1 - p0) * t); }
    }
    out.push(points[i], points[i + 1], points[i + 2] ?? 0.5);
  }
  return out;
}

/** 지우개를 a 에서 b 까지 끌었을 때 — 빠르게 움직여도 지나간 길 전체를 지운다 */
export function eraseAlong(strokes: Stroke[], ax: number, ay: number, bx: number, by: number, radius: number): Stroke[] {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (radius * 0.6)));
  let next = strokes;
  for (let k = 0; k <= steps; k += 1) next = eraseAt(next, ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps, radius);
  return next;
}

// ── 되돌리기 · 다시 하기 ──
export interface History { past: Stroke[][]; future: Stroke[][] }
const LIMIT = 100;
export const emptyHistory = (): History => ({ past: [], future: [] });
/** 바꾸기 전 상태를 기억한다 (새로 바꾸면 '다시 하기'는 비운다) */
export const commit = (h: History, before: Stroke[]): History => ({ past: [...h.past, before].slice(-LIMIT), future: [] });
export function undo(h: History, current: Stroke[]): { history: History; strokes: Stroke[] } | null {
  if (!h.past.length) return null;
  return { history: { past: h.past.slice(0, -1), future: [current, ...h.future] }, strokes: h.past[h.past.length - 1] };
}
export function redo(h: History, current: Stroke[]): { history: History; strokes: Stroke[] } | null {
  if (!h.future.length) return null;
  return { history: { past: [...h.past, current], future: h.future.slice(1) }, strokes: h.future[0] };
}
