import { create } from 'zustand';

// 이 기기에만 기억하는 보기 설정 (소리 끄기, 마지막으로 쓴 교실).
// 2단계에서 저장 창구(core/storage)가 생기면 그쪽으로 옮긴다.

export type AppMode = 'morning' | 'lesson';

interface Prefs {
  muted: boolean;
  appMode: AppMode;
}

const KEY = 'mc2_prefs';
const DEFAULTS: Prefs = { muted: false, appMode: 'morning' };

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
    const { muted, appMode } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ muted, appMode }));
    } catch {
      /* 저장소를 못 쓰는 환경에서도 화면은 동작해야 한다 */
    }
  },
}));
