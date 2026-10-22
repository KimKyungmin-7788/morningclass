import { useEffect, useRef, useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact } from '@/core/ui/slot';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useCurrentClass, useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { hiddenSubjects, moveSubject, subjectBank, subjectIcon, withSubject, withoutSubject } from '@/core/data/subjects';
import { MAX_PERIODS, periodsOn, useTimetables } from '@/core/data/timetables';
import type { ClassRoom } from '@/core/data/types';
import type { CardProps, FeatureManifest } from '../types';
import { TimetableSheet } from '@/features/worksheets/Worksheets';
import { TimetableTab } from '@/features/settings/TimetableTab';
import { TimetableTour } from './TimetableTour';
import { arrangeStatus, hasAnswer, isCorrect, isPerfect, move, pad7, shouldAutoLoad, trimEnd } from './model';

// 오늘의 시간표: 과목 카드를 교시 칸에 끌어 놓아 맞춘다. 선생님이 모달에서 미리 입력한 시간표가 정답이 된다(없으면 자유 배치).

const TITLE = { icon: 'ph-fill ph-calendar-check', tint: '#e0e7ff', color: '#4f46e5' };

const STATUS_TEXT = { none: '아직', doing: '작성 중', done: '작성 완료!' } as const;

function TimetableCard({ size }: CardProps) {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const tt = useDay((s) => s.record.timetable);
  const update = useDay((s) => s.update);
  const { byDay } = useTimetables(cls?.id ?? '');
  const [open, setOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [noteAt, setNoteAt] = useState<number | null>(null);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const periods = periodsOn(date, byDay);
  const arranged = !!tt.arranged?.some(Boolean);
  const openPopup = () => { ensureAudio(); setOpen(true); };
  const status = arrangeStatus(tt.arranged, tt.correct, periods);

  useEffect(() => {
    const state = useDay.getState();
    if (open || !cls || !byDay || state.classId !== cls.id || !shouldAutoLoad(!!cls.options.timetableAutoLoad, state.record.timetable.arranged, periods)) return;
    update((r) => { r.timetable.arranged = [...periods]; r.timetable.correct = true; });
  }, [cls, byDay, date, tt.arranged, update, open]);

  return (
    <>
      <CardFrame id="timetable" label="시간표 맞추기" state={arranged ? 'filled' : 'empty'} onOpen={openPopup}>
        {isCompact(size) ? (
          <CardCompact {...TITLE} title="오늘의 시간표" done={status === 'done'}>{STATUS_TEXT[status]}</CardCompact>
        ) : size === 'medium' ? <>
          <CardTitle {...TITLE} extra={status === 'done' ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 시간표</CardTitle>
          {arranged
            ? <div className="tt-mini">{tt.arranged!.map((s, i) => s && <span key={i} className="tt-chip"><b>{i + 1}</b>{s}</span>)}</div>
            : <div className="card-hint">터치해서 시간표를 맞춰봐요 👆</div>}
        </> : <>
        <CardTitle {...TITLE} extra={status === 'done' ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 시간표</CardTitle>
        {arranged ? (
          <div className="tt-preview">
            {tt.arranged!.map((s, i) => s && (
              <div key={i} className="tt-row">
                <span className="num">{i + 1}교시</span><span className="icon">{subjectIcon(s, cls)}</span><span className="name">{s}</span>
                <button className={`tt-note-chip${tt.notes[i] ? '' : ' empty'}`} title={tt.notes[i] ? '메모 수정' : '특이사항 메모 추가'}
                  onClick={(e) => { e.stopPropagation(); ensureAudio(); setNoteAt(i); }}>{tt.notes[i] ? `📝 ${tt.notes[i]}` : '+ 메모'}</button>
                <span className="check">✓</span>
              </div>
            ))}
          </div>
        ) : periods.length ? (
          <>
            <div className="tt-preview">{periods.map((s, i) => s && <div key={i} className="tt-row empty"><span className="num">{i + 1}교시</span><span className="name">?</span></div>)}</div>
            <div style={{ textAlign: 'center', color: 'var(--text-sub)', fontSize: 18, fontWeight: 700 }}>터치해서 시간표를 맞춰봐요 👆</div>
          </>
        ) : weekend ? <div className="card-hint">🎈 오늘은 쉬는 날이에요!<br />터치하면 시간표를 직접 배치할 수 있어요</div>   // 쉬는 날에도 열 수 있다 (보충 수업 · 미리 해 보기)
          : <div className="card-hint">터치해서 시간표를 미리 입력하거나 직접 배치해요</div>}
        </>}
      </CardFrame>
      {open && cls && !sheet && <ArrangeWindow key={`${cls.id}-${date.toDateString()}`} cls={cls} answer={pad7(periods)} onClose={() => setOpen(false)} onSheet={() => setSheet(true)} />}
      {open && sheet && <TimetableSheet onBack={() => setSheet(false)} />}
      {noteAt != null && (
        <NoteWindow subject={tt.arranged?.[noteAt] || `${noteAt + 1}교시`} initial={tt.notes[noteAt] ?? ''} onClose={() => setNoteAt(null)}
          onSave={(text) => { update((r) => { if (text) r.timetable.notes[noteAt] = text; else delete r.timetable.notes[noteAt]; }); setNoteAt(null); }} />
      )}
    </>
  );
}

function NoteWindow({ subject, initial, onClose, onSave }: { subject: string; initial: string; onClose: () => void; onSave: (text: string) => void }) {
  const [text, setText] = useState(initial);
  return (
    <Popup title={`📝 ${subject} 특이사항 메모`} onClose={onClose}>
      <textarea className="notes-textarea" placeholder="예) 준비물: 색종이, 가위 / 운동장 수업" value={text} onChange={(e) => setText(e.target.value)} />
      <PopupActions>
        <button className="btn-cancel" onClick={() => { playSound('select'); onSave(''); }}>🗑️ 삭제</button>
        <button className="btn-cancel" onClick={onClose}>취소</button>
        <button className="btn-save" onClick={() => { playSound('save'); toast('메모 저장!', 'success'); onSave(text.trim()); }}>💾 저장</button>
      </PopupActions>
    </Popup>
  );
}

interface Drag { name: string; from: number | null }

function ArrangeWindow({ cls, answer, onClose, onSheet }: { cls: ClassRoom; answer: string[]; onClose: () => void; onSheet: () => void }) {
  const saved = useDay((s) => s.record.timetable.arranged);
  const update = useDay((s) => s.update);
  const saveClass = useData((s) => s.saveClass);
  const [slots, setSlots] = useState(() => (Array.isArray(saved) ? pad7(saved) : pad7([])));
  const [shake, setShake] = useState<number | null>(null);
  /** 교과 편집: 보관함의 교과 카드를 빼고 · 옮기고 · 넣는다 (꾹 누르거나 '교과 편집'으로 들어간다) */
  const [editing, setEditing] = useState(false);
  const [planning, setPlanning] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const graded = hasAnswer(answer);
  const bank = subjectBank(cls, [...answer, ...slots]);
  const anyFilled = slots.some(Boolean);

  const drop = (d: Drag, to: number | 'bank') => {
    if (to === 'bank' && d.from == null) return;
    setSlots(move(slots, d.name, d.from, to));
    if (to === 'bank') return;
    if (!graded) playSound('select');
    else if (d.name === answer[to]) playSound('correct');
    else { playSound('wrong'); if (d.from == null) { setShake(to); setTimeout(() => setShake(null), 300); } }
    if (d.from == null) speak(`${to + 1}교시 ${d.name}`);
  };

  /** 과목 카드 끌기 (마우스·터치 공통). 칸 위에 놓으면 그 칸에, 보관함 위에 놓으면 칸을 비운다 */
  const dragProps = (d: Drag) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button) return;
      const chip = e.currentTarget;
      const sx = e.clientX; const sy = e.clientY;
      let ghost: HTMLElement | null = null;
      const clearOver = () => bodyRef.current?.querySelectorAll('.tt-slot').forEach((s) => s.classList.remove('drag-over'));
      const onMove = (ev: PointerEvent) => {
        if (!ghost && (Math.abs(ev.clientX - sx) > 5 || Math.abs(ev.clientY - sy) > 5)) {
          ghost = chip.cloneNode(true) as HTMLElement;
          ghost.classList.add('ghost');
          ghost.style.width = `${chip.offsetWidth}px`;
          document.body.appendChild(ghost);
          chip.classList.add('dragging');
        }
        if (!ghost) return;
        ghost.style.left = `${ev.clientX - 60}px`;
        ghost.style.top = `${ev.clientY - 28}px`;
        clearOver();
        document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.tt-slot')?.classList.add('drag-over');
      };
      const onCancel = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onCancel);
        ghost?.remove(); chip.classList.remove('dragging'); clearOver();
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!ghost) return;
        ghost.remove();
        chip.classList.remove('dragging');
        clearOver();
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const slot = el?.closest<HTMLElement>('.tt-slot');
        if (slot?.dataset.slot != null) drop(d, Number(slot.dataset.slot));
        else if (el?.closest('[data-bank]')) drop(d, 'bank');
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    style: { touchAction: 'none' as const },
  });

  /** 지금 저장된 학급 (끌기처럼 화면 밖에서 불릴 때 최신 값을 쓴다) */
  const latest = () => useData.getState().classes.find((c) => c.id === cls.id) ?? cls;
  const removeSubject = (name: string) => {
    const next = withoutSubject(latest(), name);
    void saveClass(next);
    playSound('select');
    if (subjectBank(next, [...answer, ...slots]).includes(name)) toast(`"${name}"은(는) 오늘 시간표에 들어 있어 보관함에 남아 있어요`);
  };
  const restoreSubject = (name: string) => { void saveClass(withSubject(latest(), name)); playSound('select'); };
  const reorder = (name: string, before: string | null) => {
    const now = latest();
    const order = moveSubject(subjectBank(now, [...answer, ...slots]), name, before);
    void saveClass({ ...now, subjects: { ...now.subjects, order } });
    playSound('select');
  };

  /**
   * 보관함의 교과 카드 누르기.
   *  · 평소: 끌어서 교시 칸에 놓는다. 움직이지 않고 꾹 누르면 교과 편집으로 들어간다.
   *  · 교과 편집 중: 끌어서 다른 교과 카드 위에 놓으면 그 앞으로 자리를 옮긴다 (빈 곳에 놓으면 맨 뒤로).
   */
  const bankProps = (name: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button || (e.target as Element).closest('.sj-x')) return;
      const chip = e.currentTarget;
      const sx = e.clientX; const sy = e.clientY;
      const edit = editing;
      let ghost: HTMLElement | null = null;
      const root = () => bodyRef.current;
      const clearOver = () => root()?.querySelectorAll('.drag-over, .sj-over').forEach((el) => el.classList.remove('drag-over', 'sj-over'));
      const stop = () => { clearTimeout(hold); window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onCancel); };
      const hold = edit ? 0 : window.setTimeout(() => { if (!ghost) { stop(); setEditing(true); playSound('select'); } }, 550);
      const onMove = (ev: PointerEvent) => {
        if (!ghost && (Math.abs(ev.clientX - sx) > 5 || Math.abs(ev.clientY - sy) > 5)) {
          clearTimeout(hold);
          ghost = chip.cloneNode(true) as HTMLElement;
          ghost.classList.add('ghost');
          ghost.querySelector('.sj-x')?.remove();
          ghost.style.width = `${chip.offsetWidth}px`;
          document.body.appendChild(ghost);
          chip.classList.add('dragging');
        }
        if (!ghost) return;
        ghost.style.left = `${ev.clientX - 60}px`;
        ghost.style.top = `${ev.clientY - 28}px`;
        clearOver();
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        if (edit) { const over = el?.closest<HTMLElement>('[data-subj]'); if (over && over !== chip) over.classList.add('sj-over'); }
        else el?.closest('.tt-slot')?.classList.add('drag-over');
      };
      const end = () => { stop(); ghost?.remove(); chip.classList.remove('dragging'); clearOver(); };
      const onCancel = () => end();
      const onUp = (ev: PointerEvent) => {
        const dragged = !!ghost;
        end();
        if (!dragged) return;
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        if (edit) {
          const over = el?.closest<HTMLElement>('[data-subj]');
          if (over?.dataset.subj && over.dataset.subj !== name) reorder(name, over.dataset.subj);
          else if (!over && el?.closest('[data-bank]')) reorder(name, null);
          return;
        }
        const slot = el?.closest<HTMLElement>('.tt-slot');
        if (slot?.dataset.slot != null) drop({ name, from: null }, Number(slot.dataset.slot));
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    },
    style: { touchAction: 'none' as const },
  });

  const addSubject = () => {
    const name = prompt('새 교과명을 입력하세요 (예: 한국사)')?.trim();
    if (!name) return;
    if (name.length > 10) { toast('10자 이내로 입력해 주세요', 'error'); return; }
    void saveClass(withSubject(cls, name));
    playSound('save');
    toast(`"${name}" 추가됨 ✨`, 'success');
  };

  const done = () => {
    const trimmed = trimEnd(slots);
    update((r) => { r.timetable.arranged = trimmed; r.timetable.correct = isCorrect(slots, answer); });
    playSound('save');
    toast('시간표 완성! 🎉', 'success');
    const said = trimmed.map((s, i) => (s ? `${i + 1}교시 ${s}` : '')).filter(Boolean).join(', ');
    if (said) speak(`오늘 시간표는, ${said} 입니다.`);
    onClose();
  };

  return (
    <Popup title="오늘의 시간표를 맞춰봐요! 📅" large onClose={onClose}
      headerExtra={<button className="wd-setup-btn" onClick={() => { playSound('select'); onSheet(); }}><i className="ph-bold ph-printer" /> 활동지</button>}>
      <div className="tt-manage-bar">
        <div className="tt-mode-buttons">
          <button className={!planning ? 'active' : ''} aria-pressed={!planning} onClick={() => setPlanning(false)}>오늘 시간표</button>
          <button className={planning ? 'active' : ''} aria-pressed={planning} onClick={() => setPlanning(true)}>요일별 미리 입력</button>
        </div>
        <label className="tt-auto"><input type="checkbox" checked={!!cls.options.timetableAutoLoad} onChange={(e) => {
          const now = latest(); void saveClass({ ...now, options: { ...now.options, timetableAutoLoad: e.target.checked } });
        }} />자동 불러오기</label>
      </div>
      <p className="tt-manage-hint">자동 불러오기를 켜면 비어 있는 날에 요일별 시간표를 채워요. 이미 작성한 시간표는 유지돼요.</p>
      {planning ? <div className="tt-planner"><TimetableTab draft={cls} onSubjects={(subjects) => { void saveClass({ ...latest(), subjects }); }} /></div> : <>
      <TimetableTour first={answer[0] ?? ''} />
      <div ref={bodyRef}>
        <div className="tt-popup">
          <div className="tt-slots">
            <div className="tt-section-title">교시별 시간표 {!graded && <span style={{ fontWeight: 500, color: '#aaa' }}>(자유 배치)</span>}</div>
            {slots.map((cur, i) => {
              const ok = graded && !!cur && cur === answer[i];
              return (
                <div key={i} className={`tt-slot${ok ? ' correct' : ''}${shake === i ? ' shake' : ''}`} data-slot={i}>
                  <span className="pnum">{i + 1}교시</span>
                  <div className="drop-zone">
                    {cur
                      ? <div className={`subject-chip in-slot${cur.length > 6 ? ' long' : ''}`} {...dragProps({ name: cur, from: i })}><span className="ico">{subjectIcon(cur, cls)}</span><span className="nm">{cur}</span></div>
                      : <span style={{ color: 'var(--text-sub)', fontSize: 16 }}>여기에 끌어다 놓으세요</span>}
                  </div>
                  {cur && <button className="slot-clear" title="비우기" aria-label={`${i + 1}교시 비우기`} onClick={() => { setSlots(move(slots, cur, i, 'bank')); playSound('select'); }}>✕</button>}
                  {ok && <span className="check">✓</span>}
                </div>
              );
            })}
          </div>
          <div className="tt-bank">
            <div className="tt-section-title sj-head">
              교과 보관함
              <button type="button" className={`sj-edit${editing ? ' on' : ''}`} aria-pressed={editing} onClick={() => { setEditing(!editing); playSound(editing ? 'save' : 'select'); }}>
                {editing ? '✓ 편집 끝' : '✏️ 교과 편집'}
              </button>
            </div>
            {editing && <div className="sj-hint">끌어서 순서를 바꾸고, <b>−</b> 로 빼요. 뺀 교과는 아래 점선 카드를 눌러 다시 넣어요.</div>}
            <div className={`tt-bank-grid${editing ? ' editing' : ''}`} data-bank="1">
              {bank.map((s) => (
                <div key={s} className={`subject-chip${s.length > 4 ? ' long' : ''}`} title={s} data-subj={s} {...bankProps(s)}>
                  <span className="ico">{subjectIcon(s, cls)}</span><span className="nm">{s}</span>
                  {editing && <button type="button" className="sj-x" aria-label={`${s} 빼기`} onClick={() => removeSubject(s)}><i className="ph-bold ph-minus" /></button>}
                </div>
              ))}
              {editing && hiddenSubjects(cls).filter((s) => !bank.includes(s)).map((s) => (
                <button key={s} type="button" className={`subject-chip sj-hidden${s.length > 4 ? ' long' : ''}`} title={`${s} 다시 넣기`} onClick={() => restoreSubject(s)}><span className="ico">＋</span><span className="nm">{s}</span></button>
              ))}
              <button className="subject-chip add-chip" type="button" onClick={addSubject}><span className="ico">➕</span>직접입력</button>
            </div>
          </div>
        </div>
        <div className="tt-popup-actions">
          {graded && <button className="btn-hint" onClick={() => { if (slots.some(Boolean) && !confirm('지금 배치한 시간표를 저장된 요일 시간표로 바꿀까요?')) return; setSlots([...answer]); playSound('select'); }}>요일 시간표 불러오기</button>}
          {graded && <button className="btn-hint" onClick={() => { setSlots([...answer]); playSound('complete'); }}>💡 정답 보기</button>}
          <button className="btn-cancel" onClick={() => { setSlots(Array<string>(MAX_PERIODS).fill('')); playSound('select'); }}>↺ 초기화</button>
          <button className="btn-done" disabled={!anyFilled} onClick={done}>{isPerfect(slots, answer) ? '🎉 완벽해요!' : anyFilled ? '✅ 완료' : '1칸 이상 채워주세요'}</button>
        </div>
      </div>
      </>}
    </Popup>
  );
}

const manifest: FeatureManifest = { id: 'timetable', cards: [{ id: 'timetable', title: '오늘의 시간표', ...TITLE, Component: TimetableCard }] };
export default manifest;
