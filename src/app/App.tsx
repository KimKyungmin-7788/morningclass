import { usePrefs } from '@/core/prefs';
import { ToastHost } from '@/core/ui/toast';
import { Header } from './Header';
import { Dashboard } from './Dashboard';
import { Footer } from './Footer';
import { SideSwitch } from './SideSwitch';

// 화면 뼈대: 아침교실(상단 줄 · 대시보드 · 진행률) / 수업교실, 오른쪽 옆 탭으로 전환
export function App() {
  const appMode = usePrefs((s) => s.appMode);
  return (
    <>
      <div id="app">
        {appMode === 'morning' ? (
          <div id="morning-view">
            <Header />
            <Dashboard />
            <Footer />
          </div>
        ) : (
          <div id="lesson-view">
            <div className="lesson-hero">
              <h2>수업교실</h2>
              <p>8단계에서 옮겨요.</p>
            </div>
          </div>
        )}
        <SideSwitch />
      </div>
      <ToastHost />
    </>
  );
}
