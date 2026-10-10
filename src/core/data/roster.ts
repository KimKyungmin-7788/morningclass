import { newId, type DayRecord, type Student, type StudentId } from './types';

// 학생 명단 고치기 (화면과 무관한 계산). 학생은 번호(id)로 기록과 이어져 있어서, 이름을 고쳐도 기록이 끊기지 않는다.

/** 이름들을 명단에 더한다. 보관된 학생과 같은 이름이면 그 학생을 되살려 예전 기록이 다시 이어지게 한다 */
export function addNames(students: Student[], names: string[], makeId: () => StudentId = () => newId('s')): Student[] {
  let next = [...students];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const back = next.find((s) => s.archived && s.name === name);
    if (back) next = [...next.filter((s) => s !== back), { id: back.id, name }];
    else next.push({ id: makeId(), name });
  }
  return sortRoster(next);
}

/** 명단의 학생이 앞, 보관된 학생이 뒤 */
export const sortRoster = (students: Student[]): Student[] => [...students.filter((s) => !s.archived), ...students.filter((s) => s.archived)];

/** 명단에서 뺀다. 기록이 남아 있는 학생은 지우지 않고 '보관된 학생'으로 돌린다 */
export function removeStudent(students: Student[], id: StudentId, used: Set<StudentId>): Student[] {
  return sortRoster(students.flatMap((s) => (s.id !== id ? [s] : used.has(id) ? [{ ...s, archived: true as const }] : [])));
}

/** 명단 안에서 한 칸 위·아래로 옮긴다 */
export function moveStudent(students: Student[], id: StudentId, dir: -1 | 1): Student[] {
  const active = students.filter((s) => !s.archived);
  const i = active.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= active.length) return students;
  [active[i], active[j]] = [active[j], active[i]];
  return [...active, ...students.filter((s) => s.archived)];
}

export const renameStudent = (students: Student[], id: StudentId, name: string): Student[] =>
  (name.trim() ? students.map((s) => (s.id === id ? { ...s, name: name.trim() } : s)) : students);

/** 기록에 한 번이라도 나온 학생 번호 */
export function usedStudentIds(records: DayRecord[], allergies: Record<StudentId, number[]> = {}): Set<StudentId> {
  const used = new Set<StudentId>(Object.keys(allergies));
  for (const r of records) {
    for (const id of [...Object.keys(r.attendance), ...Object.keys(r.emotions), ...r.helpers.ids, ...r.lucky.ids]) used.add(id);
  }
  return used;
}
