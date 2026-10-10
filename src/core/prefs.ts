import { create } from 'zustand';

// 이 기기에만 기억하는 보기 설정 (소리 끄기, 마지막으로 쓴 교실).
// 2단계에서 저장 창구(core/storage)가 생기면 그쪽으로 옮긴다.

export type AppMode = 'morning' | 'lesson';

interface Prefs {
  muted: boolean;
  appMode: AppMode;
  /** 마지막으로 백업 파일을 받은 때 */
  lastBackup: string;
  /** 백업 알림을 '나중에'로 미룬 날 (YYYYMMDD) */
  backupSnooze: string;
  /** 급식 목록 보기 방식 */
  mealView: 'pic' | 'text';
  /** 따라쓰기 학습지: 흐린 글씨(점선 글자) 켜기·끄기, 쓰기 칸 크기(mm) */
  wsOpts: { dot: boolean; size: number };
}

const KEY = 'mc2_prefs';
const DEFAULTS: Prefs = { muted: false, appMode: 'morning', lastBackup: '', backupSnooze: '', mealView: 'pic', wsOpts: { dot: true, size: 15 } };

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) || '{}') as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

interface PrefsState extends Prefs {
  set: (patch: Partial<Prefs>) => void;
}

export const usePrefs = create<PrefsState>((set, get) => ({
  ...load(),
  set: (patch) => {
    set(patch);
    const { muted, appMode, lastBackup, backupSnooze, mealView, wsOpts } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ muted, appMode, lastBackup, backupSnooze, mealView, wsOpts }));
    } catch {
      /* 저장소를 못 쓰는 환경에서도 화면은 동작해야 한다 */
    }
  },
}));
