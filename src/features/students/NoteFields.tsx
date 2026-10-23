import type { NotesConfig, StudentNote } from '@/core/data/types';
import { CATEGORIES, SUPPORTS } from './model';

export function NoteFields({ value, onChange, config }: { value: StudentNote; onChange: (n: StudentNote) => void; config: NotesConfig }) {
  const patch = (p: Partial<StudentNote>) => onChange({ ...value, ...p });
  const abc = value.abc ?? { a: '', b: '', c: '' };
  const setAbc = (p: Partial<NonNullable<StudentNote['abc']>>) => patch({ abc: { ...abc, ...p } });
  return <div className="sc-fields">
    <label>관찰한 모습<textarea value={value.text} onChange={(e) => patch({ text: e.target.value })} placeholder="관찰한 모습을 적어 주세요" /></label>
    <fieldset><legend>분류</legend><div className="sc-chips">{CATEGORIES.map(([id, name]) => <button key={id} aria-pressed={value.category === id} onClick={() => patch({ category: value.category === id ? undefined : id, abc: id === 'challenge' ? abc : undefined })}>{name}</button>)}</div></fieldset>
    <fieldset><legend>도움 수준 <span className="sc-hint">선택</span></legend><div className="sc-chips">{SUPPORTS.map(([id, name]) => <button key={id} aria-pressed={value.support === id} onClick={() => patch({ support: value.support === id ? undefined : id })}>{name}</button>)}</div></fieldset>
    {value.category === 'challenge' && <fieldset className="sc-abc"><legend>도전행동 · 상황과 대응</legend>{(['a','b','c'] as const).map((key) => <label key={key}>{({ a: '직전 상황 (A)', b: '보인 행동 (B)', c: '이후 대응 (C)' })[key]}<input value={abc[key]} onChange={(e) => setAbc({ [key]: e.target.value })} />{key !== 'b' && <span className="sc-chips">{config[key === 'a' ? 'abcA' : 'abcC'].map((text) => <button key={text} onClick={() => setAbc({ [key]: abc[key] ? `${abc[key]} · ${text}` : text })}>{text}</button>)}</span>}</label>)}
      <label>강도<select value={abc.intensity ?? ''} onChange={(e) => setAbc({ intensity: (e.target.value || undefined) as typeof abc.intensity })}><option value="">고르지 않음</option><option value="low">약</option><option value="mid">중</option><option value="high">강</option></select></label>
      <label>지속 시간(분)<input type="number" min="0" step="0.1" value={abc.minutes ?? ''} onChange={(e) => { const v = e.target.value; if (!v || Number(v) >= 0) setAbc({ minutes: v === '' ? undefined : Number(v) }); }} /></label>
    </fieldset>}
    <label className="sc-check"><input type="checkbox" checked={!!value.share} onChange={(e) => patch({ share: e.target.checked ? true : undefined })} />학부모와 나누기</label>
  </div>;
}
