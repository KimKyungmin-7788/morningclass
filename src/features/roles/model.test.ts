import { describe, expect, it } from 'vitest';
import type { RoleItem } from '@/core/data/types';
import { cleanRoles, roleProgress, roleViews, rotateRoles, toggleDone, toggleMember, withoutRole } from './model';

const students = [{ id: 's1', name: '가' }, { id: 's2', name: '나' }, { id: 's3', name: '다' }, { id: 's4', name: '라', archived: true as const }];
const roles: RoleItem[] = [
  { id: 'r1', icon: '🌱', name: '화분 물 주기', desc: '', students: ['s1', 's2'] },
  { id: 'r2', icon: '💡', name: '불 끄기', desc: '', students: ['s2'] },
  { id: 'r3', icon: '🧽', name: '칠판 지우기', desc: '', students: [] },
];

describe('1인 1역할', () => {
  it('한 역할을 두 명이 함께 맡고, 역할 없는 학생이 있어도 된다', () => {
    const views = roleViews(roles, students, undefined, () => false);
    expect(views[0].members.map((m) => m.name)).toEqual(['가', '나']);
    expect(views[2].members).toEqual([]);
    expect(withoutRole(roles, students).map((s) => s.id)).toEqual(['s3']);
  });
  it('명단에서 빠진 학생은 보이지 않는다', () => {
    const views = roleViews([{ ...roles[0], students: ['s1', 's4', 'gone'] }], students, undefined, () => false);
    expect(views[0].members.map((m) => m.id)).toEqual(['s1']);
  });
  it('했어요를 켜고 끄며, 원래 기록은 바뀌지 않는다', () => {
    const a = toggleDone(undefined, 'r1', 's1');
    expect(a).toEqual({ r1: ['s1'] });
    const b = toggleDone(a, 'r1', 's2');
    expect(b).toEqual({ r1: ['s1', 's2'] });
    expect(a).toEqual({ r1: ['s1'] });
    expect(toggleDone(toggleDone(b, 'r1', 's1'), 'r1', 's2')).toEqual({});
  });
  it('진행률은 결석한 학생을 빼고 센다', () => {
    const done = { r1: ['s1'], r2: ['s2'] };
    expect(roleProgress(roleViews(roles, students, done, () => false))).toEqual({ total: 3, done: 2 });
    expect(roleProgress(roleViews(roles, students, done, (id) => id === 's2'))).toEqual({ total: 1, done: 1 });
  });
  it('학생을 역할에 넣고 뺀다', () => {
    const added = toggleMember(roles, 'r3', 's3');
    expect(added[2].students).toEqual(['s3']);
    expect(toggleMember(added, 'r3', 's3')[2].students).toEqual([]);
    expect(roles[2].students).toEqual([]);
  });
  it('한 칸씩 돌리면 맡은 학생들이 다음 역할로 간다', () => {
    const turned = rotateRoles(roles);
    expect(turned.map((r) => r.students)).toEqual([[], ['s1', 's2'], ['s2']]);
    expect(turned.map((r) => r.name)).toEqual(roles.map((r) => r.name));
    expect(rotateRoles(rotateRoles(turned)).map((r) => r.students)).toEqual(roles.map((r) => r.students));
  });
  it('저장 전에 이름 없는 역할과 없는 학생을 뺀다', () => {
    const cleaned = cleanRoles([...roles, { id: 'r4', icon: '⭐', name: '  ', desc: '', students: ['s1'] }, { id: 'r5', icon: '⭐', name: ' 책 정리 ', desc: ' 책을 꽂아요 ', students: ['s1', 's1', 'gone'] }], ['s1', 's2', 's3']);
    expect(cleaned.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r5']);
    expect(cleaned[3]).toMatchObject({ name: '책 정리', desc: '책을 꽂아요', students: ['s1'] });
  });
});
