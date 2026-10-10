import type { ClassRoom, SchoolLevel } from './types';

// 과목: 학교급별 기본 과목, 아이콘, 학급별 설정(숨김·추가·아이콘)

const SUBJECT_ICONS: Record<string, string> = {
  국어: '📚', 영어: '📚', 수학: '🔢', 도덕: '💖', 체육: '⚽', 음악: '🎵', 미술: '🎨', 과학: '🔬',
  사회: '🌍', 직업: '🔧', 창체: '🎭', 진로: '🧭', 진로와직업: '🧰', 자율: '🌱', 동아리: '🤝',
  // 2022 개정 기본 교육과정 교과명
  '바른 생활': '🙋', '슬기로운 생활': '🧠', '즐거운 생활': '🎈', 실과: '🔧',
  봄: '🌸', 여름: '🌻', 가을: '🍁', 겨울: '⛄', '진로와 직업': '🧰', 일상생활: '🏠',
  '창체(자율자치)': '🌱', '창체(동아리)': '🤝', '창체(진로)': '🧭',
  // 이전 표기(활동 포함) — 이미 배치된 시간표 호환
  '일상생활 활동': '🏠', '창체(자율·자치 활동)': '🌱', '창체(동아리 활동)': '🤝', '창체(진로 활동)': '🧭',
};

/** 2022 개정 특수교육 기본 교육과정(교육부 고시 제2022-34호 [별첨 3]) 학교급별 교과(군)·창체·일상생활 활동 */
export const SUBJECTS_BY_LEVEL: Record<Exclude<SchoolLevel, ''>, string[]> = {
  elem: ['국어', '사회', '수학', '과학', '봄', '여름', '가을', '겨울', '체육', '음악', '미술', '실과',
    '일상생활', '창체(자율자치)', '창체(동아리)', '창체(진로)', '바른 생활', '슬기로운 생활', '즐거운 생활'],
  middle: ['국어', '사회', '수학', '과학', '진로와 직업', '체육', '음악', '미술', '일상생활', '창체(자율자치)', '창체(동아리)', '창체(진로)'],
  high: ['국어', '사회', '수학', '과학', '체육', '음악', '미술', '진로와 직업', '일상생활', '창체(자율자치)', '창체(동아리)', '창체(진로)'],
};
export const SCHOOL_LEVELS: [Exclude<SchoolLevel, ''>, string][] = [['elem', '초등학교'], ['middle', '중학교'], ['high', '고등학교']];

export const SUBJECT_ICON_CHOICES = ['📚', '📖', '✏️', '📝', '🔢', '➕', '🔬', '🧪', '🌍', '🗺️', '💖', '🙋', '🧠', '🎈', '⚽', '🏃', '🏊', '🎵', '🎹', '🎨', '✂️', '🔧', '🧰', '🧭',
  '🌱', '🤝', '🎭', '🏠', '🍳', '🧹', '🧺', '💻', '🗣️', '🎲', '🧩', '🚌', '🌳', '🌸', '🌻', '🍁', '⛄', '🧘', '🎬', '📷', '🐶', '🛒', '💰', '⭐'];

/** 학교 이름에 학교급이 드러나면 추정한다 (특수학교처럼 드러나지 않으면 null → 교사가 직접 고름) */
export function guessLevel(schoolName: string | undefined): Exclude<SchoolLevel, ''> | null {
  const n = schoolName ?? '';
  if (/고등학교|고교/.test(n)) return 'high';
  if (/중학교/.test(n)) return 'middle';
  if (/초등학교|국민학교/.test(n)) return 'elem';
  return null;
}

type ClassLike = Pick<ClassRoom, 'level' | 'schoolName' | 'subjects'> | undefined;

/** 저장된 값이 없으면 학교 이름에서 추정하고, 그래도 모르면 초등학교로 둔다 */
export const schoolLevelOf = (cls: ClassLike): Exclude<SchoolLevel, ''> => cls?.level || guessLevel(cls?.schoolName) || 'elem';
export const levelSubjects = (cls: ClassLike): string[] => SUBJECTS_BY_LEVEL[schoolLevelOf(cls)];
export const subjectIcon = (name: string, cls: ClassLike): string => cls?.subjects.icons[name.trim()] || SUBJECT_ICONS[name.trim()] || '📖';

/** 시간표 맞추기에 나오는 과목: 숨기지 않은 기본 과목 + 추가 과목 + 지금 시간표에 들어 있는 이름 */
export function subjectBank(cls: ClassLike, inUse: string[] = []): string[] {
  const hidden = cls?.subjects.hidden ?? [];
  return [...new Set([...levelSubjects(cls).filter((n) => !hidden.includes(n)), ...(cls?.subjects.custom ?? []), ...inUse.map((x) => x.trim()).filter(Boolean)])];
}

/** 과목 추가: 기본 과목 이름이면 숨김만 풀고, 아니면 추가 과목으로 등록 */
export function withSubject<T extends ClassRoom>(cls: T, name: string): T {
  const s = cls.subjects;
  const isBase = levelSubjects(cls).includes(name);
  return { ...cls, subjects: { ...s, hidden: s.hidden.filter((x) => x !== name), custom: isBase || s.custom.includes(name) ? s.custom : [...s.custom, name] } };
}
