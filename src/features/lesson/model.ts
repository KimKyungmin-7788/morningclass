import { newId } from '@/core/data/types';

// 수업교실 규칙 (화면과 무관한 계산)

export type LessonModel = 'direct' | 'task' | 'inquiry' | 'coop' | 'concept';

export interface Lesson {
  id: string;
  /** 수업 날짜 'YYYY-MM-DD'. 비어 있으면 미지정 보관함 */
  date: string;
  subject: string;
  unit: string;
  title: string;
  period?: string;
  model: LessonModel;
  /** 편집기에서 '완료'를 누르기 전 */
  draft: boolean;
  /** 생각열기 (동기유발) */
  think: { type: string; url: string; title: string; question: string };
  review: string;
  reviewUrl?: string;
  objectives: string[];
  materials: string[];
  activity: string[];
  createdAt: number;
}

export const LESSON_MODELS: Record<LessonModel, string> = { direct: '직접교수', task: '과제분석', inquiry: '탐구학습', coop: '협동학습', concept: '개념학습' };
export const modelName = (m: string | undefined) => LESSON_MODELS[m as LessonModel] ?? '직접교수';

export const LESSON_TEMPLATES: Record<LessonModel, { objectives: string[]; activity: string[] }> = {
  direct: { objectives: ['오늘 배울 내용을 설명할 수 있다.'], activity: ['① 선생님 시범 보기', '② 함께 연습하기', '③ 스스로 해보기'] },
  task: { objectives: ['활동을 순서대로 따라 할 수 있다.'], activity: ['1단계 · 준비하기', '2단계 · 순서대로 하기', '3단계 · 확인하기'] },
  inquiry: { objectives: ['궁금한 점을 찾고 알아볼 수 있다.'], activity: ['① 질문 만들기', '② 자료 찾기·관찰', '③ 알게 된 점 나누기'] },
  coop: { objectives: ['친구와 힘을 모아 과제를 해결할 수 있다.'], activity: ['① 역할 정하기', '② 모둠 활동', '③ 발표·공유'] },
  concept: { objectives: ['새로운 개념의 뜻과 예를 말할 수 있다.'], activity: ['① 예·비例 살펴보기', '② 공통점 찾기', '③ 개념 정리하기'] },
};

export const fmtISO = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function newLesson(date: string): Lesson {
  return { id: newId('l'), date, subject: '', unit: '', title: '', model: 'direct', draft: true,
    think: { type: 'video', url: '', title: '', question: '' }, review: '', objectives: [''], materials: [], activity: [''], createdAt: Date.now() };
}

/** 저장된 자료(예전 것 포함)를 빠진 값 없이 채운다 */
export function normalizeLesson(raw: Partial<Lesson> & { id: string }): Lesson {
  const base = newLesson('');
  return {
    ...base, ...raw,
    think: { ...base.think, ...raw.think },
    objectives: raw.objectives?.length ? raw.objectives : [''],
    activity: raw.activity?.length ? raw.activity : [''],
    materials: raw.materials ?? [],
    draft: raw.draft === true,
  };
}

/** 복사본은 손보기 전이므로 임시저장으로 표시한다 */
export const duplicateLesson = (src: Lesson): Lesson => ({ ...structuredClone(src), id: newId('l'), title: `${src.title || '수업'} 복사`, createdAt: Date.now(), draft: true });

/** 과목 이름으로 고르는 색 (같은 과목은 늘 같은 색) */
export function subjectColor(subj: string | undefined): string {
  const colors = ['#5BB6FF', '#7C6BEC', '#F498B4', '#6BCB77', '#FFC93C', '#FF8A7A', '#38BDF8', '#F472B6'];
  const s = (subj ?? '').trim();
  if (!s) return '#cbd5e1';
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

/** 차시 표기 — '3' → '3차시', 이미 '차시'가 붙어 있으면 그대로 */
export function periodLabel(v: string | undefined): string {
  const p = String(v ?? '').trim();
  return !p ? '' : /차시\s*$/.test(p) ? p : `${p}차시`;
}

/** 목록 보기: 날짜별 묶음(최근 날짜 먼저), 날짜 없는 수업은 맨 뒤 '미지정' */
export function groupByDate(lessons: Lesson[]): { key: string; items: Lesson[] }[] {
  const sorted = [...lessons].sort((a, b) => (!a.date && !b.date ? 0 : !a.date ? 1 : !b.date ? -1 : a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const groups: { key: string; items: Lesson[] }[] = [];
  for (const l of sorted) {
    const key = l.date || '미지정';
    const g = groups.find((x) => x.key === key);
    if (g) g.items.push(l); else groups.push({ key, items: [l] });
  }
  return groups;
}

export const youtubeId = (url: string | undefined) => (url ?? '').match(/(?:youtu\.be\/|v=|shorts\/)([^&\n?#]+)/)?.[1] ?? '';

export type StepKind = 'think' | 'review' | 'obj' | 'mat' | 'act';
export interface Step { kind: StepKind; short: string; title: string; icon: string; speak: string }

/** 발표 모드에 보여 줄 단계 — 내용이 있는 것만 */
export function presentSteps(l: Lesson): Step[] {
  const filled = (list: string[] | undefined) => (list ?? []).filter((x) => (x ?? '').trim());
  const q = (l.think?.question ?? '').trim();
  const steps: Step[] = [];
  if (youtubeId(l.think?.url) || q) steps.push({ kind: 'think', icon: 'think', short: '생각열기', title: '생각열기', speak: q || '오늘의 생각열기예요' });
  if ((l.review ?? '').trim() || (l.reviewUrl ?? '').trim()) steps.push({ kind: 'review', icon: 'review', short: '전시학습', title: '전시학습 상기', speak: l.review || '전시학습을 살펴봐요' });
  if (filled(l.objectives).length) steps.push({ kind: 'obj', icon: 'objective', short: '학습목표', title: '오늘의 학습목표', speak: `오늘의 학습목표. ${filled(l.objectives).join('. ')}` });
  if (filled(l.materials).length) steps.push({ kind: 'mat', icon: 'materials', short: '준비물', title: '오늘의 준비물', speak: `준비물이에요. ${filled(l.materials).join(', ')}` });
  if (filled(l.activity).length) steps.push({ kind: 'act', icon: 'activity', short: '오늘 활동', title: '오늘의 활동', speak: `오늘의 활동이에요. ${filled(l.activity).join('. ')}` });
  return steps;
}

export const STEP_COLORS: Record<StepKind, { c: string; bg: string }> = {
  think: { c: '#E0930F', bg: '#FEF1D6' }, review: { c: '#0E9C89', bg: '#DBF4F0' }, obj: { c: '#7C6BEC', bg: '#EEEBFF' }, mat: { c: '#3B82F6', bg: '#E3EDFF' }, act: { c: '#1FA34C', bg: '#E0F4E5' },
};
