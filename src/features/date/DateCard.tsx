import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ensureAudio } from '@/core/sound';
import { activeStudents, useCurrentClass } from '@/core/data/store';
import { DAY_NAMES, useDay } from '@/core/data/day';
import { DatePicker } from './DatePicker';

// 상단 줄의 날짜 카드 + "오늘 날짜를 입력해요" 잠금 화면.
// 학생이 있는 학급에서 오늘 날짜를 아직 입력하지 않았으면 잠금 화면이 대시보드를 가린다.
/** hidden: 학급 선택·환영·설정 창이 떠 있는 동안에는 잠금 화면을 잠시 내린다 */
export function DateCard({ hidden }: { hidden?: boolean }) {
  const date = useDay((s) => s.date);
  const dateSet = useDay((s) => s.dateSet);
  const cls = useCurrentClass();
  const [open, setOpen] = useState(false);
  const openPicker = () => { ensureAudio(); setOpen(true); };
  const need = !dateSet;
  const gate = need && activeStudents(cls).length > 0 && !open && !hidden;

  useEffect(() => {
    document.body.classList.toggle('need-date', need);
    return () => document.body.classList.remove('need-date');
  }, [need]);

  return (
    <>
      <div className={`date-card${need ? ' need' : ''}`} tabIndex={0} role="button" aria-label="날짜 선택" onClick={openPicker}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}>
        <span className="ico"><i className="ph-duotone ph-calendar-blank" /></span>
        {need ? <span>날짜를 입력해주세요 👆</span> : (
          <span>{date.getFullYear()}. {date.getMonth() + 1}. {date.getDate()}. <span className="dow">{DAY_NAMES[date.getDay()]}요일</span></span>
        )}
        {need && <div className="date-need-tip"><span className="dn-finger">👆</span><span>오늘이 며칠인지 알아보아요</span></div>}
      </div>
      {gate && createPortal(
        <div className="date-gate">
          <div className="date-gate-box">
            <div className="dg-emoji">📅</div>
            <h2>날짜 반장님!</h2>
            <p>오늘은 며칠일까요?</p>
            <button className="dg-btn" onClick={openPicker}>📅 날짜 선택하기</button>
          </div>
        </div>, document.body)}
      {open && <DatePicker onClose={() => setOpen(false)} />}
    </>
  );
}
