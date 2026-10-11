import { describe, expect, it } from 'vitest';
import { progressOf } from './day';
import { emptyClass, emptyRecord } from './types';

describe('아침 준비 진행률', () => {
  const cls = { ...emptyClass('c1'), students: [{ id: 's1', name: '가' }] };
  const rec = { ...emptyRecord('c1', '20261011'), weather: { label: '맑음' }, dust: { label: '보통' }, attendance: { s1: { status: 'present' as const } } };
  const ALL = ['weather', 'word', 'attendance', 'timetable', 'dday', 'emotions', 'helper', 'meal', 'notes', 'tools', 'book'];

  it('놓인 카드를 알려 주지 않으면 7가지를 모두 센다', () => {
    expect(progressOf(rec, cls, true)).toEqual([true, true, true, true, false, false, false]);
  });
  it('모든 카드가 놓여 있으면 7가지 그대로다', () => {
    expect(progressOf(rec, cls, true, ALL)).toEqual(progressOf(rec, cls, true));
  });
  it('보관함에 넣은 카드의 항목은 세지 않는다', () => {
    const placed = ALL.filter((c) => c !== 'timetable' && c !== 'emotions' && c !== 'meal');
    expect(progressOf(rec, cls, true, placed)).toEqual([true, true, true, true]);
  });
  it('날씨 카드를 빼면 날씨와 미세먼지를 함께 뺀다', () => {
    expect(progressOf(rec, cls, true, ALL.filter((c) => c !== 'weather'))).toHaveLength(5);
  });
  it('날짜는 카드가 하나도 없어도 센다 (빈 칸 null 은 무시)', () => {
    expect(progressOf(rec, cls, false, [null, null])).toEqual([false]);
  });
});
