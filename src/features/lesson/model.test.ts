import { describe, expect, it } from 'vitest';
import { duplicateLesson, groupByDate, newLesson, normalizeLesson, periodLabel, presentSteps, subjectColor, youtubeId } from './model';

const L = (id: string, date: string) => ({ ...newLesson(date), id });

describe('수업교실 규칙', () => {
  it('목록 묶기: 최근 날짜 먼저, 같은 날은 한 묶음, 날짜 없는 수업은 맨 뒤', () => {
    const groups = groupByDate([L('a', '2026-10-01'), L('b', ''), L('c', '2026-10-12'), L('d', '2026-10-01')]);
    expect(groups.map((g) => [g.key, g.items.map((l) => l.id)])).toEqual([['2026-10-12', ['c']], ['2026-10-01', ['a', 'd']], ['미지정', ['b']]]);
    expect(groupByDate([])).toEqual([]);
  });
  it('차시 표기와 과목 색', () => {
    expect([periodLabel('3'), periodLabel('3차시'), periodLabel(' 2~3 '), periodLabel(''), periodLabel(undefined)]).toEqual(['3차시', '3차시', '2~3차시', '', '']);
    expect(subjectColor('국어')).toBe(subjectColor(' 국어 '));
    expect(subjectColor('')).toBe('#cbd5e1');
  });
  it('복사본은 새 번호와 임시저장 표시를 갖고 원본과 따로 논다', () => {
    const src = { ...L('a', '2026-10-01'), title: '덧셈', draft: false, objectives: ['더할 수 있다'] };
    const copy = duplicateLesson(src);
    expect(copy).toMatchObject({ title: '덧셈 복사', draft: true, date: '2026-10-01' });
    expect(copy.id).not.toBe('a');
    copy.objectives.push('x');
    expect(src.objectives).toEqual(['더할 수 있다']);
  });
  it('예전 자료의 빠진 값을 채운다', () => {
    const l = normalizeLesson({ id: 'old', title: '옛 수업', objectives: [], think: { url: 'https://youtu.be/abc' } as never });
    expect(l).toMatchObject({ id: 'old', objectives: [''], activity: [''], materials: [], draft: false, model: 'direct' });
    expect(l.think).toEqual({ type: 'video', url: 'https://youtu.be/abc', title: '', question: '' });
  });
  it('발표 단계는 내용이 있는 것만 차례대로', () => {
    const l = { ...L('a', ''), objectives: ['', '말할 수 있다'], materials: ['가위'], activity: [''] };
    expect(presentSteps(l).map((s) => s.kind)).toEqual(['obj', 'mat']);
    const full = { ...l, think: { ...l.think, question: '무엇을 보았나요?' }, reviewUrl: 'https://example.com', activity: ['① 시범'] };
    expect(presentSteps(full).map((s) => s.kind)).toEqual(['think', 'review', 'obj', 'mat', 'act']);
    expect(presentSteps(full)[0].speak).toBe('무엇을 보았나요?');
    expect(presentSteps(L('b', ''))).toEqual([]);
  });
  it('유튜브 영상 번호', () => {
    expect([youtubeId('https://youtu.be/abc?t=1'), youtubeId('https://www.youtube.com/watch?v=xyz&a=1'), youtubeId('https://example.com'), youtubeId(undefined)]).toEqual(['abc', 'xyz', '', '']);
  });
});
