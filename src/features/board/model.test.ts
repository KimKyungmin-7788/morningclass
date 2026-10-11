import { describe, expect, it } from 'vitest';
import { COLUMN_INKS, columnInk, columnOf, columnRange, commit, dashArray, emptyHistory, eraseAlong, eraseAt, eraserRadius, imageAt, imageBox, inkPressure, isUniformLine, linePath, placeImage, resizeImage, rotateImage, toImageLocal, presentStudents, redo, smoothPoints, strokePath, undo, type Stroke } from './model';
import { PAPERS, getPaper } from './papers';

const line = (id: string, y: number, from = 0, to = 100, step = 10): Stroke => {
  const points: number[] = [];
  for (let x = from; x <= to; x += step) points.push(x, y, 0.5);
  return { id, variant: 'pen', color: '#1A1A1A', size: 'M', points };
};

describe('판서 규칙', () => {
  it('획을 SVG path 로 만든다', () => {
    const d = strokePath(line('a', 50));
    expect(d.startsWith('M ')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(strokePath({ ...line('a', 50), points: [] })).toBe('');
    // 형광펜은 같은 획이라도 더 굵게 나온다 (외곽선의 세로 폭으로 확인)
    const height = (p: string) => { const ys = p.split(' ').filter((_, i) => i > 0).map(Number).filter((n) => !Number.isNaN(n)).filter((_, i) => i % 2 === 1); return Math.max(...ys) - Math.min(...ys); };
    expect(height(strokePath({ ...line('a', 50), variant: 'highlighter' }))).toBeGreaterThan(height(d));
  });

  it('실선 · 파선 · 점선은 굵기가 일정한 선으로 그린다 (형광펜과 손글씨는 아니다)', () => {
    const a = line('a', 50, 0, 30);
    expect(isUniformLine(a)).toBe(false);
    expect(isUniformLine({ ...a, dash: 'dashed' })).toBe(true);
    expect(isUniformLine({ ...a, dash: 'dashed', variant: 'highlighter' })).toBe(false);
    expect(linePath(a)).toBe('M 0 50 Q 10 50 15 50 Q 20 50 25 50 L 30 50');
    expect(linePath({ ...a, points: [5, 5, 0.5] })).toBe('M 5 5 L 5 5');       // 톡 찍으면 점
    expect(linePath({ ...a, points: [] })).toBe('');
    expect(dashArray('solid', 8)).toBeUndefined();
    expect(dashArray('dashed', 10)).toBe('12 16');
    expect(dashArray('dotted', 10)).toBe('1 17');
  });

  it('지우개가 지나간 자리만 지우고 획을 둘로 나눈다 (동그라미에 걸린 만큼만)', () => {
    const strokes = [line('a', 50), line('b', 200)];
    const next = eraseAt(strokes, 50, 50, 12);
    expect(next).toHaveLength(3);                                   // a 가 둘로 나뉘고 b 는 그대로
    expect(next.find((s) => s.id === 'b')).toBe(strokes[1]);
    const parts = next.filter((s) => s.id !== 'b');
    expect(parts.map((s) => [s.points[0], s.points[s.points.length - 3]])).toEqual([[0, 38], [62, 100]]);
    expect(parts[0].points.slice(0, 12)).toEqual(strokes[0].points.slice(0, 12));   // 남은 부분의 점은 그대로 → 모양과 굵기가 변하지 않는다
    expect(parts.every((s) => s.id !== 'a')).toBe(true);
  });

  it('닿지 않으면 같은 배열을 그대로 돌려주고, 통째로 덮이면 사라진다', () => {
    const strokes = [line('a', 50)];
    expect(eraseAt(strokes, 500, 500, 10)).toBe(strokes);
    expect(eraseAt([line('a', 50, 0, 20)], 10, 50, 15)).toEqual([]);
    expect(eraseAt([{ ...line('a', 50), points: [5, 5, 0.5] }], 6, 6, 4)).toEqual([]);   // 톡 찍은 점
    expect(eraserRadius('S')).toBeLessThan(eraserRadius('XL'));
  });

  it('빠르게 그은 듬성한 획도 가운데를 지울 수 있다 (점 사이의 선분을 자른다)', () => {
    const sparse: Stroke = { id: 'a', variant: 'pen', color: '#000', size: 'M', points: [0, 0, 0.2, 300, 0, 0.8] };
    const parts = eraseAt([sparse], 150, 0, 10);
    expect(parts.map((s) => s.points)).toEqual([[0, 0, 0.2, 140, 0, 0.48], [160, 0, 0.52, 300, 0, 0.8]]);   // 누르는 힘도 그 자리 값으로 이어진다
  });

  it('지우개를 빠르게 끌어도 지나간 길의 획을 모두 지운다', () => {
    const rows = [50, 150, 250].map((y, i) => ({ ...line(`r${i}`, y, 0, 100, 5) }));
    expect(eraseAt(eraseAt(rows, 50, 0, 9), 50, 300, 9)).toHaveLength(3);        // 처음과 끝만 찍으면 아무것도 못 지운다
    const next = eraseAlong(rows, 50, 0, 50, 300, 9);
    expect(next).toHaveLength(6);                                                // 세 줄이 모두 둘로 나뉜다
  });

  it('펜은 빨리 그으면 가늘어지고 천천히 그으면 굵어진다', () => {
    expect(inkPressure(0.5, 0, 'M')).toBe(0.5);                     // 움직이지 않으면 그대로
    expect(inkPressure(0.5, 1, 'M')).toBeGreaterThan(0.5);          // 천천히
    expect(inkPressure(0.5, 8, 'M')).toBeLessThan(0.5);             // 빨리
    expect(inkPressure(0.5, 8, 'XL')).toBeGreaterThan(inkPressure(0.5, 8, 'M'));   // 굵은 펜은 같은 속도에도 덜 가늘어진다
  });

  it('빠르게 그어 점이 듬성해도 굽은 모양이 살아 있고, 점 간격이 고르다', () => {
    // 반지름 150 인 원을 12개 점으로만 찍었다 (아주 빠르게 돌린 것). 점을 곧게 이으면 원에서 5px 넘게 안으로 깎인다
    const raw: number[] = [];
    for (let i = 0; i <= 12; i += 1) raw.push(500 + 150 * Math.cos((i * Math.PI) / 6), 400 + 150 * Math.sin((i * Math.PI) / 6), 0.5);
    const out = smoothPoints(raw);
    let worst = 0; let widest = 0;
    for (let i = 0; i < out.length; i += 3) {
      if (i >= 66 && i < out.length - 66) worst = Math.max(worst, Math.abs(Math.hypot(out[i] - 500, out[i + 1] - 400) - 150));   // 양 끝 한 마디는 이웃 점이 없어 조금 덜 굽는다
      if (i > 0) widest = Math.max(widest, Math.hypot(out[i] - out[i - 3], out[i + 1] - out[i - 2]));
    }
    expect(worst).toBeLessThan(1.5);
    expect(widest).toBeLessThan(5);
    expect(out.slice(0, 2)).toEqual([650, 400]);
    expect(out.slice(-3, -1)).toEqual(raw.slice(-3, -1).map((n) => Math.round(n * 100) / 100));   // 끝은 손끝의 자리 그대로
  });

  it('잔떨림은 걸러 내고, 점 하나 · 둘도 그대로 다룬다', () => {
    expect(smoothPoints([5, 5, 0.5])).toEqual([5, 5, 0.5]);
    expect(smoothPoints([0, 0, 0.2, 8, 0, 0.6])).toEqual([0, 0, 0.2, 4, 0, 0.4, 8, 0, 0.6]);   // 누르는 힘도 사이 값으로 이어진다
    const shaky = smoothPoints([0, 0, 0.5, 1, 1, 0.5, 2, -1, 0.5, 20, 0, 0.5]);
    for (let i = 1; i < shaky.length; i += 3) expect(Math.abs(shaky[i])).toBeLessThan(0.5);   // 1px 씩 흔들린 점은 지나지 않는다
  });

  it('되돌리기와 다시 하기', () => {
    const s0: Stroke[] = []; const s1 = [line('a', 10)]; const s2 = [...s1, line('b', 20)];
    let h = commit(commit(emptyHistory<Stroke[]>(), s0), s1);
    const u1 = undo(h, s2)!;
    expect(u1.current).toBe(s1);
    const u2 = undo(u1.history, u1.current)!;
    expect(u2.current).toBe(s0);
    expect(undo(u2.history, u2.current)).toBeNull();
    const r1 = redo(u2.history, u2.current)!;
    expect(r1.current).toBe(s1);
    h = commit(r1.history, r1.current);                             // 새로 그리면 '다시 하기'는 사라진다
    expect(redo(h, [])).toBeNull();
  });

  it('그림은 맨 위의 것이 잡히고, 불러오면 화면 가운데에 60% 안으로 놓인다', () => {
    const images = [{ id: 'a', src: '', x: 0, y: 0, w: 100, h: 100 }, { id: 'b', src: '', x: 50, y: 50, w: 100, h: 100 }];
    expect(imageAt(images, 60, 60)?.id).toBe('b');
    expect(imageAt(images, 10, 10)?.id).toBe('a');
    expect(imageAt(images, 300, 300)).toBeUndefined();
    expect(placeImage(2000, 1000, 1000, 800)).toEqual({ x: 200, y: 250, w: 600, h: 300 });
    expect(placeImage(100, 50, 1000, 800)).toEqual({ x: 450, y: 375, w: 100, h: 50 });   // 작은 그림은 키우지 않는다
  });

  it('돌린 그림: 안팎 · 감싸는 네모 · 크기 바꾸기 · 돌리기', () => {
    const m = { id: 'a', src: '', x: 100, y: 100, w: 200, h: 100, rot: 90 };   // 가운데 (200,150), 세로로 선 모양
    expect(imageAt([m], 200, 60)?.id).toBe('a');                    // 돌리기 전에는 그림 밖이던 자리
    expect(imageAt([m], 120, 150)).toBeUndefined();                 // 돌리기 전에는 그림 안이던 자리
    const l = toImageLocal(m, 200, 60);
    expect([Math.round(l.x), Math.round(l.y) + 0]).toEqual([-90, 0]);
    const box = imageBox(m);
    expect([box.left, box.top, box.right, box.bottom].map(Math.round)).toEqual([150, 50, 250, 250]);
    // 반듯한 그림: 오른쪽 아래를 끌면 왼쪽 위는 제자리, 비율은 그대로
    const flat = { ...m, rot: 0 };
    expect(resizeImage(flat, 500, 999)).toMatchObject({ x: 100, y: 100, w: 400, h: 200 });
    expect(resizeImage(flat, 0, 0)).toMatchObject({ x: 100, y: 100, w: 40, h: 20 });   // 너무 작아지지 않는다
    // 돌린 그림도 맞은편 모서리(화면에서는 오른쪽 위 (250,50))가 제자리
    const big = resizeImage(m, 50, 450);
    expect([big.w, big.h]).toEqual([400, 200]);
    const corner = imageBox(big);
    expect([Math.round(corner.right), Math.round(corner.top)]).toEqual([250, 50]);
    expect(rotateImage(flat, 300, 150).rot).toBe(90);               // 손잡이를 오른쪽으로
    expect(rotateImage(flat, 203, 0).rot).toBe(0);                  // 반듯한 각도 가까이는 딱 맞춘다
    expect(rotateImage(flat, 100, 50).rot).toBe(315);
  });

  it('칸 나누기: 가로 위치로 칸을 찾고, 결석한 학생은 명단에서 뺀다', () => {
    expect([0, 399, 400, 1199, 1200, 1599].map((x) => columnOf(x, 1600, 4))).toEqual([0, 0, 1, 2, 3, 3]);
    expect(columnOf(-5, 1600, 4)).toBe(0);
    expect(columnOf(1700, 1600, 4)).toBe(3);
    expect(columnRange(1, 1200, 3)).toEqual({ left: 400, right: 800 });
    expect(columnInk({ b: '#E03131' }, 'a', 1)).toBe(COLUMN_INKS[1]);    // 고른 색이 없으면 칸 순서의 기본색
    expect(columnInk({ b: '#E03131' }, 'b', 0)).toBe('#E03131');
    const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd', archived: true as const }];
    expect(presentStudents(students, { a: { status: 'present' }, b: { status: 'absent' } }).map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('용지 8종이 있고 모르는 이름은 무지로 본다', () => {
    expect(PAPERS.map((p) => p.name)).toEqual(['무지', '줄노트', '격자', '도트', '경필', '영어', '음악', '수업노트']);
    expect(getPaper('없는것' as never).id).toBe('blank');
  });
});
