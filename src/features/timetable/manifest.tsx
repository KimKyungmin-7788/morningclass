import { useRef, useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useCurrentClass, useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { subjectBank, subjectIcon, withSubject } from '@/core/data/subjects';
import { MAX_PERIODS, periodsOn, useTimetables } from '@/core/data/timetables';
import type { ClassRoom } from '@/core/data/types';
import type { FeatureManifest } from '../types';
import { hasAnswer, isCorrect, isPerfect, move, pad7, trimEnd } from './model';

// 오늘의 시간표: 과목 카드를 교시 칸에 끌어 놓아 맞춘다. 선생님이 설정에 넣은 시간표가 정답이 된다(없으면 자유 배치).

const TITLE = { icon: 'ph-fill ph-calendar-check', tint: '#e0e7ff', color: '#4f46e5' };

function TimetableCard() {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const tt = useDay((s) => s.record.timetable);
  const update = useDay((s) => s.update);
  const { byDay } = useTimetables(cls?.id ?? '');
  const [open, setOpen] = useState(false);
  const [noteAt, setNoteAt] = useState<number | null>(null);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const periods = periodsOn(date, byDay);
  const arranged = !!tt.arranged?.some(Boolean);
  const openPopup = () => { ensureAudio(); setOpen(true); };

  if (weekend) {
    return (
      <CardFrame id="timetable" label="시간표 맞추기" style={{ cursor: 'default' }}>
        <CardTitle {...TITLE}>오늘의 시간표</CardTitle><div className="card-hint">🎈 오늘은 쉬는 날이에요!</div>
      </CardFrame>
    );
  }
  return (
    <>
      <CardFrame id="timetable" label="시간표 맞추기" state={arranged ? 'filled' : 'empty'} onOpen={openPopup}>
        <CardTitle {...TITLE} extra={arranged ? <span className="v3-badge"><i className="ph-bold ph-check" />완성</span> : undefined}>오늘의 시간표</CardTitle>
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
        ) : <div className="card-hint">⚙️ 설정에서 시간표를 입력하거나 터치해서 직접 배치해요</div>}
      </CardFrame>
      {open && cls && <ArrangeWindow cls={cls} answer={pad7(periods)} onClose={() => setOpen(false)} />}
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

function ArrangeWindow({ cls, answer, onClose }: { cls: ClassRoom; answer: string[]; onClose: () => void }) {
  const saved = useDay((s) => s.record.timetable.arranged);
  const update = useDay((s) => s.update);
  const saveClass = useData((s) => s.saveClass);
  const [slots, setSlots] = useState(() => (Array.isArray(saved) ? pad7(saved) : pad7([])));
  const [shake, setShake] = useState<number | null>(null);
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
      const onUp = (ev: PointerEvent) => {
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
    <Popup title="오늘의 시간표를 맞춰봐요! 📅" large onClose={onClose}>
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
            <div className="tt-section-title">교과 보관함</div>
            <div className="tt-bank-grid" data-bank="1">
              {bank.map((s) => (
                <div key={s} className={`subject-chip${s.length > 4 ? ' long' : ''}`} title={s} {...dragProps({ name: s, from: null })}><span className="ico">{subjectIcon(s, cls)}</span><span className="nm">{s}</span></div>
              ))}
              <button className="subject-chip add-chip" type="button" onClick={addSubject}><span className="ico">➕</span>직접입력</button>
            </div>
          </div>
        </div>
        <div className="tt-popup-actions">
          {graded && <button className="btn-hint" onClick={() => { setSlots([...answer]); playSound('complete'); }}>💡 정답 보기</button>}
          <button className="btn-cancel" onClick={() => { setSlots(Array<string>(MAX_PERIODS).fill('')); playSound('select'); }}>↺ 초기화</button>
          <button className="btn-done" disabled={!anyFilled} onClick={done}>{isPerfect(slots, answer) ? '🎉 완벽해요!' : anyFilled ? '✅ 완료' : '1칸 이상 채워주세요'}</button>
        </div>
      </div>
    </Popup>
  );
}

const manifest: FeatureManifest = { id: 'timetable', cards: [{ id: 'timetable', col: 1, order: 1, Component: TimetableCard }] };
export default manifest;
