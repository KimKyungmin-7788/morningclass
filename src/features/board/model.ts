import { getStroke } from 'perfect-freehand';

// 판서 규칙 (화면과 무관한 계산). 그린 것은 그림(픽셀)이 아니라 획(점 목록)으로 가지고 있다 —
// 그래서 지우개가 지나간 자리만 지우고, 되돌리기·다시 하기가 된다.

export type InkTool = 'pen' | 'highlighter' | 'eraser';
export type SizeId = 'S' | 'M' | 'L' | 'XL';
/** 선 모양. draw = 손글씨(누르는 힘에 따라 굵기가 변함), 나머지는 굵기가 일정한 실선 · 파선 · 점선 */
export type DashId = 'draw' | 'solid' | 'dashed' | 'dotted';
export const DASH_IDS: DashId[] = ['draw', 'solid', 'dashed', 'dotted'];

/** 칠판에 붙인 그림. 획 아래에 깔려서 그 위에 쓸 수 있다 */
export interface BoardImage {
  id: string; src: string; x: number; y: number; w: number; h: number;
  /** 가운데를 중심으로 돌린 각도(도, 시계 방향). 없으면 0 */
  rot?: number;
  /** 0.1(거의 투명) ~ 1(불투명). 없으면 1 */
  opacity?: number;
}
/** 되돌리기 한 번의 단위 */
export interface Snapshot { strokes: Stroke[]; images: BoardImage[] }

export interface Stroke {
  id: string;
  variant: 'pen' | 'highlighter';
  color: string;
  size: SizeId;
  /** 선 모양. 없으면 손글씨 */
  dash?: DashId;
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

/**
 * 펜의 굵기 변화: 빨리 그으면 가늘어지고 천천히 그으면 굵어진다. 바로 앞 점의 힘과 그 점에서 움직인 거리로 다음 힘을 정한다.
 * 그을 때 한 번 정해서 점마다 적어 둔다 — 나중에 다시 계산하면 손을 떼거나 지우개로 자른 순간 굵기가 달라져 보인다.
 */
export function inkPressure(prev: number, dist: number, size: SizeId): number {
  const sp = Math.min(1, dist / SIZES[size]);
  return Math.min(1, prev + (Math.min(1, 1 - sp) - prev) * (sp * 0.275));
}

/** 다듬은 획의 점 간격(px) */
const STEP = 4;
/** 이보다 가까운 입력 점은 건너뛴다 — 손끝의 잔떨림을 걸러 낸다 */
const MIN_GAP = 3;

/**
 * 입력 점들을 지나는 부드러운 곡선(중심 캣멀-롬)을 만들고 그 위에 일정한 간격으로 점을 다시 찍는다.
 * 빠르게 그으면 입력 점이 듬성해서, 그대로 이으면 굽은 곳이 깎여 나가고 선이 손을 뒤늦게 따라오는 것처럼 보인다.
 * 곡선은 실제로 지나간 점을 모두 지나므로 빠르게 그어도 모양이 살고, 간격이 일정해서 속도와 상관없이 같은 느낌으로 그려진다.
 * 그리는 중에도 손을 뗀 뒤에도 이 결과를 그대로 그린다 (손을 떼면 이 점들을 획으로 간직한다).
 */
export function smoothPoints(points: number[]): number[] {
  const count = points.length / 3;
  if (count < 2) return points.slice();
  // 1) 너무 가까운 점을 걸러 매듭을 고른다 (마지막 점은 손끝의 자리이므로 꼭 남긴다)
  const k: number[][] = [[points[0], points[1], points[2]]];
  for (let i = 1; i < count; i += 1) {
    const q = [points[i * 3], points[i * 3 + 1], points[i * 3 + 2]];
    const last = k[k.length - 1];
    if (Math.hypot(q[0] - last[0], q[1] - last[1]) >= MIN_GAP) k.push(q);
    else if (i === count - 1 && k.length > 1 && Math.hypot(q[0] - k[k.length - 2][0], q[1] - k[k.length - 2][1]) >= MIN_GAP) k[k.length - 1] = q;
    else if (i === count - 1 && k.length === 1 && Math.hypot(q[0] - last[0], q[1] - last[1]) > 0.01) k.push(q);
  }
  if (k.length < 2) return k[0];
  // 2) 매듭 사이를 곡선으로 잇고 STEP 간격으로 점을 찍는다
  const out = [r(k[0][0]), r(k[0][1]), k[0][2]];
  const mix = (a: number[], b: number[], ta: number, tb: number, t: number) => {
    const span = tb - ta;
    if (span < 1e-6) return a;
    const w = (t - ta) / span;
    return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
  for (let i = 0; i < k.length - 1; i += 1) {
    const p1 = k[i]; const p2 = k[i + 1];
    const p0 = k[i - 1] ?? [2 * p1[0] - p2[0], 2 * p1[1] - p2[1]];   // 양 끝은 이웃 점을 뒤집어 놓고 잇는다
    const p3 = k[i + 2] ?? [2 * p2[0] - p1[0], 2 * p2[1] - p1[1]];
    const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const steps = Math.max(1, Math.ceil(dist / STEP));
    const t1 = Math.sqrt(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]));
    const t2 = t1 + Math.sqrt(dist);
    const t3 = t2 + Math.sqrt(Math.hypot(p3[0] - p2[0], p3[1] - p2[1]));
    for (let j = 1; j <= steps; j += 1) {
      const u = j / steps;
      const force = r(p1[2] + (p2[2] - p1[2]) * u);
      if (j === steps) { out.push(r(p2[0]), r(p2[1]), force); break; }
      const t = t1 + (t2 - t1) * u;
      const a1 = mix(p0, p1, 0, t1, t); const a2 = mix(p1, p2, t1, t2, t); const a3 = mix(p2, p3, t2, t3, t);
      const b1 = mix(a1, a2, 0, t2, t); const b2 = mix(a2, a3, t1, t3, t);
      const c = mix(b1, b2, t1, t2, t);
      out.push(r(c[0]), r(c[1]), force);
    }
  }
  return out;
}

/** 획의 외곽선을 매끈한 SVG path 로 — 인접한 점들의 가운데를 지나는 곡선으로 이어 계단 모양을 없앤다 */
export function strokePath(s: Stroke): string {
  const input: number[][] = [];
  for (let i = 0; i < s.points.length; i += 3) input.push([s.points[i], s.points[i + 1], s.points[i + 2] ?? 0.5]);
  if (!input.length) return '';
  const base = SIZES[s.size];
  const outline = getStroke(input, s.variant === 'highlighter'
    ? { size: base * 2.2, thinning: 0, smoothing: 0.5, streamline: 0.5, simulatePressure: false, last: true }   // 형광펜: 굵기 일정
    : { size: base, thinning: 0.6, smoothing: 0.55, streamline: 0.45, simulatePressure: false, last: true });   // 굵기는 그을 때 정해 둔 힘(inkPressure)을 쓴다
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

/** 굵기가 일정한 선(실선 · 파선 · 점선)으로 그릴 획인가. 형광펜은 언제나 손글씨 방식이다 */
export const isUniformLine = (s: Stroke) => s.variant === 'pen' && (s.dash ?? 'draw') !== 'draw';

/** 굵기가 일정한 선의 가운데 길 — 점과 점의 가운데를 지나는 곡선으로 부드럽게 잇는다. 점 하나(톡 찍기)는 점으로 보인다 */
export function linePath(s: Stroke): string {
  const p = s.points;
  const n = p.length / 3;
  if (n < 1) return '';
  const d: (string | number)[] = ['M', r(p[0]), r(p[1])];
  for (let i = 1; i < n - 1; i += 1) {
    const [x, y, nx, ny] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 3], p[i * 3 + 4]];
    d.push('Q', r(x), r(y), r((x + nx) / 2), r((y + ny) / 2));
  }
  d.push('L', r(p[(n - 1) * 3]), r(p[(n - 1) * 3 + 1]));
  return d.join(' ');
}

/** 파선 · 점선의 간격 (선 끝을 둥글게 그려야 점선이 동그란 점이 된다). 실선은 없음 */
export function dashArray(dash: DashId | undefined, width: number): string | undefined {
  if (dash === 'dashed') return `${r(width * 1.2)} ${r(width * 1.6)}`;
  if (dash === 'dotted') return `${r(width * 0.1)} ${r(width * 1.7)}`;
  return undefined;
}

/**
 * 지우개가 지나간 자리(ex, ey, 반경)를 지운다.
 * 닿은 획은 동그라미에 걸린 부분만 잘려 여러 획으로 나뉜다. 점과 점 사이(선분)를 따져서 자르므로
 * 빠르게 그어 점이 듬성한 획도 가운데를 지울 수 있고, 남은 부분의 점은 건드리지 않아 모양과 굵기가 그대로다.
 * 바뀐 것이 없으면 같은 배열을 그대로 돌려준다.
 */
export function eraseAt(strokes: Stroke[], ex: number, ey: number, radius: number): Stroke[] {
  const r2 = radius * radius;
  let changed = false;
  const next: Stroke[] = [];
  for (const s of strokes) {
    const p = s.points;
    const runs: number[][] = [];
    let cur: number[] = [];
    let touched = false;
    const close = () => { if (cur.length) runs.push(cur); cur = []; };
    for (let i = 0; i < p.length; i += 3) {
      const [x, y, f] = [p[i], p[i + 1], p[i + 2] ?? 0.5];
      if (i === 0) { if ((x - ex) ** 2 + (y - ey) ** 2 <= r2) touched = true; else cur.push(x, y, f); continue; }
      const [qx, qy, qf] = [p[i - 3], p[i - 2], p[i - 1] ?? 0.5];
      // 선분 Q→P 가 동그라미 안에 있는 구간 [t0, t1] (0 = Q, 1 = P)
      const dx = x - qx; const dy = y - qy;
      const a = dx * dx + dy * dy;
      const b = 2 * ((qx - ex) * dx + (qy - ey) * dy);
      const c = (qx - ex) ** 2 + (qy - ey) ** 2 - r2;
      let t0 = 1; let t1 = 0;
      if (a === 0) { if (c <= 0) { t0 = 0; t1 = 1; } }
      else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) { const sq = Math.sqrt(disc); t0 = Math.max(0, (-b - sq) / (2 * a)); t1 = Math.min(1, (-b + sq) / (2 * a)); }
      }
      if (t0 > t1) { cur.push(x, y, f); continue; }                // 닿지 않은 선분
      touched = true;
      const at = (t: number) => [r(qx + dx * t), r(qy + dy * t), r(qf + (f - qf) * t)];
      if (t0 > 0 && cur.length) cur.push(...at(t0));
      close();
      if (t1 < 1) cur.push(...at(t1), x, y, f);
    }
    close();
    if (!touched) { next.push(s); continue; }
    changed = true;
    for (const run of runs) if (run.length >= 6) next.push({ ...s, id: newStrokeId(), points: run });   // 점이 2개 이상 남은 구간만
  }
  return changed ? next : strokes;
}

/** 지우개를 a 에서 b 까지 끌었을 때 — 빠르게 움직여도 지나간 길 전체를 지운다 */
export function eraseAlong(strokes: Stroke[], ax: number, ay: number, bx: number, by: number, radius: number): Stroke[] {
  const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (radius * 0.6)));
  let next = strokes;
  for (let k = 0; k <= steps; k += 1) next = eraseAt(next, ax + ((bx - ax) * k) / steps, ay + ((by - ay) * k) / steps, radius);
  return next;
}

// ── 되돌리기 · 다시 하기 ──
export interface History<T> { past: T[]; future: T[] }
const LIMIT = 100;
export const emptyHistory = <T>(): History<T> => ({ past: [], future: [] });
/** 바꾸기 전 상태를 기억한다 (새로 바꾸면 '다시 하기'는 비운다) */
export const commit = <T>(h: History<T>, before: T): History<T> => ({ past: [...h.past, before].slice(-LIMIT), future: [] });
export function undo<T>(h: History<T>, current: T): { history: History<T>; current: T } | null {
  if (!h.past.length) return null;
  return { history: { past: h.past.slice(0, -1), future: [current, ...h.future] }, current: h.past[h.past.length - 1] };
}
export function redo<T>(h: History<T>, current: T): { history: History<T>; current: T } | null {
  if (!h.future.length) return null;
  return { history: { past: [...h.past, current], future: h.future.slice(1) }, current: h.future[0] };
}

// ── 그림 ──
/** 그 자리에 있는 그림 (겹쳐 있으면 맨 위의 것) */
export function imageAt(images: BoardImage[], x: number, y: number): BoardImage | undefined {
  for (let i = images.length - 1; i >= 0; i -= 1) {
    const m = images[i];
    const l = toImageLocal(m, x, y);
    if (Math.abs(l.x) <= m.w / 2 && Math.abs(l.y) <= m.h / 2) return m;
  }
  return undefined;
}
const turn = (x: number, y: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
};
/** 칠판 좌표 → 그림 기준 좌표 (그림 가운데가 원점, 돌리기 전의 방향). 돌린 그림도 손잡이와 안팎을 이것으로 따진다 */
export function toImageLocal(m: BoardImage, x: number, y: number): { x: number; y: number } {
  return turn(x - (m.x + m.w / 2), y - (m.y + m.h / 2), -(m.rot ?? 0));
}
/** 돌린 그림을 감싸는 반듯한 네모 */
export function imageBox(m: BoardImage): { left: number; top: number; right: number; bottom: number } {
  const c = { x: m.x + m.w / 2, y: m.y + m.h / 2 };
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => turn((sx * m.w) / 2, (sy * m.h) / 2, m.rot ?? 0));
  const xs = corners.map((p) => c.x + p.x); const ys = corners.map((p) => c.y + p.y);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}
/** 오른쪽 아래 손잡이를 (px, py) 로 끌었을 때 — 맞은편(왼쪽 위) 모서리는 제자리에 두고 비율을 지켜 크기를 바꾼다 */
export function resizeImage(m: BoardImage, px: number, py: number): BoardImage {
  const rot = m.rot ?? 0;
  const c = { x: m.x + m.w / 2, y: m.y + m.h / 2 };
  const tl = turn(-m.w / 2, -m.h / 2, rot);
  const anchor = { x: c.x + tl.x, y: c.y + tl.y };
  const w = Math.max(40, turn(px - anchor.x, py - anchor.y, -rot).x);
  const h = (w * m.h) / m.w;
  const half = turn(w / 2, h / 2, rot);
  return { ...m, x: r(anchor.x + half.x - w / 2), y: r(anchor.y + half.y - h / 2), w: r(w), h: r(h) };
}
/** 돌리기 손잡이(그림 위쪽)를 (px, py) 로 끌었을 때의 각도. 반듯한 각도(0 · 90 · 180 · 270) 가까이에서는 딱 맞춘다 */
export function rotateImage(m: BoardImage, px: number, py: number): BoardImage {
  let rot = (Math.atan2(py - (m.y + m.h / 2), px - (m.x + m.w / 2)) * 180) / Math.PI + 90;
  rot = ((rot % 360) + 360) % 360;
  const near = Math.round(rot / 90) * 90;
  if (Math.abs(rot - near) <= 6) rot = near % 360;
  return { ...m, rot: Math.round(rot) };
}
/** 불러온 그림을 화면(w × h) 가운데에, 화면의 60% 안에 들어오게 놓는다 (작은 그림은 키우지 않는다) */
export function placeImage(iw: number, ih: number, w: number, h: number): { x: number; y: number; w: number; h: number } {
  const k = Math.min(1, (w * 0.6) / iw, (h * 0.6) / ih);
  return { x: r((w - iw * k) / 2), y: r((h - ih * k) / 2), w: r(iw * k), h: r(ih * k) };
}

// ── 학생별 칸 나누기 ──
export const MAX_COLUMNS = 4;
/** 칸마다 처음에 주는 펜 색 (왼쪽부터). 이름표를 눌러 바꾼다 */
export const COLUMN_INKS = ['#1971C2', '#E8590C', '#2F9E44', '#7048E8'];
/** 그 칸 학생의 펜 색 — 고른 색이 없으면 칸 순서에 따른 기본색 */
export const columnInk = (colors: Record<string, string>, studentId: string, index: number) => colors[studentId] ?? COLUMN_INKS[index % COLUMN_INKS.length];
/** 화면 가로 위치가 몇 번째 칸인지 */
export const columnOf = (x: number, width: number, count: number) => Math.min(count - 1, Math.max(0, Math.floor((x / width) * count)));
/** 칸의 왼쪽 · 오른쪽 끝 */
export const columnRange = (index: number, width: number, count: number) => ({ left: (width * index) / count, right: (width * (index + 1)) / count });
/** 오늘 출석한 학생 — 결석으로 체크한 학생만 뺀다 (지각 · 조퇴 · 아직 체크하지 않은 학생은 포함) */
export function presentStudents<S extends { id: string; archived?: true }>(students: S[], attendance: Record<string, { status: string } | undefined>): S[] {
  return students.filter((s) => !s.archived && attendance[s.id]?.status !== 'absent');
}
