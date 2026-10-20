import { describe, expect, it } from 'vitest';
import { classesToReport } from './usage';

const cls = (id: string, n: number, className = '1반') => ({ id, schoolName: '해맑은학교', className, students: Array.from({ length: n }, (_, i) => ({ id: `s${i}` })) as never[] });

describe('classesToReport', () => {
  it('학생이 있고 아직 알리지 않은 학급만 고른다', () => {
    expect(classesToReport([cls('a', 0), cls('b', 3), cls('c', 1)], ['c'])).toEqual(['b']);
  });
  it('이름에 테스트·시험·test 가 들어간 학급은 세지 않는다', () => {
    expect(classesToReport([cls('a', 2, '테스트반'), cls('b', 2, 'Test 1'), cls('c', 2, '시험용'), cls('d', 2, '햇살반')], [])).toEqual(['d']);
  });
  it('처음 화면의 체험학급(체험학교)은 세지 않는다', () => {
    expect(classesToReport([{ ...cls('a', 5), schoolName: '체험학교' }], [])).toEqual([]);
  });
  it('한 번에 10개까지만', () => {
    expect(classesToReport(Array.from({ length: 12 }, (_, i) => cls(`x${i}`, 1)), [])).toHaveLength(10);
  });
});
