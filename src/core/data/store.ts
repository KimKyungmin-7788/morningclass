import { create } from 'zustand';
import * as db from '@/core/storage/db';
import { usePrefs } from '@/core/prefs';
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
  addClass: () => Promise<ClassId>;
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
          const { muted, appMode } = result.prefs;
          usePrefs.getState().set({ ...(muted != null ? { muted } : {}), ...(appMode ? { appMode } : {}) });
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

  addClass: async () => {
    const cls = emptyClass(newId('c'));
    await get().saveClass(cls);
    return cls.id;
  },

  replaceAll: async (data) => {
    await db.replaceAll(data);
    const currentClassId = data.classes.some((c) => c.id === data.currentClassId) ? data.currentClassId : data.classes[0].id;
    set({ classes: data.classes, currentClassId, migration: null });
  },
}));

/** 지금 고른 학급 */
export function useCurrentClass(): ClassRoom | undefined {
  return useData((s) => s.classes.find((c) => c.id === s.currentClassId));
}

/** 명단의 학생만 (보관된 학생 제외) */
export const activeStudents = (cls: ClassRoom | undefined) => (cls?.students ?? []).filter((s) => !s.archived);
