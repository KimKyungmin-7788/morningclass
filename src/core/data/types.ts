// 아침교실 v2 저장 형식. 형식을 바꾸면 SCHEMA_VERSION 을 올리고 변환 함수를 추가한다.

export const SCHEMA_VERSION = 1;

export type ClassId = string;
export type StudentId = string;
/** 날짜 열쇠 'YYYYMMDD' */
export type DateKey = string;

export type SchoolLevel = '' | 'elem' | 'middle' | 'high';
export type AttendanceStatus = 'present' | 'late' | 'early' | 'absent';
export type AbsentReason = '질병' | '인정' | '기타' | '미인정';
export type EmotionKind = 'joy' | 'sad' | 'angry' | 'tired' | 'excited' | 'anxious' | 'meh' | 'sick';

export interface Student {
  id: StudentId;
  name: string;
  /** 지금 명단에는 없지만 과거 기록이 남아 있는 학생 (전출·개명 전 이름) */
  archived?: true;
}

export interface AttInclude {
  emoLate: boolean; emoEarly: boolean; emoAbsent: boolean;
  helpLate: boolean; helpEarly: boolean; helpAbsent: boolean;
}

export interface ClassRoom {
  id: ClassId;
  schoolName: string;
  className: string;
  level: SchoolLevel;
  neis: { atptCode: string; schoolCode: string; key?: string };
  students: Student[];
  /** 학생별 알레르기 번호(NEIS 1~19) */
  allergies: Record<StudentId, number[]>;
  subjects: { hidden: string[]; custom: string[]; icons: Record<string, string> };
  options: {
    attInclude?: Partial<AttInclude>;
    emoMode?: 'drag' | 'tap';
    helperMode?: 'helper' | 'lucky';
    mealHidden?: string[];
    tools?: Partial<Record<'clock' | 'timer' | 'stopwatch', boolean>>;
    video?: { url: string; title: string };
  };
}

export interface EmotionItem { k: EmotionKind; x: number; y: number; zone: string }

export interface EmotionEntry {
  items: EmotionItem[];
  /** 초기 버전 기록(이모지·이름만 있음) 중 지금 감정 8종에 없는 것 — 기록 보기에 그대로 보여 주기 위해 보존 */
  legacy?: { emoji: string; label: string };
}

export interface Dish { name: string; codes: number[] }

/** 날씨·미세먼지 등 아직 세부 형식을 정하지 않은 값 (해당 기능 단계에서 좁힌다) */
export type Loose = Record<string, unknown>;

export interface DayRecord {
  classId: ClassId;
  date: DateKey;
  savedAt?: string;
  weather: Loose | null;
  dust: Loose | null;
  notes: string;
  attendance: Record<StudentId, { status: AttendanceStatus; reason?: AbsentReason }>;
  emotions: Record<StudentId, EmotionEntry>;
  timetable: { arranged: string[] | null; correct: boolean; notes: Record<string, string> };
  helpers: { ids: StudentId[]; pickedAt: string | null };
  lucky: { ids: StudentId[]; pickedAt: string | null };
  meal: { dishes: Dish[]; nutri: Loose | null; loadedAt: string | null } | null;
  /** 그날 완료 축하를 이미 봤는지 */
  celebrated?: true;
}

export interface Timetable {
  classId: ClassId;
  /** 0=월 … 4=금 (5·6 은 예전 자료 호환) */
  day: number;
  periods: string[];
}

export interface MealImage { src: string; full?: string; auto?: boolean; none?: boolean }

export interface VideoItem { url: string; videoId: string; title: string; playedAt: string }

/** 저장소 전체 — 백업 파일의 내용이기도 하다 */
export interface AppData {
  schemaVersion: number;
  classes: ClassRoom[];
  currentClassId: ClassId;
  records: DayRecord[];
  timetables: Timetable[];
  ddays: Record<ClassId, Loose[]>;
  /** 학급별 "오늘 날짜를 입력했는지" (실제 날짜 문자열) */
  dateSet: Record<ClassId, string>;
  lessons: Loose[];
  mealImages: Record<string, MealImage>;
  videos: VideoItem[];
}

export function emptyClass(id: ClassId): ClassRoom {
  return {
    id, schoolName: '', className: '', level: '',
    neis: { atptCode: '', schoolCode: '' },
    students: [], allergies: {},
    subjects: { hidden: [], custom: [], icons: {} },
    options: {},
  };
}

export function emptyRecord(classId: ClassId, date: DateKey): DayRecord {
  return {
    classId, date, weather: null, dust: null, notes: '',
    attendance: {}, emotions: {},
    timetable: { arranged: null, correct: false, notes: {} },
    helpers: { ids: [], pickedAt: null },
    lucky: { ids: [], pickedAt: null },
    meal: null,
  };
}

export function emptyData(): AppData {
  const cls = emptyClass(newId('c'));
  return {
    schemaVersion: SCHEMA_VERSION, classes: [cls], currentClassId: cls.id,
    records: [], timetables: [], ddays: {}, dateSet: {}, lessons: [], mealImages: {}, videos: [],
  };
}

/** 새 고유 번호 (예: s_m3k9x2ab_1f) */
let idSeq = 0;
export function newId(prefix: string): string {
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}_${idSeq.toString(36)}`;
}
