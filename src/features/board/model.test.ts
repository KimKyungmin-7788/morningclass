import { describe, expect, it } from 'vitest';
import { commit, densify, emptyHistory, eraseAlong, eraseAt, eraserRadius, redo, strokePath, undo, type Stroke } from './model';
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

  it('지우개가 지나간 자리만 지우고 획을 둘로 나눈다', () => {
    const strokes = [line('a', 50), line('b', 200)];
    const next = eraseAt(strokes, 50, 50, 12);
    expect(next).toHaveLength(3);                                   // a 가 둘로 나뉘고 b 는 그대로
    expect(next.find((s) => s.id === 'b')).toBe(strokes[1]);
    const parts = next.filter((s) => s.id !== 'b');
    expect(parts.map((s) => [s.points[0], s.points[s.points.length - 3]])).toEqual([[0, 30], [70, 100]]);
    expect(parts.every((s) => s.id !== 'a')).toBe(true);
  });

  it('닿지 않으면 같은 배열을 그대로 돌려주고, 끝만 남으면 그 조각은 버린다', () => {
    const strokes = [line('a', 50)];
    expect(eraseAt(strokes, 500, 500, 10)).toBe(strokes);
    expect(eraseAt([line('a', 50, 0, 20)], 15, 50, 8)).toEqual([]);  // 점 하나만 남는 조각은 획이 아니다
    expect(eraserRadius('S')).toBeLessThan(eraserRadius('XL'));
  });

  it('빠르게 그은 듬성한 획도 가운데를 지울 수 있다 (점 사이를 채운다)', () => {
    const sparse: Stroke = { id: 'a', variant: 'pen', color: '#000', size: 'M', points: [0, 0, 0.5, 300, 0, 0.5] };
    expect(eraseAt([sparse], 150, 0, 10)).toHaveLength(1);                      // 채우기 전에는 지우개가 그냥 지나간다
    const dense = { ...sparse, points: densify(sparse.points) };
    expect(dense.points.slice(0, 3)).toEqual([0, 0, 0.5]);
    expect(dense.points.slice(-3)).toEqual([300, 0, 0.5]);
    const gaps = []; for (let i = 3; i < dense.points.length; i += 3) gaps.push(dense.points[i] - dense.points[i - 3]);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(6);
    expect(eraseAt([dense], 150, 0, 10)).toHaveLength(2);
  });

  it('지우개를 빠르게 끌어도 지나간 길의 획을 모두 지운다', () => {
    const rows = [50, 150, 250].map((y, i) => ({ ...line(`r${i}`, y, 0, 100, 5) }));
    expect(eraseAt(eraseAt(rows, 50, 0, 9), 50, 300, 9)).toHaveLength(3);        // 처음과 끝만 찍으면 아무것도 못 지운다
    const next = eraseAlong(rows, 50, 0, 50, 300, 9);
    expect(next).toHaveLength(6);                                                // 세 줄이 모두 둘로 나뉜다
  });

  it('되돌리기와 다시 하기', () => {
    const s0: Stroke[] = []; const s1 = [line('a', 10)]; const s2 = [...s1, line('b', 20)];
    let h = commit(commit(emptyHistory(), s0), s1);
    const u1 = undo(h, s2)!;
    expect(u1.strokes).toBe(s1);
    const u2 = undo(u1.history, u1.strokes)!;
    expect(u2.strokes).toBe(s0);
    expect(undo(u2.history, u2.strokes)).toBeNull();
    const r1 = redo(u2.history, u2.strokes)!;
    expect(r1.strokes).toBe(s1);
    h = commit(r1.history, r1.strokes);                             // 새로 그리면 '다시 하기'는 사라진다
    expect(redo(h, [])).toBeNull();
  });

  it('용지 8종이 있고 모르는 이름은 무지로 본다', () => {
    expect(PAPERS.map((p) => p.name)).toEqual(['무지', '줄노트', '격자', '도트', '경필', '영어', '음악', '수업노트']);
    expect(getPaper('없는것' as never).id).toBe('blank');
  });
});
