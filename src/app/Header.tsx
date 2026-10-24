import { personalCloudEnabled } from '@/core/data/cloud/client';
import { useCloudSync } from '@/core/data/cloud/sync';
import { FEATURES } from '@/features/registry';
import { useEffect, useRef, useState } from 'react';
import { usePrefs } from '@/core/prefs';
import { ensureAudio, playSound } from '@/core/sound';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { DateCard } from '@/features/date/DateCard';
import { Settings } from '@/features/settings/Settings';
import { ClassPicker, Welcome } from '@/features/onboarding/Onboarding';
import { Suggest } from '@/features/suggest/Suggest';
import { useTours } from '@/core/ui/Tour';

type Open = null | 'settings' | 'picker' | 'welcome' | 'suggest' | 'cloud';

// 상단 줄: 학교·학급(누르면 학급 선택), 날짜, 소리·관리
// 저장 단추는 없다 — 바뀔 때마다 바로 저장하고, 저장하지 못했을 때만 알림을 띄운다.
export function Header() {
  const cloudMessage = useCloudSync(s => s.message);
  const muted = usePrefs((s) => s.muted);
  const setPrefs = usePrefs((s) => s.set);
  const cls = useCurrentClass();
  const classCount = useData((s) => s.classes.length);
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);

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
          {personalCloudEnabled && <button className="header-action" style={{ fontSize: 'var(--fs-small)', color: 'var(--text-sub)' }} title={cloudMessage} onClick={() => setOpen('cloud')}>{cloudMessage === '서버 저장 완료' ? '☁ 저장됨' : '☁ 저장 상태'}</button>}
          <a className="header-home" href="./?intro" title="아침교실 소개 화면으로" aria-label="홈 — 아침교실 소개 화면으로"><i className="ph-bold ph-house" aria-hidden="true" /><span>홈</span></a>
          <button className="header-action" title={muted ? '소리 켜기' : '소리 끄기'} aria-label="소리" aria-pressed={!muted}
            onClick={() => { setPrefs({ muted: !muted }); if (muted) { ensureAudio(); playSound('select'); } }}>
            <i aria-hidden="true" className={`ph-fill ph-speaker-${muted ? 'slash' : 'high'}`} /><span>소리 {muted ? '꺼짐' : '켜짐'}</span>
          </button>
          <button className="header-action" title="학급과 자료 관리" aria-label="관리 열기" onClick={() => setOpen('settings')}><i className="ph-fill ph-gear-six" aria-hidden="true" /><span>관리</span></button>
        </div>
      </header>
      {(open === 'settings' || open === 'cloud') && cls && <Settings initialTab={open === 'cloud' ? 'personalCloud' : undefined} onClose={close} onSuggest={() => setOpen('suggest')} />}
      {open === 'picker' && <ClassPicker onClose={close} onAdd={() => setOpen('settings')} />}
      {open === 'welcome' && <Welcome onClose={close} onMine={() => setOpen('settings')} />}
      {open === 'suggest' && <Suggest onClose={close} />}
    </>
  );
}
