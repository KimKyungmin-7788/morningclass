import { create } from 'zustand';

// 이 기기에만 기억하는 보기 설정 (소리 끄기, 마지막으로 쓴 교실).
// 2단계에서 저장 창구(core/storage)가 생기면 그쪽으로 옮긴다.

export type AppMode = 'morning' | 'lesson';

interface Prefs {
  muted: boolean;
  appMode: AppMode;
  /** 마지막으로 백업 파일을 받은 때 */
  lastBackup: string;
  /** 급식 목록 보기 방식 */
  mealView: 'pic' | 'text';
  /** 따라쓰기 학습지: 흐린 글씨(점선 글자) 켜기·끄기, 쓰기 칸 크기(mm) */
  wsOpts: { dot: boolean; size: number };
  /** 판서: 용지, 바탕색, 도구 영역 펼침, 쓰기 시작하면 옵션 카드 닫기 */
  board: { paper: string; bg: string; panelOpen: boolean; autoClose: boolean };
}

const KEY = 'mc2_prefs';
const DEFAULTS: Prefs = { muted: false, appMode: 'morning', lastBackup: '', mealView: 'pic', wsOpts: { dot: true, size: 15 }, board: { paper: 'blank', bg: '#FFFFFF', panelOpen: true, autoClose: true } };

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
    const { muted, appMode, lastBackup, mealView, wsOpts, board } = get();
    try {
      localStorage.setItem(KEY, JSON.stringify({ muted, appMode, lastBackup, mealView, wsOpts, board }));
    } catch {
      /* 저장소를 못 쓰는 환경에서도 화면은 동작해야 한다 */
    }
  },
}));
