import { FEATURES } from '@/features/registry';
import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/core/prefs';
import { ensureAudio, playSound } from '@/core/sound';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { DateCard } from '@/features/date/DateCard';
import { RecordsPanel } from '@/features/attendance/RecordsPanel';
import { Settings } from '@/features/settings/Settings';
import { ClassPicker, Welcome } from '@/features/onboarding/Onboarding';
import { Suggest } from '@/features/suggest/Suggest';
import { useLayoutEdit } from '@/features/layout/store';
import { useTours } from '@/core/ui/Tour';

type Open = null | 'settings' | 'records' | 'picker' | 'welcome' | 'suggest';

// 상단 줄: 학교·학급(누르면 학급 선택), 날짜, 기능 제안·내 맘대로 배치·소리·이전 기록·설정
// 저장 단추는 없다 — 바뀔 때마다 바로 저장하고, 저장하지 못했을 때만 알림을 띄운다.
export function Header() {
  const muted = usePrefs((s) => s.muted);
  const setPrefs = usePrefs((s) => s.set);
  const cls = useCurrentClass();
  const classCount = useData((s) => s.classes.length);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const customizing = useLayoutEdit((s) => s.editing);

  // 첫 접속: 학급이 여러 개면 학급 선택, 학생이 아직 없으면 환영 창 (한 번만).
  // 환영 창은 첫 화면 안내(MainTour)를 다 보거나 그만둔 뒤에 띄운다 — 화면을 먼저 익히고 학급을 고르게.
  const tourSeen = useTours((s) => s.seen.includes('main'));
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    if (classCount > 1) { greeted.current = true; setOpen('picker'); return; }
    if (activeStudents(cls).length) { greeted.current = true; return; }
    if (!tourSeen) return;
    greeted.current = true;
    setOpen('welcome');
  }, [classCount, cls, tourSeen]);

  return (
    <>
      <header>
        <h1><span className="logo-ico" role="img" aria-label="아침교실" /> 아침교실</h1>
        <div className="school" role="button" tabIndex={0} title="눌러서 학급 변경" onClick={() => setOpen('picker')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen('picker'); } }}>
          {cls?.schoolName || '학교명'} · {cls?.className || '학급명'}
        </div>
        <DateCard />
        {FEATURES.map((f) => f.Header ? <f.Header key={f.id} /> : null)}
        <div className="actions">
          <button className="suggest" title="새 기능을 제안해요" aria-label="기능 제안하기" onClick={() => { ensureAudio(); setOpen('suggest'); }}>
            <i className="ph-fill ph-lightbulb" /><span>기능 제안</span>
          </button>
          {/* 내 맘대로 배치: 확인 문제를 맞히면 카드 배치를 바꾸는 수정 모드로 들어간다. 수정 중에는 완료 단추가 된다 */}
          {customizing ? (
            <button className="suggest customize on" title="배치를 마쳐요" aria-label="내 맘대로 배치 완료" onClick={() => { useLayoutEdit.getState().setEditing(false); playSound('save'); }}>
              <i className="ph-bold ph-check" /><span>완료</span>
            </button>
          ) : (
            <button className="suggest customize" title="카드를 원하는 자리로 옮기고, 빼거나 넣을 수 있어요" aria-label="내 맘대로 배치" onClick={() => { ensureAudio(); playSound('select'); useLayoutEdit.getState().askGate(); }}>
              <i className="ph-fill ph-squares-four" /><span>내 맘대로 배치</span>
            </button>
          )}
          <button title={muted ? '소리 켜기' : '소리 끄기'} aria-label="소리 켜기/끄기" aria-pressed={muted}
            onClick={() => { setPrefs({ muted: !muted }); if (muted) { ensureAudio(); playSound('select'); } }}>
            <i className={`ph-fill ph-speaker-${muted ? 'slash' : 'high'}`} />
          </button>
          <button title="이전 기록 보기" aria-label="이전 기록 보기" onClick={() => setOpen('records')}><i className="ph-fill ph-folder-open" /></button>
          <button title="설정" aria-label="설정 열기" onClick={() => setOpen('settings')}><i className="ph-fill ph-gear-six" /></button>
        </div>
      </header>
      {open === 'settings' && cls && <Settings onClose={close} />}
      {open === 'records' && <RecordsPanel onClose={close} />}
      {open === 'picker' && <ClassPicker onClose={close} onAdd={() => setOpen('settings')} />}
      {open === 'welcome' && <Welcome onClose={close} onMine={() => setOpen('settings')} />}
      {open === 'suggest' && <Suggest onClose={close} />}
    </>
  );
}
