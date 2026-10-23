import { outfitAsset } from '@/core/ui/outfitAssets';
import { useState } from 'react';
import { useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { completeOutfit, chooseOutfitAvatar } from '@/core/data/outfits';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { OutfitFigure } from '@/core/ui/OutfitFigure';
import { Popup } from '@/core/ui/Popup';
import { OutfitEditor } from './Editor';
import { lastCompleted } from './model';
import type { FeatureManifest } from '../types';
import './outfit.css';
const icon = { icon:'ph-fill ph-t-shirt', tint:'#ECFCCB', color:'#4D7C0F' };
function OutfitCard() {
  const cls = useData(s => s.classes.find(c => c.id === s.currentClassId));
  const record = useDay(s => s.record);
  const [filtersTarget, setFiltersTarget] = useState<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string>();
  const students = cls?.students.filter(s => !s.archived) ?? [];
  const last = lastCompleted(record, students.map(s => s.id));
  const completed = last ? record.outfits?.[last] : undefined;
  const student = students.find(s => s.id === selected);
  const close = () => { setOpen(false); setSelected(undefined); };
  return <><CardFrame id="outfit" label="오늘은 어떤 옷?" state={completed ? 'filled' : 'empty'} onOpen={()=>setOpen(true)}>
    <CardTitle {...icon}>오늘은 어떤 옷?</CardTitle>
    {completed ? <div className="outfit-card-result"><OutfitFigure avatar={completed.avatar} clothes={completed.clothes}/><div><strong>{students.find(s=>s.id===last)?.name}</strong><span>마지막으로 완성했어요 ✓</span></div></div> : <div className="outfit-card-empty">👕<span>터치해서 내 옷을 골라요</span></div>}
  </CardFrame>
  {open && cls && <Popup title="👕 오늘은 어떤 옷?" large onClose={close}>
    <div className="outfit-shell" key={`${cls.id}:${record.date}`}>
      <div className="outfit-toolbar"><div className="outfit-students" role="group" aria-label="옷 입힐 학생">{students.map(s=><button key={s.id} disabled={choosing} aria-pressed={s.id===selected} onClick={()=>{setSelected(s.id);setError('');}}>{s.name}{record.outfits?.[s.id] ? ' ✓' : ''}</button>)}</div><div className="outfit-toolbar-filters" ref={setFiltersTarget}/><span className="outfit-date">{record.date.slice(4,6)}월 {record.date.slice(6,8)}일</span></div>
      <div className="outfit-editor-wrap">
        <div className={`outfit-editor-body${!student?.outfitAvatar ? ' is-inactive' : ''}`} inert={!student?.outfitAvatar}>
          <OutfitEditor filtersTarget={filtersTarget} controlsDisabled={!student?.outfitAvatar} key={`${cls.id}:${record.date}:${student?.id}:${student?.outfitAvatar}`} avatar={student?.outfitAvatar ?? 'boy'} initial={student ? record.outfits?.[student.id] : undefined} onComplete={async value => { if (!student?.outfitAvatar) return; await completeOutfit(cls.id, record.date, student.id, value); close(); }}/>
        </div>
        {!student && <div className="outfit-selection-hint">{students.length ? '학생을 골라요' : '학생설정에서 학생을 등록해 주세요'}</div>}
        {student && !student.outfitAvatar && <div className="outfit-avatar-first"><h2>{student.name}의 아바타</h2><div>{(['boy','girl'] as const).map(avatar=><button key={avatar} disabled={choosing} onClick={async()=>{setChoosing(true);setError('');try {await chooseOutfitAvatar(cls.id,student.id,avatar);} catch {setError('저장하지 못했어요. 다시 골라 주세요.');} finally {setChoosing(false);}}}><img src={outfitAsset(avatar)} alt=""/>{avatar==='boy'?'남학생':'여학생'}</button>)}</div>{error && <p role="alert">{error}</p>}</div>}
      </div>
    </div>
  </Popup>}
  </>;
}
const manifest: FeatureManifest = { id:'outfit', cards:[{id:'outfit',title:'오늘은 어떤 옷?',...icon,Component:OutfitCard}] };
export default manifest;
