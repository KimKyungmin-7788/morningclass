import { useEffect, useState, type CSSProperties } from 'react';
import { OutfitFigure } from '@/core/ui/OutfitFigure';
import { UtilityWindow } from '@/core/ui/UtilityWindow';
import { useWindowDocument } from '@/core/ui/WindowDocument';
import { toast } from '@/core/ui/toast';
import { recordsOf } from '@/core/data/backupActions';
import { useKv } from '@/core/data/kv';
import { useDay, dateKeyOf } from '@/core/data/day';
import { useStudentNotes, removeNotes } from '@/core/data/notes';
import type { ClassRoom, DayRecord, ExprBook, NoteCategory, StudentNote } from '@/core/data/types';
import { useStudentWindows } from '@/core/data/studentWindows';
import { PRAISE_SHAPES, praiseConfigOf } from '@/core/data/praise';
import { PinGate } from './PinGate';
import { QuickNote } from './QuickNote';
import { studentIndexColor, CATEGORIES, EMOTIONS, SUPPORTS, filterNotes, studentSummary } from './model';

const EMPTY_EXPR: ExprBook = { levels: {}, bag: { used: [], days: {} }, plan: {} };
const ATT = { present: '출석', late: '지각', early: '조퇴', absent: '결석' };
export function StudentCard(props: { cls: ClassRoom; studentId: string; onClose: () => void }) {
  const name = props.cls.students.find(s => s.id === props.studentId)?.name ?? '학생';
  return <UtilityWindow title={`👤 ${name}`} onClose={props.onClose}><StudentCardBody key={props.studentId} {...props}/></UtilityWindow>;
}
function StudentCardBody({ cls, studentId }: { cls: ClassRoom; studentId: string; onClose: () => void }) {
  const host = useWindowDocument().defaultView ?? window;
  const show = useStudentWindows((s) => s.show);
  const students = cls.students.filter((s) => !s.archived);
  const index = students.findIndex((s) => s.id === studentId);
  const [back, setBack] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [write, setWrite] = useState(false);
  const [edit, setEdit] = useState<StudentNote | undefined>();
  const date = useDay((s) => s.date);
  const today = useDay((s) => s.record);
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { let active = true; void recordsOf(cls.id).then((r) => { if (active) setRecords(r); }).catch(() => { if (active) setError('기록을 불러오지 못했어요'); }); return () => { active = false; }; }, [cls.id, today]);
  useEffect(() => {
    if (!unlocked) return;
    let timer: ReturnType<typeof setTimeout>;
    const touch = () => { clearTimeout(timer); timer = setTimeout(() => { setUnlocked(false); setEdit(undefined); }, 180_000); };
    touch(); for (const event of ['pointerdown', 'keydown', 'input']) host.addEventListener(event, touch);
    return () => { clearTimeout(timer); for (const event of ['pointerdown', 'keydown', 'input']) host.removeEventListener(event, touch); };
  }, [unlocked, host]);
  if (write || edit) return <QuickNote cls={cls} studentId={studentId} initial={edit} onClose={() => { setWrite(false); setEdit(undefined); setUnlocked(false); }} />;
  return <div className="sc-floating-card" style={{'--index-color':studentIndexColor(Math.max(0,index))} as CSSProperties}>
    <div className="sc-panel"><div className="sc-card-toolbar"><div className="sc-chips sc-tabs" role="group" aria-label="학생 카드 보기"><button aria-pressed={!back} onClick={() => setBack(false)}>나의 하루</button><button aria-pressed={back} onClick={() => setBack(true)}>🔒 선생님 기록</button></div><div className="sc-student-nav"><button aria-label="이전 학생" disabled={index <= 0} onClick={() => show(cls.id, students[index - 1].id)}>〈</button><span>{index < 0 ? '보관된 학생' : `${index + 1} / ${students.length}`}</span><button aria-label="다음 학생" disabled={index < 0 || index >= students.length - 1} onClick={() => show(cls.id, students[index + 1].id)}>〉</button></div><button className="sc-write" onClick={() => setWrite(true)}>✎ 기록 남기기</button></div>
      {error && <p role="alert">{error}</p>}
      {!back ? <Front cls={cls} studentId={studentId} records={records} date={date} /> : !unlocked ? <PinGate onUnlock={() => setUnlocked(true)} /> : <Back cls={cls} studentId={studentId} records={records} onEdit={setEdit} />}
    </div>
  </div>;
}
function Front({ cls, studentId, records, date }: { cls: ClassRoom; studentId: string; records: DayRecord[]; date: Date }) {
  const [expr] = useKv(`expr:${cls.id}`, EMPTY_EXPR);
  const current = records.find((r) => r.date === dateKeyOf(date));
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const week = studentSummary(records, cls, studentId, { from: dateKeyOf(monday), to: dateKeyOf(sunday) });
  const month = studentSummary(records, cls, studentId, { from: dateKeyOf(new Date(date.getFullYear(), date.getMonth(), 1)), to: dateKeyOf(new Date(date.getFullYear(), date.getMonth() + 1, 0)) });
  const roles = (cls.options.roles ?? []).filter((r) => r.students.includes(studentId));
  const praiseIcon = PRAISE_SHAPES.find((shape) => shape.id === praiseConfigOf(cls).shape)?.icon ?? '🍇';
  const emotions = Object.entries(week.emotions).filter(([, count]) => count > 0);
  const shortDate = (d: Date) => `${d.getMonth() + 1}.${d.getDate()}`;
  return <div className="sc-summary">
    <section className="sc-today">
      <div className="sc-section-heading"><h3>나의 하루</h3><time dateTime={dateKeyOf(date)}>{date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</time></div>
      <div className="sc-today-grid">
        <div><span className="sc-summary-label"><img className="sc-summary-icon" src="/img/attendance.png" alt="" /> 출석</span><strong>{current?.attendance[studentId] ? ATT[current.attendance[studentId].status] : '아직 기록 없음'}</strong></div>
        <div><span className="sc-summary-label">💖 감정</span><strong>{current?.emotions[studentId]?.items.map((e) => EMOTIONS[e.k]).join(' · ') || current?.emotions[studentId]?.legacy?.label || '아직 기록 없음'}</strong></div>
        <div><span className="sc-summary-label">🙋 역할</span><strong>{roles.length ? roles.map((r) => `${r.icon} ${r.name}${current?.roleDone?.[r.id]?.includes(studentId) ? ' ✓ 했어요' : ''}`).join(' · ') : '맡은 역할 없음'}</strong></div>
        <div><span className="sc-summary-label">{praiseIcon} 칭찬</span><strong>{(current?.praise ?? []).filter((p) => p.s === studentId).length}<span className="sc-unit">개</span></strong></div>
      </div>
    </section>
    <section className="sc-week">
      <div className="sc-section-heading"><h3>이번 주 마음</h3><span>{shortDate(monday)} ~ {shortDate(sunday)}</span></div>
      {emotions.length ? <div className="sc-emotions">{emotions.map(([key, count]) => <div key={key} className="sc-bar"><span>{EMOTIONS[key as keyof typeof EMOTIONS]}</span><meter min="0" max={Math.max(1, ...Object.values(week.emotions))} value={count} aria-label={EMOTIONS[key as keyof typeof EMOTIONS]} /><strong>{count}회</strong></div>)}</div> : <p className="sc-empty">아직 고른 감정이 없어요.<br />아침 감정 활동을 하면 여기에 모여요.</p>}
      <div className="sc-week-badges"><span>{praiseIcon} 칭찬 <strong>{week.praise.length}개</strong></span><span>🙋 역할을 한 날 <strong>{week.roleDays}일</strong></span></div>
      {week.praise.length > 0 && <details className="sc-praise"><summary>칭찬 이야기 {week.praise.length}개</summary><ul>{week.praise.map((p) => <li key={p.id}>{p.r}</li>)}</ul></details>}
    </section>
    <div className="sc-summary-side">
      <section><div className="sc-section-heading"><h3>이번 달 출결</h3><span>{date.getMonth() + 1}월</span></div><div className="sc-attendance">{Object.entries(month.attendance).map(([key, count]) => <div key={key}><span>{ATT[key as keyof typeof ATT]}</span><strong>{count}<span className="sc-unit">일</span></strong></div>)}</div></section>
      <section className="sc-outfit"><h3>오늘은 어떤 옷?</h3>{current?.outfits?.[studentId] ? <div className="sc-outfit-figure"><OutfitFigure facePhoto={cls.students.find(s=>s.id===studentId)?.facePhoto} avatar={cls.students.find(s=>s.id===studentId)?.outfitAvatar ?? current.outfits[studentId].avatar} clothes={current.outfits[studentId].clothes}/></div> : <p className="sc-empty">아직 고른 옷차림이 없어요.</p>}</section>
      <section className="sc-expression"><h3>생활표현 연습</h3><span className="sc-level">{expr.levels[studentId] ? { sentence: '문장', word: '낱말', card: '그림 카드' }[expr.levels[studentId]] : '아직 정하지 않았어요'}</span></section>
    </div>
  </div>;
}

function Back({ cls, studentId, records, onEdit }: { cls: ClassRoom; studentId: string; records: DayRecord[]; onEdit: (n: StudentNote) => void }) {
  const { notes, error } = useStudentNotes(cls.id, studentId);
  const [info, setInfo] = useState(false);
  const [category, setCategory] = useState<NoteCategory | ''>('');
  const [share, setShare] = useState(false);
  return <section><div className="sc-chips"><button aria-pressed={!info} onClick={() => setInfo(false)}>누가기록</button><button aria-pressed={info} onClick={() => setInfo(true)}>학생 정보</button></div>
    {info ? <><h3>알레르기 번호</h3><p>{cls.allergies[studentId]?.join(', ') || '등록된 알레르기가 없어요'}</p><h3>출결 사유</h3>{records.filter((r) => r.attendance[studentId]?.reason).map((r) => <p key={r.date}>{r.date} · {ATT[r.attendance[studentId].status]} · {r.attendance[studentId].reason}</p>)}</> : <>
      <label>분류<select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}><option value="">전체</option>{CATEGORIES.map(([k,n]) => <option key={k} value={k}>{n}</option>)}</select></label><label className="sc-check"><input type="checkbox" checked={share} onChange={(e) => setShare(e.target.checked)} />학부모와 나누는 기록만</label>
      {error && <p role="alert">{error}</p>}{!filterNotes(notes, { category: category || undefined, share: share ? true : undefined }).length && <p>아직 기록이 없어요. ✎ 기록에서 관찰한 모습을 남겨 주세요.</p>}
      {filterNotes(notes, { category: category || undefined, share: share ? true : undefined }).map((n) => <article key={n.id} className="sc-note"><button onClick={() => onEdit(n)}><time>{new Date(n.at).toLocaleString('ko-KR')}</time><p>{n.text}</p><small>{CATEGORIES.find(([k]) => k === n.category)?.[1]} · {SUPPORTS.find(([k]) => k === n.support)?.[1]} {n.share ? '· 학부모와 나누기' : ''}</small>{n.abc && <p>A: {n.abc.a} / B: {n.abc.b} / C: {n.abc.c}<br />{n.abc.intensity ? { low: '약', mid: '중', high: '강' }[n.abc.intensity] : ''} {n.abc.minutes != null ? `${n.abc.minutes}분` : ''}</p>}</button><button aria-label={`${n.text} 지우기`} onClick={() => { if (confirm('이 기록을 지울까요? 되돌릴 수 없어요.')) void removeNotes([n.id]).catch(() => toast('지우지 못했어요', 'error')); }}>지우기</button></article>)}
    </>}
  </section>;
}
