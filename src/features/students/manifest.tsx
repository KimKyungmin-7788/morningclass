import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { studentIndexColor } from './model';
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
  const show = useStudentWindows(s=>s.show);
  return cls ? <div className="sc-header sc-header-record"><button onClick={()=>show(cls.id,undefined,true)}>✎ 기록</button></div> : null;
}
function StudentIndex() {
  const cls=useCurrentClass();
  const {open,show}=useStudentWindows();
  const record=useDay(s=>s.record);
  if(!cls)return null;
  return createPortal(<nav className={`sc-index${open && !open.quick ? ' has-folder' : ''}`} aria-label="학생 파일철">{activeStudents(cls).map((student,i)=><button key={student.id} style={{'--index-color':studentIndexColor(i)} as CSSProperties} aria-label={`${student.name} 학생 카드`} aria-pressed={open?.classId===cls.id && open.studentId===student.id && !open.quick} onClick={()=>show(cls.id,student.id)}><span>{student.name}</span>{record.classId===cls.id && doneToday(record,student.id) && <small>✓</small>}</button>)}</nav>,document.body);
}
function StudentWindows() {
  const { open, show, close } = useStudentWindows();
  const current = useCurrentClass();
  const classes = useData((s) => s.classes);
  const mode = usePrefs((s) => s.appMode);
  const record = useDay((s) => s.record);
  const cls = classes.find((c) => c.id === open?.classId);
  return <>
    <StudentIndex/>
    {current && !open && <button className={`sc-floating${mode === 'lesson' ? ' sc-visible' : ''}`} onClick={() => show(current.id, undefined, true)}>✎ 기록</button>}
    {open && cls && (open.quick ? <QuickNote key={cls.id} cls={cls} studentId={open.studentId} onClose={close} /> : open.studentId ? <StudentCard key={cls.id} cls={cls} studentId={open.studentId} onClose={close} /> : <Popup title="👤 학생 카드" onClose={close}><div className="sc-panel sc-chips sc-students">{activeStudents(cls).length ? activeStudents(cls).map((s) => <button key={s.id} onClick={() => show(cls.id, s.id)}>{s.name}{record.classId === cls.id && doneToday(record, s.id) ? ' ✓' : ''}</button>) : <p>설정에서 학생을 먼저 넣어 주세요.</p>}</div></Popup>)}
  </>;
}
const manifest: FeatureManifest = { id: 'students', Header: StudentHeader, Overlay: StudentWindows };
export default manifest;
