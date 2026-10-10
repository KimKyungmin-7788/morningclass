import {
  SCHEMA_VERSION, emptyClass, emptyRecord,
  type AbsentReason, type AppData, type AttendanceStatus, type ClassId, type ClassRoom, type DayRecord,
  type Dish, type EmotionEntry, type EmotionItem, type EmotionKind, type Loose, type MealImage,
  type SchoolLevel, type Student, type StudentId, type Timetable, type VideoItem,
} from './types';

// 기존 앱(app.html)의 저장 내용(mc_ 열쇠 묶음)을 v2 형식으로 바꾼다.
//  · 입력을 고치지 않는 순수 계산 — 같은 입력이면 항상 같은 결과(학생 번호 포함)
//  · 기존 백업 파일(JSON)도 같은 모양이므로 가져오기에 그대로 쓴다

export type LegacyDump = Record<string, string>;

export interface MigrationReport {
  classes: number;
  students: number;
  archivedStudents: number;
  records: number;
  timetables: number;
  /** 사용자에게 보여 줄 주의 사항 */
  warnings: string[];
}

/** 이 기기에만 두는 보기 설정 (저장소가 아니라 prefs 로 간다) */
export interface LegacyPrefs {
  muted?: boolean;
  appMode?: 'morning' | 'lesson';
  mealView?: 'pic' | 'text';
  wsOpts?: { dot: boolean; size: number };
  lastBackup?: string;
}

export interface MigrationResult { data: AppData; prefs: LegacyPrefs; report: MigrationReport }

const EMO_BY_LABEL: Record<string, EmotionKind> = {
  기쁨: 'joy', 슬픔: 'sad', 화남: 'angry', 피곤: 'tired', 신남: 'excited', 불안: 'anxious', 그냥: 'meh', 아픔: 'sick',
};
const EMO_KINDS = new Set<string>(Object.values(EMO_BY_LABEL));
const STATUSES = new Set<string>(['present', 'late', 'early', 'absent']);
const REASONS = new Set<string>(['질병', '인정', '기타', '미인정']);

function parse<T>(raw: string | undefined, fallback: T): T {
  if (raw == null) return fallback;
  try {
    const v = JSON.parse(raw) as T;
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
const obj = (v: unknown): Loose => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Loose) : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** 기존 자료가 들어 있는가 (없으면 변환할 것이 없다) */
export function hasLegacyData(dump: LegacyDump): boolean {
  return 'mc_classes' in dump || 'mc_settings' in dump;
}

/** 학급 하나의 이름 → 번호 대응표. 명단에 없는 이름은 '보관된 학생'으로 추가한다. */
class Roster {
  readonly students: Student[] = [];
  private byName = new Map<string, StudentId>();
  duplicates: string[] = [];

  constructor(private classId: ClassId, names: unknown[]) {
    for (const raw of names) {
      const name = str(raw).trim();
      if (!name) continue;
      const id = this.nextId();
      this.students.push({ id, name });
      if (this.byName.has(name)) this.duplicates.push(name); // 같은 이름: 기존 기록은 첫 학생에게 붙는다
      else this.byName.set(name, id);
    }
  }
  private nextId(): StudentId { return `${this.classId}-s${this.students.length + 1}`; }

  idOf(rawName: string): StudentId {
    const name = rawName.trim();
    const known = this.byName.get(name);
    if (known) return known;
    const id = this.nextId();
    this.students.push({ id, name, archived: true });
    this.byName.set(name, id);
    return id;
  }
}

function convertClass(raw: Loose, id: ClassId, fallbackCustom: string[]): { cls: ClassRoom; roster: Roster } {
  const roster = new Roster(id, arr(raw.students));
  const cfg = obj(raw.subjectCfg);
  const cls: ClassRoom = {
    ...emptyClass(id),
    schoolName: str(raw.schoolName),
    className: str(raw.className),
    level: (['elem', 'middle', 'high'].includes(str(raw.schoolLevel)) ? str(raw.schoolLevel) : '') as SchoolLevel,
    neis: { atptCode: str(raw.neisAtptCode), schoolCode: str(raw.neisSchoolCode), ...(str(raw.neisKey) ? { key: str(raw.neisKey) } : {}) },
    subjects: {
      hidden: arr(cfg.hidden).map(str).filter(Boolean),
      // 학급에 추가 과목 목록이 없으면 예전 공용 목록을 이어받는다 (기존 앱과 같은 규칙)
      custom: (Array.isArray(cfg.custom) ? cfg.custom : fallbackCustom).map(str).filter(Boolean),
      icons: Object.fromEntries(Object.entries(obj(cfg.icons)).map(([k, v]) => [k, str(v)]).filter(([, v]) => v)),
    },
    options: {
      ...(raw.attInclude ? { attInclude: obj(raw.attInclude) as ClassRoom['options']['attInclude'] } : {}),
      ...(raw.emoMode === 'tap' ? { emoMode: 'tap' as const } : {}),
      ...(raw.helperMode === 'lucky' ? { helperMode: 'lucky' as const } : {}),
      ...(Array.isArray(raw.mealHidden) ? { mealHidden: raw.mealHidden.map(str).filter(Boolean) } : {}),
      ...(raw.tools ? { tools: obj(raw.tools) as ClassRoom['options']['tools'] } : {}),
      ...(str(raw.bookUrl) ? { video: { url: str(raw.bookUrl), title: str(raw.bookTitle) } } : {}),
    },
  };
  // 알레르기: 이름 → 번호 (명단에 없는 이름은 보관된 학생으로)
  for (const [name, codes] of Object.entries(obj(raw.allergies))) {
    const list = arr(codes).map(Number).filter((n) => n >= 1 && n <= 19);
    if (name.trim() && list.length) cls.allergies[roster.idOf(name)] = list;
  }
  return { cls, roster };
}

function convertEmotion(v: unknown): EmotionEntry | null {
  const e = obj(v);
  if (Array.isArray(e.items)) {
    const items = e.items.map(obj).filter((it) => EMO_KINDS.has(str(it.k))).map((it): EmotionItem => ({
      k: str(it.k) as EmotionKind, x: Number(it.x) || 0.5, y: Number(it.y) || 0.47, zone: str(it.zone) || 'chest',
    }));
    return { items };
  }
  // 초기 버전: {emoji, label} 만 있음 → 가슴에 하나 있는 것으로 본다
  const kind = EMO_BY_LABEL[str(e.label)];
  if (kind) return { items: [{ k: kind, x: 0.5, y: 0.47, zone: 'chest' }] };
  if (str(e.label) || str(e.emoji)) return { items: [], legacy: { emoji: str(e.emoji), label: str(e.label) } };
  return null;
}

function convertRecord(raw: Loose, classId: ClassId, date: string, roster: Roster, draftNotes: string, celebrated: boolean): DayRecord {
  const rec = emptyRecord(classId, date);
  if (str(raw.savedAt)) rec.savedAt = str(raw.savedAt);
  rec.weather = raw.weather ? obj(raw.weather) : null;
  rec.dust = raw.dust ? obj(raw.dust) : null;
  rec.notes = str(raw.notes) || draftNotes;

  const reasons = obj(raw.attendanceReasons);
  for (const [name, status] of Object.entries(obj(raw.attendance))) {
    if (!name.trim() || !STATUSES.has(str(status))) continue;
    const reason = str(reasons[name]);
    rec.attendance[roster.idOf(name)] = {
      status: status as AttendanceStatus,
      ...(status === 'absent' && REASONS.has(reason) ? { reason: reason as AbsentReason } : {}),
    };
  }
  for (const [name, v] of Object.entries(obj(raw.emotions))) {
    const entry = name.trim() ? convertEmotion(v) : null;
    if (entry) rec.emotions[roster.idOf(name)] = entry;
  }
  rec.timetable = {
    arranged: Array.isArray(raw.timetableArranged) ? raw.timetableArranged.map(str) : null,
    correct: raw.timetableCorrect === true,
    notes: Object.fromEntries(Object.entries(obj(raw.timetableNotes)).map(([k, v]) => [k, str(v)]).filter(([, v]) => v)),
  };
  const ids = (v: unknown) => arr(v).map(str).filter((n) => n.trim()).map((n) => roster.idOf(n));
  rec.helpers = { ids: ids(raw.helpers), pickedAt: str(raw.helperPickedAt) || null };
  rec.lucky = { ids: ids(raw.lucky), pickedAt: str(raw.luckyPickedAt) || null };

  const names = str(raw.mealText).split('\n').map((x) => x.trim()).filter(Boolean);
  if (names.length) {
    const known = arr(raw.mealDishes).map(obj);
    const dishes: Dish[] = names.map((name) => {
      const d = known.find((x) => str(x.name) === name);
      return { name, codes: d ? arr(d.codes).map(Number).filter((n) => n >= 1 && n <= 19) : [] };
    });
    rec.meal = { dishes, nutri: raw.mealNutri ? obj(raw.mealNutri) : null, loadedAt: str(raw.mealLoadedAt) || null };
  }
  if (celebrated) rec.celebrated = true;
  return rec;
}

export function migrateLegacy(dump: LegacyDump): MigrationResult {
  const warnings: string[] = [];
  const fallbackCustom = parse<unknown[]>(dump.mc_custom_subjects, []).map(str);

  // 1) 학급 목록 — 더 예전(단일 학급) 자료는 학급 하나로 감싼다
  let rawClasses = parse<unknown[]>(dump.mc_classes, []).map(obj).filter((c) => str(c.id));
  let single = false;
  if (!rawClasses.length && dump.mc_settings) {
    rawClasses = [{ ...obj(parse<unknown>(dump.mc_settings, {})), id: 'c_legacy' }];
    single = true;
  }
  if (!rawClasses.length) rawClasses = [{ id: 'c_legacy' }];

  const classes: ClassRoom[] = [];
  const rosters = new Map<ClassId, Roster>();
  for (const raw of rawClasses) {
    const id = str(raw.id);
    if (rosters.has(id)) { warnings.push(`학급 번호가 겹쳐 하나만 옮겼어요: ${str(raw.className) || id}`); continue; }
    const { cls, roster } = convertClass(raw, id, fallbackCustom);
    classes.push(cls);
    rosters.set(id, roster);
  }
  const firstId = classes[0].id;
  const currentClassId = rosters.has(str(dump.mc_current_class)) ? str(dump.mc_current_class) : firstId;

  // 2) 열쇠를 훑어 학급별 자료를 모은다 (날짜순으로 처리해 보관된 학생 번호가 항상 같게)
  const records: DayRecord[] = [];
  const timetables: Timetable[] = [];
  const ddays: AppData['ddays'] = {};
  const dateSet: AppData['dateSet'] = {};
  const schoolDays: AppData['schoolDays'] = {};
  let orphanRecords = 0;
  const classOf = (id: string | undefined): ClassId | null => (id == null ? (single ? firstId : null) : rosters.has(id) ? id : null);

  for (const key of Object.keys(dump).sort()) {
    let m: RegExpMatchArray | null;
    if ((m = key.match(/^mc_record_(?:(.+)_)?(\d{8})$/))) {
      const classId = classOf(m[1]);
      if (!classId) { orphanRecords += 1; continue; }
      const prefix = m[1] ? `${m[1]}_` : '';
      const raw = obj(parse<unknown>(dump[key], {}));
      records.push(convertRecord(raw, classId, m[2], rosters.get(classId)!,
        str(dump[`mc_draft_notes_${prefix}${m[2]}`]), `mc_celebrated_${prefix}${m[2]}` in dump));
    } else if ((m = key.match(/^mc_timetable_(?:(.+)_)?([0-6])$/))) {
      const classId = classOf(m[1]);
      if (!classId) continue;
      const periods = arr(obj(parse<unknown>(dump[key], {})).periods).map(str);
      if (periods.some(Boolean)) timetables.push({ classId, day: Number(m[2]), periods });
    } else if ((m = key.match(/^mc_ddays_(.+)$/))) {
      if (rosters.has(m[1])) ddays[m[1]] = parse<unknown[]>(dump[key], []).map(obj);
    } else if ((m = key.match(/^mc_date_set_(.+)$/))) {
      if (rosters.has(m[1])) dateSet[m[1]] = dump[key];
    } else if ((m = key.match(/^mc_sd_(.+)_(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/))) {
      const n = Number(dump[key]);
      if (rosters.has(m[1]) && Number.isFinite(n) && n >= 0) schoolDays[`${m[1]}_${m[2]}_${m[3]}`] = n;
    }
  }
  // 학급 구분이 없던 시절의 D-DAY·날짜 입력 표시는 지금 학급으로 (기존 앱과 같은 규칙)
  if (dump.mc_ddays != null && !ddays[currentClassId]) ddays[currentClassId] = parse<unknown[]>(dump.mc_ddays, []).map(obj);
  if (dump.mc_date_set != null && !dateSet[currentClassId]) dateSet[currentClassId] = dump.mc_date_set;

  // 3) 명단 확정 (기록에만 있던 이름이 보관된 학생으로 추가된 뒤)
  let archived = 0;
  for (const cls of classes) {
    const roster = rosters.get(cls.id)!;
    cls.students = roster.students;
    const gone = roster.students.filter((s) => s.archived);
    archived += gone.length;
    const label = cls.className || '이름 없는 학급';
    if (gone.length) warnings.push(`${label}: 지금 명단에 없는 학생 ${gone.length}명의 기록을 '보관된 학생'으로 옮겼어요 (${gone.map((s) => s.name).join(', ')})`);
    if (roster.duplicates.length) warnings.push(`${label}: 같은 이름이 있어 예전 기록은 첫 번째 학생에게 붙었어요 (${[...new Set(roster.duplicates)].join(', ')})`);
  }
  if (orphanRecords) warnings.push(`삭제된 학급의 기록 ${orphanRecords}건은 옮기지 않았어요`);

  const mealImages: Record<string, MealImage> = {};
  for (const [k, v] of Object.entries(parse<Loose>(dump.mc_meal_images, {}))) {
    const o = obj(v);
    if (typeof o.src === 'string') {
      mealImages[k] = { src: o.src, ...(str(o.full) ? { full: str(o.full) } : {}), ...(o.auto ? { auto: true } : {}), ...(o.none ? { none: true } : {}) };
    }
  }
  const videos: VideoItem[] = parse<unknown[]>(dump.mc_video_list, []).map(obj).filter((v) => str(v.videoId))
    .map((v) => ({ url: str(v.url), videoId: str(v.videoId), title: str(v.title), playedAt: str(v.playedAt) }));

  const ws = obj(parse<unknown>(dump.mc_ws_opts, {}));
  const prefs: LegacyPrefs = {
    ...(dump.mc_muted != null ? { muted: dump.mc_muted === '1' } : {}),
    ...(dump.mc_app_mode === 'lesson' || dump.mc_app_mode === 'morning' ? { appMode: dump.mc_app_mode } : {}),
    ...(dump.mc_meal_view === 'text' || dump.mc_meal_view === 'pic' ? { mealView: dump.mc_meal_view } : {}),
    ...(dump.mc_ws_opts ? { wsOpts: { dot: ws.dot !== false, size: Number(ws.size) || 15 } } : {}),
    ...(dump.mc_last_backup ? { lastBackup: dump.mc_last_backup } : {}),
  };

  const data: AppData = {
    schemaVersion: SCHEMA_VERSION, classes, currentClassId, records, timetables, ddays, dateSet, schoolDays,
    lessons: parse<unknown[]>(dump.mc_lessons, []).map(obj), mealImages, videos,
  };
  const students = classes.reduce((n, c) => n + c.students.length, 0);
  return {
    data, prefs,
    report: { classes: classes.length, students: students - archived, archivedStudents: archived, records: records.length, timetables: timetables.length, warnings },
  };
}
