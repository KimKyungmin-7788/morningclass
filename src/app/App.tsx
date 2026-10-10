import { useEffect } from 'react';
import { usePrefs } from '@/core/prefs';
import { useData } from '@/core/data/store';
import { toast } from '@/core/ui/toast';
import { ToastHost } from '@/core/ui/toast';
import { Header } from './Header';
import { Dashboard } from './Dashboard';
import { Footer } from './Footer';
import { SideSwitch } from './SideSwitch';

// 화면 뼈대: 아침교실(상단 줄 · 대시보드 · 진행률) / 수업교실, 오른쪽 옆 탭으로 전환
export function App() {
  const appMode = usePrefs((s) => s.appMode);
  const boot = useData((s) => s.boot);
  const bootError = useData((s) => s.bootError);
  const migration = useData((s) => s.migration);
  const init = useData((s) => s.init);

  useEffect(() => { void init(); }, [init]);
  useEffect(() => {
    if (migration) toast(`기존 자료를 옮겼어요 (학급 ${migration.classes}개 · 기록 ${migration.records}일)`, 'success');
  }, [migration]);

  if (boot !== 'ready') {
    return (
      <div id="app" style={{ alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center' }}>
        {boot === 'loading' ? (
          <div className="card-hint">자료를 불러오는 중...</div>
        ) : (
          <>
            <h2>자료를 불러오지 못했어요</h2>
            <p style={{ color: 'var(--text-sub)', lineHeight: 1.6 }}>
              {bootError}<br />입력해 둔 자료는 지워지지 않았어요. 화면을 새로 고쳐 주세요.
            </p>
          </>
        )}
      </div>
    );
  }

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
