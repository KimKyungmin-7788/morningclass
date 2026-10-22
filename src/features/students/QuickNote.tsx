import { useEffect, useRef, useState } from 'react';
import { Popup } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { useKv } from '@/core/data/kv';
import { saveNotes, removeNotes } from '@/core/data/notes';
import { defaultNotesConfig, newId, type ClassRoom, type StudentNote } from '@/core/data/types';
import { NoteFields } from './NoteFields';

const DEFAULT_CONFIG = defaultNotesConfig();
/** 방금 작성한 묶음만 메모리에 둔다. 닫으면 지난 기록은 보이지 않는다. */
export function QuickNote({ cls, studentId, initial, onClose }: { cls: ClassRoom; studentId?: string; initial?: StudentNote; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(studentId ? [studentId] : []);
  const [config] = useKv('studentNotesConfig', DEFAULT_CONFIG);
  const blank = (): StudentNote => ({ id: '', classId: cls.id, studentId: '', at: new Date().toISOString(), updatedAt: '', text: '' });
  const [value, setValue] = useState<StudentNote>(initial ?? blank);
  const group = useRef<StudentNote[]>(initial ? [initial] : []);
  const [status, setStatus] = useState('');
  const [undoUntil, setUndoUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef(Promise.resolve());
  const pending = useRef<StudentNote[] | null>(null);
  const [retry, setRetry] = useState(false);
  const failed = useRef(new Map<string, StudentNote>());
  const mounted = useRef(true);
  const enqueue = (rows: StudentNote[]) => {
    queue.current = queue.current.then(async () => {
      try { await saveNotes(rows); for (const row of rows) failed.current.delete(row.id); if (mounted.current) { setRetry(failed.current.size > 0); setStatus(`✓ ${rows.map((n) => cls.students.find((s) => s.id === n.studentId)?.name).join('·')} 저장됨 · ${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`); } }
      catch { for (const row of rows) failed.current.set(row.id, row); toast('기록을 저장하지 못했어요. 창에서 다시 시도해 주세요', 'error'); if (mounted.current) { setRetry(true); setStatus('저장하지 못했어요'); } }
    });
  };
  const flush = () => { clearTimeout(timer.current); if (pending.current) { enqueue(pending.current); pending.current = null; } };
  useEffect(() => {
    mounted.current = true;
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => { flush(); mounted.current = false; clearInterval(tick); };
  }, []);
  const update = (next: StudentNote, immediate = false) => {
    setValue(next);
    if (!group.current.length) {
      if (!selected.length || !next.text.trim()) return;
      const batch = newId('batch');
      group.current = selected.map((id) => ({ ...next, id: newId('note'), studentId: id, batch }));
      setUndoUntil(Date.now() + 10_000); immediate = true;
    }
    const time = new Date().toISOString();
    group.current = group.current.map((n) => ({ ...next, id: n.id, classId: n.classId, studentId: n.studentId, at: initial ? next.at : n.at, batch: n.batch, updatedAt: time }));
    pending.current = [...group.current]; setStatus('저장하고 있어요…');
    clearTimeout(timer.current);
    if (immediate) flush(); else timer.current = setTimeout(flush, 500);
  };
  const start = (text: string) => {
    flush(); group.current = [];
    update({ ...blank(), text, category: text === '⚠ 도전행동' ? 'challenge' : value.category, goalId: value.goalId }, true);
  };
  const beforeClose = async () => { flush(); await queue.current; if (failed.current.size) { setRetry(true); return false; } return true; };
  return <Popup title={initial ? '✎ 기록 고치기' : '✎ 빠른 기록'} large onClose={onClose} beforeClose={beforeClose}>
    <div className="sc-panel">
      {!initial && <><fieldset><legend>누구의 모습을 기록할까요?</legend><div className="sc-chips sc-students">{cls.students.filter((s) => !s.archived || s.id === studentId).map((s) => <button key={s.id} aria-pressed={selected.includes(s.id)} onClick={() => { flush(); group.current = []; setUndoUntil(0); setStatus(''); setValue({ ...blank(), category: value.category }); setSelected((ids) => ids.includes(s.id) ? ids.filter((id) => id !== s.id) : [...ids, s.id]); }}>{s.name}{selected.includes(s.id) ? ' ✓' : ''}</button>)}</div></fieldset>
      <fieldset disabled={!selected.length}><legend>빠른 기록 · 누르면 저장돼요</legend><div className="sc-chips">{config.quick.map((text) => <button key={text} onClick={() => start(text)}>{text}</button>)}<button onClick={() => { flush(); group.current = []; setUndoUntil(0); setStatus(''); setValue({ ...blank(), category: value.category }); document.getElementById('sc-note-fields')?.querySelector('textarea')?.focus(); }}>＋ 내 문장</button></div></fieldset></>}
      <div role="status">{status}</div>
      {retry && <button onClick={() => { if (failed.current.size) enqueue([...failed.current.values()]); }}>다시 저장하기</button>}
      {!initial && now < undoUntil && <button onClick={() => { clearTimeout(timer.current); pending.current = null; const ids = group.current.map((n) => n.id); group.current = []; setUndoUntil(0); setValue({ ...blank(), category: value.category }); queue.current = queue.current.then(() => removeNotes(ids)).then(() => { for (const id of ids) failed.current.delete(id); if (mounted.current) { setStatus('되돌렸어요'); setRetry(failed.current.size > 0); } }).catch(() => toast('되돌리지 못했어요', 'error')); }}>되돌리기</button>}
      <fieldset id="sc-note-fields" disabled={!initial && !selected.length}>
        {initial && <label>기록 날짜<input type="datetime-local" value={new Date(new Date(value.at).getTime() - new Date(value.at).getTimezoneOffset() * 60_000).toISOString().slice(0,16)} onChange={(e) => { if (e.target.value) update({ ...value, at: new Date(e.target.value).toISOString() }); }} /></label>}
        <NoteFields value={value} onChange={update} config={config} />
      </fieldset>
      <p className="sc-hint">내용은 이 기기에만 저장돼요. {initial ? '고치면 바로 반영돼요.' : '여러 명을 골랐다면 세부 내용도 함께 바뀌어요.'}</p>
    </div>
  </Popup>;
}
