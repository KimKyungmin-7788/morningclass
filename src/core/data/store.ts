import { create } from 'zustand';
import * as db from '@/core/storage/db';
import { usePrefs } from '@/core/prefs';
import { resetKvCache } from './kv';
import { useDay } from './day';
import { resetTimetableCache } from './timetables';
import { hasLegacyData, migrateLegacy, type LegacyDump, type MigrationReport } from './migrateLegacy';
import { emptyClass, emptyData, newId, type AppData, type ClassId, type ClassRoom } from './types';

// 학급 자료의 메모리 사본. 화면은 이것을 구독하고, 바꾸면 저장소(IndexedDB)에 바로 쓴다.
// 하루 기록·시간표처럼 양이 많은 자료는 필요할 때 core/storage 에서 읽는다(해당 기능 단계에서 추가).

type Boot = 'loading' | 'ready' | 'error';

interface DataState {
  boot: Boot;
  bootError: string;
  /** 이번에 기존 자료를 변환했다면 그 결과 (안내용) */
  migration: MigrationReport | null;
  classes: ClassRoom[];
  currentClassId: ClassId;

  init: () => Promise<void>;
  setCurrentClass: (id: ClassId) => Promise<void>;
  /** 학급 하나를 고친다 (없으면 추가) */
  saveClass: (cls: ClassRoom) => Promise<void>;
  /** 새 학급을 만들어 그 학급으로 바꾼다 (학교 정보는 이어받음) */
  addClass: (preset?: Partial<ClassRoom>) => Promise<ClassId>;
  /** 학급과 그 학급의 기록·시간표·D-DAY 를 지운다 */
  deleteClass: (id: ClassId) => Promise<void>;
  /** 이 기기의 아침교실 자료를 모두 지운다 (되돌릴 수 없음) */
  wipeAll: () => Promise<void>;
  /** 저장소 전체를 바꾼다 (백업 가져오기) */
  replaceAll: (data: AppData) => Promise<void>;
}

/** 기존 앱이 localStorage 에 남긴 자료를 읽기만 한다 (지우지 않는다) */
function readLegacyDump(): LegacyDump {
  const dump: LegacyDump = {};
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('mc_')) dump[k] = localStorage.getItem(k) ?? '';
    }
  } catch {
    /* 저장소를 못 읽으면 빈 상태로 시작 */
  }
  return dump;
}

let initStarted = false;

export const useData = create<DataState>((set, get) => ({
  boot: 'loading',
  bootError: '',
  migration: null,
  classes: [],
  currentClassId: '',

  init: async () => {
    if (initStarted) return;                                    // 개발 모드에서 두 번 불려도 변환은 한 번만
    initStarted = true;
    try {
      let migration: MigrationReport | null = null;
      if ((await db.kvGet<number>('schemaVersion')) == null) {
        // 새 저장소가 비어 있음 → 기존 자료가 있으면 변환, 없으면 빈 학급 하나로 시작
        const dump = readLegacyDump();
        if (hasLegacyData(dump)) {
          const result = migrateLegacy(dump);
          await db.replaceAll(result.data);
          await db.kvSet('migratedAt', new Date().toISOString());
          const { muted, appMode, lastBackup } = result.prefs;
          usePrefs.getState().set({ ...(muted != null ? { muted } : {}), ...(appMode ? { appMode } : {}), ...(lastBackup ? { lastBackup } : {}) });
          migration = result.report;
        } else {
          await db.replaceAll(emptyData());
        }
      }
      void db.requestPersistence();
      const classes = await db.getClasses();
      const saved = await db.kvGet<string>('currentClassId');
      const currentClassId = classes.some((c) => c.id === saved) ? saved! : classes[0]?.id ?? '';
      set({ boot: 'ready', classes, currentClassId, migration });
    } catch (e) {
      set({ boot: 'error', bootError: e instanceof Error ? e.message : String(e) });
    }
  },

  setCurrentClass: async (id) => {
    if (!get().classes.some((c) => c.id === id)) return;
    set({ currentClassId: id });
    await db.kvSet('currentClassId', id);
  },

  saveClass: async (cls) => {
    const list = get().classes;
    set({ classes: list.some((c) => c.id === cls.id) ? list.map((c) => (c.id === cls.id ? cls : c)) : [...list, cls] });
    await db.putClass(cls);
  },

  addClass: async (preset) => {
    // 같은 학교의 다른 반이 흔하므로 학교명·과정·급식 코드·영상은 이어받고 학급명·학생만 비운다
    const { classes, currentClassId } = get();
    const src = classes.find((c) => c.schoolName) ?? classes.find((c) => c.id === currentClassId);
    const cls: ClassRoom = {
      ...emptyClass(newId('c')),
      ...(src ? { schoolName: src.schoolName, level: src.level, neis: { ...src.neis }, options: src.options.video ? { video: src.options.video } : {} } : {}),
      ...preset,
    };
    await get().saveClass(cls);
    await get().setCurrentClass(cls.id);
    return cls.id;
  },

  deleteClass: async (id) => {
    const rest = get().classes.filter((c) => c.id !== id);
    if (!rest.length) return;                                    // 마지막 학급은 지우지 않는다
    await db.deleteClassData(id);
    set({ classes: rest });
    resetKvCache();
    resetTimetableCache();
    if (get().currentClassId === id) await get().setCurrentClass(rest[0].id);
  },

  wipeAll: async () => {
    await db.destroy();
    try {
      // 기존 앱이 남긴 자료도 함께 지운다 — 남겨 두면 다음에 열 때 다시 옮겨 온다
      Object.keys(localStorage).filter((k) => k.startsWith('mc_') || k.startsWith('mc2_')).forEach((k) => localStorage.removeItem(k));
    } catch {
      /* 무시 */
    }
  },

  replaceAll: async (data) => {
    await db.replaceAll(data);
    resetKvCache();
    resetTimetableCache();
    const currentClassId = data.classes.some((c) => c.id === data.currentClassId) ? data.currentClassId : data.classes[0].id;
    set({ classes: data.classes, currentClassId, migration: null });
    await useDay.getState().load(currentClassId);                // 같은 학급이어도 기록이 바뀌었으므로 다시 읽는다
  },
}));

/** 지금 고른 학급 */
export function useCurrentClass(): ClassRoom | undefined {
  return useData((s) => s.classes.find((c) => c.id === s.currentClassId));
}

/** 명단의 학생만 (보관된 학생 제외) */
export const activeStudents = (cls: ClassRoom | undefined) => (cls?.students ?? []).filter((s) => !s.archived);
