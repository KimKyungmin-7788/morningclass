import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/core/prefs';
import { ensureAudio, playSound } from '@/core/sound';
import { toast } from '@/core/ui/toast';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { DateCard } from '@/features/date/DateCard';
import { RecordsPanel } from '@/features/attendance/RecordsPanel';
import { Settings } from '@/features/settings/Settings';
import { ClassPicker, Welcome } from '@/features/onboarding/Onboarding';
import { Suggest } from '@/features/suggest/Suggest';

type Open = null | 'settings' | 'records' | 'picker' | 'welcome' | 'suggest';

// 상단 줄: 학교·학급(누르면 학급 선택), 날짜, 기능 제안·소리·저장 확인·이전 기록·설정
export function Header() {
  const muted = usePrefs((s) => s.muted);
  const setPrefs = usePrefs((s) => s.set);
  const cls = useCurrentClass();
  const classCount = useData((s) => s.classes.length);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

  // 첫 접속: 학급이 여러 개면 학급 선택, 학생이 아직 없으면 환영 창 (한 번만)
  const greeted = useRef(false);
  useEffect(() => {
    if (greeted.current) return;
    greeted.current = true;
    if (classCount > 1) setOpen('picker');
    else if (!activeStudents(cls).length) setOpen('welcome');
  }, [classCount, cls]);

  return (
    <>
      <header>
        <h1><span className="logo-ico" role="img" aria-label="아침교실" /> 아침교실</h1>
        <div className="school" role="button" tabIndex={0} title="눌러서 학급 변경" onClick={() => setOpen('picker')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen('picker'); } }}>
          {cls?.schoolName || '학교명'} · {cls?.className || '학급명'}
        </div>
        <DateCard hidden={open === 'picker' || open === 'welcome' || open === 'settings'} />
        <div className="actions">
          <button className="suggest" title="새 기능을 제안해요" aria-label="기능 제안하기" onClick={() => { ensureAudio(); setOpen('suggest'); }}>
            <i className="ph-fill ph-lightbulb" /><span>기능 제안</span>
          </button>
          <button title={muted ? '소리 켜기' : '소리 끄기'} aria-label="소리 켜기/끄기" aria-pressed={muted}
            onClick={() => { setPrefs({ muted: !muted }); if (muted) { ensureAudio(); playSound('select'); } }}>
            <i className={`ph-fill ph-speaker-${muted ? 'slash' : 'high'}`} />
          </button>
          {/* 바뀔 때마다 자동으로 저장되므로, 이 버튼은 저장됐는지 확인해 주는 용도다 */}
          <button className="primary" title="저장 확인" aria-label="저장 확인"
            onClick={() => { ensureAudio(); playSound('save'); toast('💾 자동으로 저장되고 있어요', 'success'); }}>
            <i className="ph-fill ph-floppy-disk" />
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
