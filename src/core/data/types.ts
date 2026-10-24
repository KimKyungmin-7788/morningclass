// 아침교실 v2 저장 형식. 형식을 바꾸면 SCHEMA_VERSION 을 올리고 변환 함수를 추가한다.

export const SCHEMA_VERSION = 9;

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
  /** 처음 선택한 옷입히기 아바타. 없으면 첫 선택을 기다린다. */
  outfitAvatar?: OutfitAvatar;
  /** 마음 일기에서 고른 캐릭터. 날짜와 무관하게 유지한다. */
  emotionAvatar?: 'boy' | 'girl';
  /** 감정·옷입히기에 함께 쓰는 320px 얼굴 사진. 원본은 보관하지 않는다. */
  facePhoto?: string;
}

/** 1인 1역할의 역할 하나: 그림 · 이름 · 하는 일 · 맡은 학생들 */
export interface RoleItem { id: string; icon: string; name: string; desc: string; students: StudentId[] }

/** 칭찬판 설정: 판 모양 · 칸 수 · 칭찬 이유 · 보상 후보 · 1인 1역할 "했어요"에 스티커를 자동으로 줄지 */
export interface PraiseConfig { shape: 'grape' | 'tree' | 'star'; size: number; reasons: string[]; rewards: string[]; autoRole: boolean }
/** 한 학생에게만 더해 주는 칭찬 이유와 보상 (개별화) — 공통으로 정한 것에 더해 그 학생에게만 보인다 */
export interface PraiseOwn { reasons: string[]; rewards: string[] }
/** 학생의 칭찬판: 지금 판에 모은 개수와 지금까지 완성한 판 수 */
export interface PraiseTally { now: number; boards: number }
/** 칭찬 스티커 하나: 누가 · 무엇으로 · 언제 (role = 1인 1역할 "했어요"로 자동으로 받은 것) */
export interface PraiseLog { id: string; s: StudentId; r: string; at: string; role?: string }

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
  /** hidden = 숨긴 기본 과목, custom = 추가한 과목, icons = 바꾼 아이콘, order = 교과 보관함에 놓는 순서(없으면 기본 순서) */
  subjects: { hidden: string[]; custom: string[]; icons: Record<string, string>; order?: string[] };
  options: {
    attInclude?: Partial<AttInclude>;
    emoMode?: 'drag' | 'tap';
    helperMode?: 'helper' | 'lucky';
    /** 도우미 · 행운을 뽑는 방식 (기본 · 복권 · 사다리 · 빠칭코 · 돌림판) */
    drawStyle?: 'basic' | 'scratch' | 'ladder' | 'marble' | 'wheel';
    mealHidden?: string[];
    tools?: Partial<Record<'clock' | 'timer' | 'stopwatch' | 'noise' | 'board', boolean>>;
    timetableAutoLoad?: boolean;
    video?: { url: string; title: string };
    /** 1인 1역할: 역할과 맡은 학생 (선생님이 바꿀 때까지 그대로 간다) */
    roles?: RoleItem[];
    /** 칭찬판 설정과 학생별 진행 (스티커 하나하나의 기록은 날마다 그날 기록에 남는다) */
    praise?: Partial<PraiseConfig>;
    praiseTally?: Record<StudentId, PraiseTally>;
    /** 학생별 맞춤 칭찬 이유 · 보상 */
    praiseOwn?: Record<StudentId, Partial<PraiseOwn>>;
    /** 대시보드 배치표: 칸 이름 → 카드 이름 (null = 빈 칸). 없으면 기본 배치 (features/layout/model.ts) */
    layout?: Record<string, string | null>;
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

export type OutfitAvatar = 'boy' | 'girl';
export type OutfitItem = 'base-shirt' | 'shirt' | 'sweater' | 'shorts' | 'pants' | 'jacket' | 'puffer' | 'sneakers' | 'boots' | 'stripe-shirt' | 'pink-cardigan' | 'chinos' | 'spring-cap' | 'spring-scarf' | 'lemon-shirt' | 'summer-shorts' | 'sun-hat' | 'rust-sweatshirt' | 'denim-jacket' | 'cargo-pants' | 'winter-coat' | 'knit-hat' | 'wool-scarf' | 'umbrella';
export type OutfitClothes = Record<'top' | 'bottom', OutfitItem> & Partial<Record<'outer' | 'shoes' | 'hat' | 'neck' | 'hand', OutfitItem>>;
export interface StudentOutfit {
  avatar: OutfitAvatar;
  clothes: OutfitClothes;
  season: '봄' | '여름' | '가을' | '겨울' | 'all';
  weather: '맑음' | '비' | '눈' | '바람';
  completedAt: string;
}
export interface DayRecord {
  /** 선택 날짜에 완료한 학생별 옷차림. 초안은 저장하지 않는다. */
  outfits?: Record<StudentId, StudentOutfit>;
  lastOutfitStudentId?: StudentId;
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
  /** 1인 1역할 "오늘 했어요": 역할 → 그날 한 학생들 */
  roleDone?: Record<string, StudentId[]>;
  /** 그날 준 칭찬 스티커와, 판을 완성해 받은 보상 */
  praise?: PraiseLog[];
  praiseRewards?: { s: StudentId; reward: string; at: string }[];
  /** 오늘의 어휘 '다같이 써보기'를 마쳤는지 (쓴 글씨는 저장하지 않는다) */
  wordDone?: true;
  /** 오늘의 생활표현: 따라 말하기를 마친 학생 */
  exprDone?: StudentId[];
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
  studentNotes: StudentNote[];
  ieps: Iep[];
  notesConfig: NotesConfig;
  recoveryKey?: string;
  expr: Record<ClassId, ExprBook>;
  schemaVersion: number;
  classes: ClassRoom[];
  currentClassId: ClassId;
  records: DayRecord[];
  timetables: Timetable[];
  ddays: Record<ClassId, Loose[]>;
  /** 학급별 "오늘 날짜를 입력했는지" (실제 날짜 문자열) */
  dateSet: Record<ClassId, string>;
  /** 출결 대시보드에서 손으로 고친 수업일수. 열쇠 '<학급>_<시작일>_<종료일>' */
  schoolDays: Record<string, number>;
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
    studentNotes: [], ieps: [], notesConfig: defaultNotesConfig(), expr: {},
    records: [], timetables: [], ddays: {}, dateSet: {}, schoolDays: {}, lessons: [], mealImages: {}, videos: [],
  };
}

/** 새 고유 번호 (예: s_m3k9x2ab_1f) */
let idSeq = 0;
export function newId(prefix: string): string {
  idSeq += 1;
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}_${idSeq.toString(36)}`;
}

export type NoteCategory = 'study' | 'behavior' | 'challenge' | 'health' | 'peer' | 'home';
export type SupportLevel = 'independent' | 'verbal' | 'model' | 'physical';
export type Semester = string;
export interface StudentNote {
  id: string; classId: ClassId; studentId: StudentId; at: string; text: string;
  category?: NoteCategory; goalId?: string; support?: SupportLevel;
  abc?: { a: string; b: string; c: string; intensity?: 'low' | 'mid' | 'high'; minutes?: number };
  share?: true; batch?: string; updatedAt: string;
}
export interface Iep { id: string; classId: ClassId; studentId: StudentId; semester: Semester; subjects: IepSubject[] }
export interface IepSubject { id: string; name: string; goals: IepSemesterGoal[] }
export interface IepSemesterGoal { id: string; text: string; monthly: IepMonthlyGoal[] }
export interface IepMonthlyGoal { id: string; text: string; months: number[] }
export interface NotesConfig { quick: string[]; abcA: string[]; abcC: string[] }
export const defaultNotesConfig = (): NotesConfig => ({
  quick: ['스스로 했어요', '도움 받아 했어요', '친구를 도왔어요', '집중이 어려웠어요', '기분이 좋아 보였어요', '⚠ 도전행동'],
  abcA: ['과제 제시', '활동 전환', '요구 거절', '기다리기', '소음'],
  abcC: ['휴식 제공', '과제 조정', '무시하기', '대체 행동 안내', '자리 이동'],
});
/** 생활표현 설정도 백업에 함께 담는다. */
export type ExprLevel = 'sentence' | 'word' | 'card';
export interface ExprBag { used: string[]; days: Record<string, string> }
export interface ExprBook { levels: Record<string, ExprLevel>; bag: ExprBag; plan: Record<string, string> }
