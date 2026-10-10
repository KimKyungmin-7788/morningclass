import { useRef, useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { activeStudents, useCurrentClass } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import type { AttendanceStatus, DayRecord } from '@/core/data/types';
import { ABSENT_REASONS, STATUS_LABEL, todayCounts } from './model';

// 오늘의 출석: 카드에는 출석·지각·결석 수, 창에서는 학생별로 고른다. 결석이면 사유를 고를 수 있다(선택).

const BUTTONS: { v: AttendanceStatus; cls: string; label: string }[] = [
  { v: 'present', cls: 'p', label: '🟢 출석' }, { v: 'late', cls: 'l', label: '🟡 지각' },
  { v: 'early', cls: 'e', label: '🟠 조퇴' }, { v: 'absent', cls: 'a', label: '🔴 결석' },
];

export function AttendanceCard() {
  const cls = useCurrentClass();
  const students = activeStudents(cls);
  const saved = useDay((s) => s.record.attendance);
  const update = useDay((s) => s.update);
  const [draft, setDraft] = useState<DayRecord['attendance'] | null>(null);   // null = 창이 닫혀 있음
  const listRef = useRef<HTMLDivElement>(null);
  const icon = { icon: 'ph-fill ph-users-three', tint: '#ffedd5', color: '#ea580c' };

  if (!students.length) {
    return (
      <CardFrame id="attendance" label="출석 체크" className="v3">
        <CardTitle {...icon}>오늘의 출석</CardTitle>
        <div className="card-hint">⚙️ 설정에서 학생을 등록해 주세요</div>
      </CardFrame>
    );
  }
  const c = todayCounts(students, saved);
  const allChecked = c.unchecked === 0;
  const set = (id: string, status: AttendanceStatus, name: string) => {
    setDraft((d) => ({ ...d, [id]: { status } }));              // 상태를 바꾸면 사유는 비운다
    playSound('check');
    speak(`${name} ${STATUS_LABEL[status]}`);
  };

  return (
    <>
      <CardFrame id="attendance" label="출석 체크" state={allChecked ? 'filled' : 'empty'} className="v3"
        onOpen={() => { ensureAudio(); setDraft({ ...saved }); }}>
        <CardTitle {...icon} extra={allChecked ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 출석</CardTitle>
        <div className="v3-stats">
          <div className="v3-stat p"><div className="n">{c.present}</div><div className="l">출석</div></div>
          <div className="v3-stat t"><div className="n">{c.late}</div><div className="l">지각</div></div>
          <div className="v3-stat a"><div className="n">{c.absent}</div><div className="l">결석</div></div>
        </div>
        <div className="v3-sub">전체 {students.length}명 · 미체크 {c.unchecked}명</div>
      </CardFrame>
      {draft && (
        <Popup title="🙋 오늘의 출석" onClose={() => setDraft(null)}>
          <div className="att-toolbar">
            <button onClick={() => { setDraft(Object.fromEntries(students.map((s) => [s.id, { status: 'present' as const }]))); playSound('correct'); }}>🟢 전원 출석</button>
            <button onClick={() => setDraft({})}>↺ 초기화</button>
          </div>
          <div className="att-list" ref={listRef}>
            {students.map((s) => {
              const cur = draft[s.id];
              return (
                <div key={s.id} className={`att-row ${cur?.status ?? ''}`}>
                  <div className="nm">{s.name}</div>
                  {BUTTONS.map((b) => (
                    <button key={b.v} className={cur?.status === b.v ? `active ${b.cls}` : ''} aria-pressed={cur?.status === b.v} onClick={() => set(s.id, b.v, s.name)}>{b.label}</button>
                  ))}
                  {cur?.status === 'absent' && (
                    <div className="att-reason">
                      <span>사유 (선택)</span>
                      {ABSENT_REASONS.map((r) => (
                        <button key={r} className={cur.reason === r ? 'on' : ''} aria-pressed={cur.reason === r}
                          onClick={() => { setDraft((d) => ({ ...d, [s.id]: cur.reason === r ? { status: 'absent' } : { status: 'absent', reason: r } })); playSound('select'); }}>{r}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <PopupActions>
            <button className="btn-cancel" onClick={() => setDraft(null)}>취소</button>
            <button className="btn-save" onClick={() => {
              // 명단에 없는 학생(보관된 학생)의 기록은 건드리지 않고 그대로 둔다
              const ids = new Set(students.map((s) => s.id));
              update((r) => { r.attendance = { ...Object.fromEntries(Object.entries(r.attendance).filter(([id]) => !ids.has(id))), ...draft }; });
              playSound('save'); toast('출석 체크 완료!', 'success'); setDraft(null);
            }}>✅ 완료</button>
          </PopupActions>
        </Popup>
      )}
    </>
  );
}
