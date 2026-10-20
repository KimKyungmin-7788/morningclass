import { describe, expect, it } from 'vitest';
import { classesToReport } from './usage';

const cls = (id: string, n: number) => ({ id, students: Array.from({ length: n }, (_, i) => ({ id: `s${i}` })) as never[] });

describe('classesToReport', () => {
  it('학생이 있고 아직 알리지 않은 학급만 고른다', () => {
    expect(classesToReport([cls('a', 0), cls('b', 3), cls('c', 1)], ['c'])).toEqual(['b']);
  });
  it('한 번에 10개까지만', () => {
    expect(classesToReport(Array.from({ length: 12 }, (_, i) => cls(`x${i}`, 1)), [])).toHaveLength(10);
  });
});
