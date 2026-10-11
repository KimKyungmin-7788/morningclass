import type { RoleItem, StudentId } from '@/core/data/types';

// 1인 1역할 규칙 (화면과 무관한 계산).
// 역할과 맡은 학생은 선생님이 바꿀 때까지 그대로 가고, "오늘 했어요"는 날마다 그날 기록에 남는다.
// 한 역할을 여러 명이 함께 맡아도 되고, 역할이 없는 학생이 있어도 된다.

/** 자주 쓰는 역할 — 역할 정하기에서 눌러서 넣는다 */
export const ROLE_PRESETS: { icon: string; name: string; desc: string }[] = [
  { icon: '🧽', name: '칠판 지우기', desc: '수업이 끝나면 칠판을 지워요' },
  { icon: '🥛', name: '우유 나르기', desc: '우유를 가져와 나눠 줘요' },
  { icon: '🌱', name: '화분 물 주기', desc: '아침에 화분에 물을 줘요' },
  { icon: '💡', name: '불 끄기', desc: '교실을 나갈 때 불을 꺼요' },
  { icon: '🪟', name: '창문 열기', desc: '쉬는 시간에 창문을 열어요' },
  { icon: '🙋', name: '인사 구령', desc: '수업을 시작할 때 인사를 해요' },
  { icon: '🚶', name: '줄 세우기', desc: '이동할 때 줄을 세워요' },
  { icon: '📚', name: '책 정리', desc: '책꽂이의 책을 가지런히 해요' },
  { icon: '🧹', name: '바닥 쓸기', desc: '교실 바닥을 쓸어요' },
  { icon: '🗑️', name: '분리배출', desc: '쓰레기를 나누어 버려요' },
  { icon: '🍽️', name: '급식 도우미', desc: '급식 시간에 식판을 정리해요' },
  { icon: '🌤️', name: '날씨 알림이', desc: '오늘 날씨를 알려 줘요' },
  { icon: '📅', name: '시간표 알림이', desc: '오늘 시간표를 알려 줘요' },
  { icon: '✏️', name: '학습지 나누기', desc: '학습지를 친구들에게 나눠 줘요' },
];
/** 역할 그림으로 고를 수 있는 것 */
export const ROLE_ICONS = ['⭐', ...new Set(ROLE_PRESETS.map((p) => p.icon)), '🚪', '🧴', '🎒', '🖍️', '🧺', '🪑', '📢', '🤝', '🐠', '🧼'];

/** 날마다의 완료 기록: 역할 → 오늘 한 학생들 */
export type RoleDone = Record<string, StudentId[]>;

export interface RoleView {
  role: RoleItem;
  /** 그 역할을 맡은 학생 (명단에 있는 학생만, 명단 순서) */
  members: { id: StudentId; name: string; done: boolean; absent: boolean }[];
}

/** 화면에 그릴 모양으로 묶는다. 명단에 없는 학생은 빼고, 결석한 학생은 표시만 한다 */
export function roleViews(
  roles: RoleItem[] | undefined,
  students: { id: StudentId; name: string; archived?: true }[],
  done: RoleDone | undefined,
  absent: (id: StudentId) => boolean,
): RoleView[] {
  return (roles ?? []).map((role) => ({
    role,
    members: students.filter((s) => !s.archived && role.students.includes(s.id))
      .map((s) => ({ id: s.id, name: s.name, done: !!done?.[role.id]?.includes(s.id), absent: absent(s.id) })),
  }));
}

/** 오늘 해야 할 일(역할 × 학생, 결석 제외) 중 몇 개를 했는지 */
export function roleProgress(views: RoleView[]): { total: number; done: number } {
  const todo = views.flatMap((v) => v.members.filter((m) => !m.absent));
  return { total: todo.length, done: todo.filter((m) => m.done).length };
}

/** "했어요"를 켜거나 끈다 (원래 기록은 그대로 두고 새 기록을 돌려준다) */
export function toggleDone(done: RoleDone | undefined, roleId: string, studentId: StudentId): RoleDone {
  const now = done?.[roleId] ?? [];
  const next = now.includes(studentId) ? now.filter((id) => id !== studentId) : [...now, studentId];
  const rest = { ...done };
  if (next.length) rest[roleId] = next; else delete rest[roleId];
  return rest;
}

/** 학생을 그 역할에 넣거나 뺀다 */
export function toggleMember(roles: RoleItem[], roleId: string, studentId: StudentId): RoleItem[] {
  return roles.map((r) => (r.id !== roleId ? r
    : { ...r, students: r.students.includes(studentId) ? r.students.filter((id) => id !== studentId) : [...r.students, studentId] }));
}

/** 역할을 한 칸씩 돌린다: 첫째 역할을 맡던 학생들이 둘째 역할을, …, 마지막 역할의 학생들이 첫째 역할을 맡는다 */
export function rotateRoles(roles: RoleItem[]): RoleItem[] {
  if (roles.length < 2) return roles;
  return roles.map((r, i) => ({ ...r, students: roles[(i + roles.length - 1) % roles.length].students }));
}

/** 아직 역할이 없는 학생 */
export function withoutRole<S extends { id: StudentId; archived?: true }>(roles: RoleItem[], students: S[]): S[] {
  const taken = new Set(roles.flatMap((r) => r.students));
  return students.filter((s) => !s.archived && !taken.has(s.id));
}

/** 저장하기 전에 다듬는다: 이름 없는 역할과 명단에 없는 학생을 뺀다 */
export function cleanRoles(roles: RoleItem[], studentIds: StudentId[]): RoleItem[] {
  const ok = new Set(studentIds);
  return roles.filter((r) => r.name.trim())
    .map((r) => ({ ...r, name: r.name.trim(), desc: r.desc.trim(), students: [...new Set(r.students)].filter((id) => ok.has(id)) }));
}
