import { useState } from 'react';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { SUBJECT_ICON_CHOICES, levelSubjects, subjectBank, subjectIcon } from '@/core/data/subjects';
import { MAX_PERIODS, useTimetables } from '@/core/data/timetables';
import type { ClassRoom } from '@/core/data/types';

// 시간표 모달: 요일별 정답 시간표 입력(바로 저장) + 과목 관리(숨기기·추가·삭제·아이콘, 바로 저장)

const DAYS = ['월', '화', '수', '목', '금'];

export function TimetableTab({ draft, onSubjects }: { draft: ClassRoom; onSubjects: (s: ClassRoom['subjects']) => void }) {
  const { byDay, save } = useTimetables(draft.id);
  const [brush, setBrush] = useState<string | null>(null);
  const [copyFrom, setCopyFrom] = useState(0);
  const [copyTo, setCopyTo] = useState(1);
  const [pick, setPick] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const periodsOf = (day: number) => Array.from({ length: MAX_PERIODS }, (_, i) => byDay?.[day]?.[i] ?? '');
  const fill = (day: number, period: number, value: string) => save(day, periodsOf(day).map((v, i) => i === period ? value : v));
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

  if (!byDay) return <p role="status">저장된 시간표를 불러오는 중이에요…</p>;

  return (
    <>
      <div className="tt-week-heading"><h3>우리 반 주간 시간표</h3><span>변경 즉시 저장</span></div>
      <p className="tt-week-help">과목을 고른 뒤 여러 칸을 눌러 채우세요. ‘직접 입력’에서는 Tab 키로 다음 칸으로 이동해요.</p>
      <div className="tt-week-tools" aria-label="시간표 입력 도구">
        <button aria-pressed={brush === null} onClick={() => setBrush(null)}>직접 입력</button>
        <button aria-pressed={brush === ''} onClick={() => setBrush('')}>지우개</button>
        <span className="tt-tool-divider" />
        {subjectBank(draft).map((n) => <button key={n} aria-pressed={brush === n} onClick={() => setBrush(n)}><span aria-hidden="true">{subjectIcon(n, draft)}</span> {n}</button>)}
      </div>
      <div className="tt-week-scroll">
        <table className="tt-week-table">
          <caption className="tt-week-status">{brush === null ? '직접 입력 중' : brush === '' ? '지울 칸을 누르세요' : `${brush} · 넣을 칸을 누르세요`}</caption>
          <thead><tr><th scope="col">교시</th>{DAYS.map((d) => <th scope="col" key={d}>{d}요일</th>)}</tr></thead>
          <tbody>{Array.from({ length: MAX_PERIODS }, (_, period) => <tr key={period}>
            <th scope="row">{period + 1}</th>
            {DAYS.map((d, day) => {
              const value = periodsOf(day)[period];
              const label = `${d}요일 ${period + 1}교시`;
              return <td key={d} className={value ? 'filled' : ''}>
                {brush === null ? <input aria-label={label} value={value} placeholder="—" list="subj-dl" onChange={(e) => fill(day, period, e.target.value)} />
                  : <button aria-label={`${label}: ${value || '비어 있음'}, ${brush || '지우기'} 적용`} onClick={() => fill(day, period, brush)}>{value || <span className="tt-week-empty">＋</span>}</button>}
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      <div className="tt-week-copy">
        <span>요일 복사</span>
        <select aria-label="복사할 요일" value={copyFrom} onChange={(e) => setCopyFrom(Number(e.target.value))}>{DAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}</select>
        <span aria-hidden="true">→</span>
        <select aria-label="붙여넣을 요일" value={copyTo} onChange={(e) => setCopyTo(Number(e.target.value))}>{DAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}</select>
        <button disabled={copyFrom === copyTo} onClick={() => {
          if (periodsOf(copyTo).some(Boolean) && !confirm(`${DAYS[copyTo]}요일 시간표를 ${DAYS[copyFrom]}요일 내용으로 바꿀까요?`)) return;
          save(copyTo, periodsOf(copyFrom)); toast('요일 시간표를 복사했어요', 'success');
        }}>복사</button>
      </div>
      <datalist id="subj-dl">{subjectBank(draft).map((n) => <option key={n} value={n} />)}</datalist>

      <details className="tt-subject-details">
      <summary>과목 관리 <span>과목 추가 · 숨기기 · 아이콘 변경</span></summary>

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
      </details>
    </>
  );
}
