import { create } from 'zustand';
import * as db from '@/core/storage/db';
import { toast } from '@/core/ui/toast';
import { emptyRecord, type ClassId, type ClassRoom, type DateKey, type DayRecord } from './types';

// 지금 화면이 다루는 "하루": 고른 날짜와 그날의 기록.
// 기능은 record 를 읽고 update() 로 고친다 — 고치면 바로 저장된다(빈 날은 저장하지 않는다).

export const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

export const dateKeyOf = (d: Date): DateKey =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
/** "오늘 날짜를 입력했는지" 표시에 쓰는 실제 날짜 문자열 (기존 앱과 같은 모양) */
export const realTodayKey = () => { const n = new Date(); return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`; };

interface DayState {
  classId: ClassId;
  date: Date;
  record: DayRecord;
  /** 이 학급에서 오늘 날짜를 입력했는가 (하루 단위, 학급별) */
  dateSet: boolean;
  /** 학급이나 날짜가 바뀌면 그 기록을 불러온다 */
  load: (classId: ClassId, date?: Date) => Promise<void>;
  /** 날짜를 입력(확정)한다 */
  confirmDate: (date: Date) => Promise<void>;
  update: (change: (rec: DayRecord) => void) => void;
}

let loadSeq = 0;

export const useDay = create<DayState>((set, get) => ({
  classId: '',
  date: new Date(),
  record: emptyRecord('', dateKeyOf(new Date())),
  dateSet: false,

  load: async (classId, date = get().date) => {
    const my = (loadSeq += 1);
    const key = dateKeyOf(date);
    const [saved, setOn] = await Promise.all([db.getRecord(classId, key), db.kvGet<string>(`dateSet:${classId}`)]);
    if (my !== loadSeq) return; // 그사이 다른 학급·날짜로 바뀜
    set({ classId, date, record: { ...emptyRecord(classId, key), ...saved }, dateSet: setOn === realTodayKey() });
  },

  confirmDate: async (date) => {
    const { classId } = get();
    await db.kvSet(`dateSet:${classId}`, realTodayKey());
    await get().load(classId, date);
  },

  update: (change) => {
    const rec = structuredClone(get().record);
    change(rec);
    rec.savedAt = new Date().toISOString();
    set({ record: rec });
    db.putRecord(rec).catch(() => toast('저장하지 못했어요. 설정에서 백업을 받아 주세요', 'error'));
  },
}));

/**
 * 특정 학급·날짜의 기록을 고친다. 지금 보고 있는 날이면 화면도 바뀌고, 아니면 저장소의 기록만 고친다.
 * (급식처럼 응답을 기다리는 사이 학급·날짜가 바뀔 수 있는 작업에 쓴다)
 */
export async function patchRecord(classId: ClassId, date: DateKey, change: (rec: DayRecord) => void): Promise<void> {
  const cur = useDay.getState();
  if (cur.classId === classId && cur.record.date === date) { cur.update(change); return; }
  const rec = { ...emptyRecord(classId, date), ...(await db.getRecord(classId, date)) };
  change(rec);
  rec.savedAt = new Date().toISOString();
  await db.putRecord(rec);
}

/** 아침 준비 7가지가 끝났는지 (기존 updateProgress 와 같은 기준) */
export function progressOf(rec: DayRecord, cls: ClassRoom | undefined, dateSet: boolean): boolean[] {
  const students = (cls?.students ?? []).filter((s) => !s.archived);
  return [
    dateSet,
    !!rec.weather,
    !!rec.dust,
    students.length > 0 && students.every((s) => rec.attendance[s.id]),
    Array.isArray(rec.timetable.arranged) && rec.timetable.arranged.some(Boolean),
    students.length > 0 && students.every((s) => rec.emotions[s.id]),
    !!rec.meal?.dishes.length,
  ];
}
