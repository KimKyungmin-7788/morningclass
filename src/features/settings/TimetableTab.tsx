import { useState } from 'react';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { SUBJECT_ICON_CHOICES, levelSubjects, subjectBank, subjectIcon } from '@/core/data/subjects';
import { MAX_PERIODS, useTimetables } from '@/core/data/timetables';
import type { ClassRoom } from '@/core/data/types';

// 설정 → 시간표: 요일별 정답 시간표 입력(바로 저장) + 과목 관리(숨기기·추가·삭제·아이콘, 바로 저장)

const DAYS = ['월', '화', '수', '목', '금'];

export function TimetableTab({ draft, onSubjects }: { draft: ClassRoom; onSubjects: (s: ClassRoom['subjects']) => void }) {
  const { byDay, save } = useTimetables(draft.id);
  const [day, setDay] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const periods = Array.from({ length: MAX_PERIODS }, (_, i) => byDay?.[day]?.[i] ?? '');
  const subj = draft.subjects;
  const base = levelSubjects(draft);
  const custom = subj.custom.filter((n) => !base.includes(n));
  const change = (next: Partial<ClassRoom['subjects']>) => { onSubjects({ ...subj, ...next }); playSound('select'); };
  const setIcon = (target: string, e: string | null) => {
    const icons = { ...subj.icons };
    if (e) icons[target] = e; else delete icons[target];
    change({ icons }); setPick(null); setEmoji('');
  };
  const add = () => {
    const n = name.trim();
    if (!n) return;
    if (subj.custom.includes(n) || (base.includes(n) && !subj.hidden.includes(n))) { toast('이미 있는 과목이에요', 'error'); return; }
    onSubjects({ ...subj, hidden: subj.hidden.filter((x) => x !== n), custom: base.includes(n) ? subj.custom : [...subj.custom, n] });
    playSound('save'); toast(`"${n}" 추가됨 ✨`, 'success');
    setName(''); setPick(n);                                      // 추가한 과목의 아이콘을 바로 고를 수 있게
  };

  const item = (n: string, isCustom: boolean) => {
    const off = !isCustom && subj.hidden.includes(n);
    return (
      <div key={n} className={`subj-item${off ? ' off' : ''}${pick === n ? ' picking' : ''}`}>
        <button className="subj-ico" title="아이콘 바꾸기" aria-label={`${n} 아이콘 바꾸기`} onClick={() => { setPick(pick === n ? null : n); playSound('select'); }}>{subjectIcon(n, draft)}</button>
        <span className="subj-nm">{n}</span>
        {isCustom ? (
          <button className="subj-act del" aria-label={`${n} 삭제`} onClick={() => {
            if (!confirm(`'${n}' 과목을 삭제할까요?\n(이미 시간표에 넣은 날의 기록은 그대로 남아요)`)) return;
            const icons = { ...subj.icons }; delete icons[n];
            if (pick === n) setPick(null);
            change({ custom: subj.custom.filter((x) => x !== n), icons });
          }}><i className="ph-bold ph-trash" /> 삭제</button>
        ) : (
          <button className="subj-act" aria-pressed={!off} onClick={() => change({ hidden: off ? subj.hidden.filter((x) => x !== n) : [...subj.hidden, n] })}>
            <i className={`ph-bold ph-eye${off ? '-slash' : ''}`} /> {off ? '숨김' : '보임'}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <h3>📅 시간표 입력</h3>
      <div className="tt-day-tabs">
        {DAYS.map((d, i) => <button key={d} className={day === i ? 'active' : ''} onClick={() => setDay(i)}>{d}요일</button>)}
      </div>
      {periods.map((p, i) => (
        <div key={`${day}-${i}`} className="tt-period-row">
          <span className="lbl">{i + 1}교시</span>
          <input className="tt-pinp" value={p} placeholder="비워두면 미표시" list="subj-dl" aria-label={`${DAYS[day]}요일 ${i + 1}교시`}
            onChange={(e) => save(day, periods.map((x, k) => (k === i ? e.target.value : x)))} />
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        {DAYS.map((d, i) => i !== day && (
          <button key={d} className="copy-day-btn" onClick={() => { save(i, [...periods]); toast('복사 완료!', 'success'); }}>{DAYS[day]}→{d}</button>
        ))}
      </div>
      <datalist id="subj-dl">{subjectBank(draft).map((n) => <option key={n} value={n} />)}</datalist>

      <h3 style={{ marginTop: 26 }}>🧩 과목 관리 <small className="sec-sub">시간표 맞추기에 나오는 과목 카드를 우리 반에 맞게 꾸며요</small></h3>
      <div className="hint" style={{ marginBottom: 10 }}>아이콘을 누르면 그림을 바꿀 수 있어요. 안 쓰는 과목은 숨기고, 필요한 과목은 아래에서 추가해요. 바꾸면 바로 저장돼요.</div>
      <div className="subj-list">{base.map((n) => item(n, false))}{custom.map((n) => item(n, true))}</div>
      {pick && (
        <div className="subj-picker">
          <div className="sp-head">
            <b>{pick}</b> 아이콘 고르기
            <input maxLength={4} placeholder="직접 입력" aria-label="아이콘 직접 입력" value={emoji} onChange={(e) => setEmoji(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing && emoji.trim()) { e.preventDefault(); setIcon(pick, emoji.trim()); } }} />
            <button onClick={() => { if (emoji.trim()) setIcon(pick, emoji.trim()); }}>적용</button>
            <button onClick={() => setIcon(pick, null)}>기본으로</button>
            <button aria-label="닫기" onClick={() => setPick(null)}>✕</button>
          </div>
          <div className="sp-grid">
            {SUBJECT_ICON_CHOICES.map((e) => <button key={e} className={subjectIcon(pick, draft) === e ? 'on' : ''} onClick={() => setIcon(pick, e)}>{e}</button>)}
          </div>
        </div>
      )}
      <div className="subj-add">
        <input maxLength={10} placeholder="새 과목 이름 (10자 이내)" aria-label="새 과목 이름" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }} />
        <button onClick={add}>➕ 과목 추가</button>
      </div>
    </>
  );
}
