import { MAX_PERIODS } from '@/core/data/timetables';

// 시간표 맞추기 규칙 (화면과 무관한 계산)

/** 7칸으로 맞춘다 */
export const pad7 = (list: string[] | null | undefined): string[] => {
  const a = (list ?? []).slice(0, MAX_PERIODS).map((x) => x ?? '');
  while (a.length < MAX_PERIODS) a.push('');
  return a;
};

/** 과목 카드를 옮긴 결과. from: 보관함이면 null, 칸이면 그 번호 / to: 칸 번호 또는 'bank' */
export function move(slots: string[], name: string, from: number | null, to: number | 'bank'): string[] {
  const next = [...slots];
  if (to === 'bank') { if (from != null) next[from] = ''; return next; }   // 칸의 카드를 보관함에 놓으면 그 칸을 비운다
  if (from != null) { next[from] = slots[to]; next[to] = name; return next; }   // 칸 → 칸: 서로 바꾼다
  next[to] = name;                                                             // 보관함 → 칸: 덮어쓴다 (같은 과목을 여러 번 쓸 수 있다)
  return next;
}

/** 뒤쪽 빈 칸을 뺀다 — 입력한 만큼만 저장 */
export function trimEnd(slots: string[]): string[] {
  const a = [...slots];
  while (a.length && !a[a.length - 1]) a.pop();
  return a;
}

export const hasAnswer = (answer: string[]) => answer.some(Boolean);
/** 정답이 있는 칸이 모두 맞았는가 (정답이 빈 칸은 무엇을 넣어도 된다) */
export const isCorrect = (slots: string[], answer: string[]) => hasAnswer(answer) && answer.every((a, i) => !a || slots[i] === a);
/** 모든 칸이 정답과 똑같은가 (완료 버튼에 "완벽해요" 표시) */
export const isPerfect = (slots: string[], answer: string[]) => hasAnswer(answer) && slots.every((s, i) => !!s && s === answer[i]);
