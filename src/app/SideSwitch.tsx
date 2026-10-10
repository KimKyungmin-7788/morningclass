import { usePrefs, type AppMode } from '@/core/prefs';
import { playSound } from '@/core/sound';

const MODES: { mode: AppMode; label: string; icon: string }[] = [
  { mode: 'morning', label: '아침교실', icon: 'ph-fill ph-sun-horizon' },
  { mode: 'lesson', label: '수업교실', icon: 'ph-fill ph-chalkboard-teacher' },
];

// 화면 오른쪽 옆 탭: 아침교실 ↔ 수업교실
export function SideSwitch() {
  const appMode = usePrefs((s) => s.appMode);
  const setPrefs = usePrefs((s) => s.set);
  return (
    <div id="app-side-switch">
      {MODES.map(({ mode, label, icon }) => (
        <button
          key={mode}
          className={`ass-btn${appMode === mode ? ' active' : ''}`}
          data-app={mode}
          aria-label={`${label}로 전환`}
          aria-pressed={appMode === mode}
          onClick={() => { if (appMode !== mode) { playSound('select'); setPrefs({ appMode: mode }); } }}
        >
          <span className="ss-ico"><i className={icon} /></span><span className="ss-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
