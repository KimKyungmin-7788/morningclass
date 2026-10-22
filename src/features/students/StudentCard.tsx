import { useEffect, useState } from 'react';
import { Popup } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { recordsOf } from '@/core/data/backupActions';
import { useKv } from '@/core/data/kv';
import { useDay, dateKeyOf } from '@/core/data/day';
import { useStudentNotes, removeNotes } from '@/core/data/notes';
import type { ClassRoom, DayRecord, ExprBook, NoteCategory, StudentNote } from '@/core/data/types';
import { PinGate } from './PinGate';
import { QuickNote } from './QuickNote';
import { CATEGORIES, EMOTIONS, SUPPORTS, filterNotes, studentSummary } from './model';

const EMPTY_EXPR: ExprBook = { levels: {}, bag: { used: [], days: {} }, plan: {} };
const ATT = { present: '출석', late: '지각', early: '조퇴', absent: '결석' };
export function StudentCard({ cls, studentId, onClose }: { cls: ClassRoom; studentId: string; onClose: () => void }) {
  const [back, setBack] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [write, setWrite] = useState(false);
  const [edit, setEdit] = useState<StudentNote | undefined>();
  const date = useDay((s) => s.date);
  const today = useDay((s) => s.record);
  const [records, setRecords] = useState<DayRecord[]>([]);
  const [error, setError] = useState('');
  const student = cls.students.find((s) => s.id === studentId)!;
  useEffect(() => { let active = true; void recordsOf(cls.id).then((r) => { if (active) setRecords(r); }).catch(() => { if (active) setError('기록을 불러오지 못했어요'); }); return () => { active = false; }; }, [cls.id, today]);
  useEffect(() => {
    if (!unlocked) return;
    let timer: ReturnType<typeof setTimeout>;
    const touch = () => { clearTimeout(timer); timer = setTimeout(() => { setUnlocked(false); setEdit(undefined); }, 180_000); };
    touch(); for (const event of ['pointerdown', 'keydown', 'input']) window.addEventListener(event, touch);
    return () => { clearTimeout(timer); for (const event of ['pointerdown', 'keydown', 'input']) window.removeEventListener(event, touch); };
  }, [unlocked]);
  if (write || edit) return <QuickNote cls={cls} studentId={studentId} initial={edit} onClose={() => { setWrite(false); setEdit(undefined); setUnlocked(false); }} />;
  return <Popup title={`👤 ${student.name}의 학생 카드`} large onClose={onClose} headerExtra={<button className="sc-write" onClick={() => setWrite(true)}>✎ 기록</button>}>
    <div className="sc-panel"><div className="sc-chips"><button aria-pressed={!back} onClick={() => setBack(false)}>나의 하루</button><button aria-pressed={back} onClick={() => setBack(true)}>🔒 선생님 기록</button></div>
      {error && <p role="alert">{error}</p>}
      {!back ? <Front cls={cls} studentId={studentId} records={records} date={date} /> : !unlocked ? <PinGate onUnlock={() => setUnlocked(true)} /> : <Back cls={cls} studentId={studentId} records={records} onEdit={setEdit} />}
    </div>
  </Popup>;
}
function Front({ cls, studentId, records, date }: { cls: ClassRoom; studentId: string; records: DayRecord[]; date: Date }) {
  const [expr] = useKv(`expr:${cls.id}`, EMPTY_EXPR);
  const current = records.find((r) => r.date === dateKeyOf(date));
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const week = studentSummary(records, cls, studentId, { from: dateKeyOf(monday), to: dateKeyOf(sunday) });
  const month = studentSummary(records, cls, studentId, { from: dateKeyOf(new Date(date.getFullYear(), date.getMonth(), 1)), to: dateKeyOf(new Date(date.getFullYear(), date.getMonth() + 1, 0)) });
  const roles = (cls.options.roles ?? []).filter((r) => r.students.includes(studentId));
  return <div className="sc-summary">
    <section><h3>{date.toLocaleDateString('ko-KR')} · 나의 하루</h3><p>{current?.attendance[studentId] ? ATT[current.attendance[studentId].status] : '출석을 아직 고르지 않았어요'}</p><p>{current?.emotions[studentId]?.items.map((e) => EMOTIONS[e.k]).join(' · ') || current?.emotions[studentId]?.legacy?.label || '감정을 아직 고르지 않았어요'}</p><p>{roles.length ? roles.map((r) => `${r.icon} ${r.name}${current?.roleDone?.[r.id]?.includes(studentId) ? ' ✓ 했어요' : ''}`).join(' · ') : '맡은 역할이 없어요'}</p><p>⭐ 오늘 칭찬 {(current?.praise ?? []).filter((p) => p.s === studentId).length}개</p></section>
    <section><h3>이번 주</h3>{Object.entries(week.emotions).map(([key, count]) => <div key={key} className="sc-bar"><span>{EMOTIONS[key as keyof typeof EMOTIONS]}</span><meter min="0" max={Math.max(1, ...Object.values(week.emotions))} value={count} aria-label={EMOTIONS[key as keyof typeof EMOTIONS]} /><span>{count}회</span></div>)}<p>⭐ 칭찬 {week.praise.length}개 · 역할을 한 날 {week.roleDays}일</p>{week.praise.length > 0 && <ul>{week.praise.map((p) => <li key={p.id}>{p.r}</li>)}</ul>}</section>
    <section><h3>이번 달</h3><div className="sc-chips">{Object.entries(month.attendance).map(([key, count]) => <span key={key}>{ATT[key as keyof typeof ATT]} {count}일</span>)}</div></section>
    <section><h3>생활표현 연습</h3><p>{expr.levels[studentId] ? { sentence: '문장', word: '낱말', card: '그림 카드' }[expr.levels[studentId]] : '아직 정하지 않았어요'}</p></section>
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
