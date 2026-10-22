import { useLayoutEffect, useRef, useState } from 'react';
import type { FeatureManifest } from '@/features/types';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { usePrefs } from '@/core/prefs';
import { useStudentWindows } from '@/core/data/studentWindows';
import { Popup } from '@/core/ui/Popup';
import { StudentCard } from './StudentCard';
import { QuickNote } from './QuickNote';
import { doneToday } from './model';
import './students.css';

function StudentHeader() {
  const cls = useCurrentClass();
  const record = useDay((s) => s.record);
  const show = useStudentWindows((s) => s.show);
  const ref = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const students = activeStudents(cls);
  useLayoutEffect(() => {
    const header = ref.current?.parentElement;
    const measure = () => {
      if (!header || !ref.current || !chips.current) return;
      const otherWidth = [...header.children].filter((el) => el !== ref.current).reduce((sum, el) => sum + el.getBoundingClientRect().width, 0);
      const style = getComputedStyle(header);
      const available = header.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - otherWidth - parseFloat(style.gap) * (header.children.length - 1);
      setCompact(available < chips.current.scrollWidth + 100);
    };
    const observer = new ResizeObserver(measure);
    if (header) { observer.observe(header); for (const child of header.children) if (child !== ref.current) observer.observe(child); }
    measure();
    return () => observer.disconnect();
  }, [students.map((s) => s.name).join('|')]);
  if (!cls) return null;
  return <div className="sc-header" ref={ref}>
    <div className={`sc-header-names${compact || students.length > 8 ? ' sc-measure' : ''}`} ref={chips}>{students.map((s) => <button key={s.id} onClick={() => show(cls.id, s.id)}>{s.name}{record.classId === cls.id && doneToday(record, s.id) ? ' ✓' : ''}</button>)}</div>
    {(compact || students.length > 8 || !students.length) && <button onClick={() => show(cls.id)}>학생 카드</button>}
    <button onClick={() => show(cls.id, undefined, true)}>✎ 기록</button>
  </div>;
}
function StudentWindows() {
  const { open, show, close } = useStudentWindows();
  const current = useCurrentClass();
  const classes = useData((s) => s.classes);
  const mode = usePrefs((s) => s.appMode);
  const cls = classes.find((c) => c.id === open?.classId);
  return <>
    {current && !open && <button className={`sc-floating${mode === 'lesson' ? ' sc-visible' : ''}`} onClick={() => show(current.id, undefined, true)}>✎ 기록</button>}
    {open && cls && (open.quick ? <QuickNote key={cls.id} cls={cls} studentId={open.studentId} onClose={close} /> : open.studentId ? <StudentCard key={`${cls.id}-${open.studentId}`} cls={cls} studentId={open.studentId} onClose={close} /> : <Popup title="👤 학생 카드" onClose={close}><div className="sc-panel sc-chips sc-students">{activeStudents(cls).length ? activeStudents(cls).map((s) => <button key={s.id} onClick={() => show(cls.id, s.id)}>{s.name}</button>) : <p>설정에서 학생을 먼저 넣어 주세요.</p>}</div></Popup>)}
  </>;
}
const manifest: FeatureManifest = { id: 'students', Header: StudentHeader, Overlay: StudentWindows };
export default manifest;
