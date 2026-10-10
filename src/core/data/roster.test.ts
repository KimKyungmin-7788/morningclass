import { describe, expect, it } from 'vitest';
import { addNames, moveStudent, removeStudent, renameStudent, usedStudentIds } from './roster';
import { emptyRecord, type Student } from './types';

const base: Student[] = [{ id: 'a', name: '가람' }, { id: 'b', name: '나래' }, { id: 'z', name: '전학생', archived: true }];
let n = 0;
const makeId = () => `new${(n += 1)}`;

describe('학생 명단', () => {
  it('추가: 새 이름은 새 번호, 보관된 학생과 같은 이름이면 되살린다', () => {
    n = 0;
    const next = addNames(base, [' 다온 ', '', '전학생'], makeId);
    expect(next).toEqual([{ id: 'a', name: '가람' }, { id: 'b', name: '나래' }, { id: 'new1', name: '다온' }, { id: 'z', name: '전학생' }]);
  });
  it('삭제: 기록이 있으면 보관하고, 없으면 지운다', () => {
    expect(removeStudent(base, 'a', new Set(['a']))).toEqual([{ id: 'b', name: '나래' }, { id: 'a', name: '가람', archived: true }, base[2]]);
    expect(removeStudent(base, 'a', new Set())).toEqual([base[1], base[2]]);
  });
  it('순서 바꾸기는 명단 안에서만', () => {
    expect(moveStudent(base, 'b', -1).map((s) => s.id)).toEqual(['b', 'a', 'z']);
    expect(moveStudent(base, 'b', 1)).toBe(base);               // 맨 아래에서 더 내릴 수 없다 (보관된 학생과 섞이지 않는다)
    expect(moveStudent(base, 'a', -1)).toBe(base);
  });
  it('이름 고치기는 번호를 바꾸지 않는다', () => {
    expect(renameStudent(base, 'a', ' 가람이 ')[0]).toEqual({ id: 'a', name: '가람이' });
    expect(renameStudent(base, 'a', '  ')).toBe(base);
  });
  it('기록·알레르기에 나온 학생 번호를 모은다', () => {
    const r = emptyRecord('c', '20261010');
    r.attendance.a = { status: 'present' }; r.emotions.b = { items: [] }; r.helpers.ids = ['c']; r.lucky.ids = ['d'];
    expect([...usedStudentIds([r], { e: [2] })].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});
