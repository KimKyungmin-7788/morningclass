import { useEffect, useState } from 'react';
import { ensureAudio } from '@/core/sound';
import { activeStudents, useCurrentClass } from '@/core/data/store';
import { DAY_NAMES, useDay } from '@/core/data/day';
import { DatePicker } from './DatePicker';

// 상단 줄의 날짜 카드. 오늘 날짜를 아직 입력하지 않았으면 카드가 반짝이고,
// 학생이 있는 학급이면 날짜를 입력할 때까지 대시보드 · 아래 줄을 회색으로 잠근다 (body.date-lock).
export function DateCard() {
  const date = useDay((s) => s.date);
  const dateSet = useDay((s) => s.dateSet);
  const cls = useCurrentClass();
  const [open, setOpen] = useState(false);
  const openPicker = () => { ensureAudio(); setOpen(true); };
  const need = !dateSet;
  const lock = need && activeStudents(cls).length > 0;

  useEffect(() => {
    document.body.classList.toggle('need-date', need);
    return () => document.body.classList.remove('need-date');
  }, [need]);
  useEffect(() => {
    document.body.classList.toggle('date-lock', lock);
    return () => document.body.classList.remove('date-lock');
  }, [lock]);

  return (
    <>
      <div className={`date-card${need ? ' need' : ''}`} tabIndex={0} role="button" aria-label="날짜 선택" onClick={openPicker}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}>
        {need && <span className="dc-shine" aria-hidden="true"><i /></span>}
        {need && <><i className="dc-star s1" aria-hidden="true" /><i className="dc-star s2" aria-hidden="true" /><i className="dc-star s3" aria-hidden="true" /></>}
        <span className="ico"><i className="ph-duotone ph-calendar-blank" /></span>
        {need ? <span>날짜를 입력해주세요 👆</span> : (
          <span>{date.getFullYear()}. {date.getMonth() + 1}. {date.getDate()}. <span className="dow">{DAY_NAMES[date.getDay()]}요일</span></span>
        )}
        {need && <div className="date-need-tip"><span className="dn-finger">👆</span><span>오늘이 며칠인지 알아보아요</span></div>}
      </div>
      {open && <DatePicker onClose={() => setOpen(false)} />}
    </>
  );
}
