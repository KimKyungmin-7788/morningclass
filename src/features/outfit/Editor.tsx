import { FaceControl } from '@/core/ui/FaceControl';
import { outfitAsset, outfitRegistration } from '@/core/ui/outfitAssets';
import { createPortal } from 'react-dom';
import { OutfitFigure } from '@/core/ui/OutfitFigure';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { StudentOutfit } from '@/core/data/types';
import './editor.css';
import { dress, garment, initialState, visibleItems, wornItems, type Avatar, type Item, type OutfitState, type Season, type Category, type Weather } from './model';

const path = outfitAsset;
export function OutfitEditor({ initial, avatar, onAvatarChange, facePhoto, studentId, classId, filtersTarget, controlsDisabled = false, onComplete }: { initial?: StudentOutfit; avatar?: Avatar; onAvatarChange?: (avatar: Avatar)=>Promise<void>; facePhoto?: string; studentId?: string; classId?: string; filtersTarget?: HTMLElement | null; controlsDisabled?: boolean; onComplete: (value: StudentOutfit) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState(() => { const value = initialState(); if (avatar) value.avatar = avatar; if (initial) { value.avatar = avatar ?? initial.avatar; value.outfits[value.avatar] = initial.clothes; } return value; });
  useEffect(()=>{if(avatar)setState(previous=>previous.avatar===avatar?previous:{...previous,avatar,outfits:{...previous.outfits,[avatar]:previous.outfits[previous.avatar]}});},[avatar]);
  const [changingAvatar,setChangingAvatar]=useState(false);
  const [history, setHistory] = useState<OutfitState[]>([]);
  const [message, setMessage] = useState('');
  const [drag, setDrag] = useState<{ item: Item; x: number; y: number } | null>(null);
  const [over, setOver] = useState(false);
  const [category, setCategory] = useState<Category>('all');
  const [season, setSeason] = useState<Season|'all'>(initial?.season ?? 'all');
  const [weather, setWeather] = useState<Weather>(initial?.weather === '바람' ? '맑음' : initial?.weather ?? '맑음');
  
  const stage = useRef<HTMLDivElement>(null);
  const closet = useRef<HTMLElement>(null);
  const pointer = useRef<{ item: Item; x: number; y: number; moved: boolean; worn: boolean } | null>(null);
  const suppressClick = useRef(false);
  const outfit = state.outfits[state.avatar];
  const visible = visibleItems(season, category, weather);
  const equipped = (item: Item) => outfit[garment(item).slot] === item;
  const remember = (next: OutfitState) => { setHistory((h) => [...h.slice(-19), state]); setState(next); };
  const wear = (item: Item, on: boolean) => {
    const info = garment(item);
    if (equipped(item) === on || (!on && info.base)) return;
    remember(dress(state, item, on));
    setMessage(on ? `${info.name} 착용` : `${info.name} 벗었어요`);
  };
  const inside = (x: number, y: number, worn = false) => { const r = (worn ? closet : stage).current?.getBoundingClientRect(); return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
  const startDrag = (e: PointerEvent<HTMLButtonElement>, item: Item, worn = false) => { if (e.button !== 0) return; pointer.current = {item, x:e.clientX, y:e.clientY, moved:false, worn}; suppressClick.current = false; e.currentTarget.setPointerCapture(e.pointerId); };
  const moveDrag = (e: PointerEvent<HTMLButtonElement>) => { const p = pointer.current; if (!p) return; if (Math.hypot(e.clientX-p.x,e.clientY-p.y)>8) p.moved=true; if(p.moved) { setDrag({item:p.item,x:e.clientX,y:e.clientY}); setOver(!p.worn && inside(e.clientX,e.clientY)); } };
  const endDrag = (e: PointerEvent<HTMLButtonElement>) => { const p=pointer.current; if(p?.moved) { suppressClick.current=true; if(inside(e.clientX,e.clientY,p.worn)) wear(p.item,!p.worn); } pointer.current=null;setDrag(null);setOver(false); };
  const cancelDrag = () => { pointer.current=null;setDrag(null);setOver(false);suppressClick.current=true; };
  const selectAvatar = async (next: Avatar) => {if(changingAvatar)return;setChangingAvatar(true);try{if(onAvatarChange)await onAvatarChange(next);else setState({...state,avatar:next});setHistory([]);setMessage('');}catch{setMessage('아바타를 저장하지 못했어요. 다시 골라 주세요.');}finally{setChangingAvatar(false);}};
  const filters = <div className="outfit-filters">        <div className="seasons" role="group" aria-label="계절">{(['all','봄','여름','가을','겨울'] as const).map((s,i)=><button disabled={controlsDisabled} key={s} aria-pressed={season===s} onClick={()=>{setSeason(s);}}>{['','🌸','☀️','🍂','❄️'][i]} {s === 'all' ? '전체' : s}</button>)}</div>
        <div className="weather" role="group" aria-label="날씨">{(['맑음','비','눈'] as const).map((w,i)=><button disabled={controlsDisabled} key={w} aria-pressed={weather===w} onClick={()=>setWeather(w)}>{['☀️','🌧️','🌨️'][i]} {w}</button>)}</div>
</div>;
  return <div className="outfit-editor">
    {filtersTarget ? createPortal(filters, filtersTarget) : filters}

    <div className="workspace">
      <section className="avatar-panel" aria-label="나의 아바타"><div className="panel-top"><h2>나의 아바타</h2>{(!avatar || onAvatarChange) && <div className="avatar-select" role="group" aria-label="아바타 선택">{(['boy','girl'] as const).map(a=><button key={a} disabled={changingAvatar} aria-pressed={state.avatar===a} onClick={()=>selectAvatar(a)}>{a==='boy'?'남학생':'여학생'}</button>)}</div>}</div>
        <div className={`stage${over?' drop-over':''}`} ref={stage} aria-label="옷을 놓는 곳">{studentId && classId && <FaceControl classId={classId} studentId={studentId} photo={facePhoto} render={photo=><OutfitFigure avatar={state.avatar} clothes={outfit} facePhoto={photo}/>}/>}<span className="weather-badge">{season === 'all' ? '모든 계절' : season} · {weather}</span><div className="doll"><OutfitFigure avatar={state.avatar} clothes={outfit} facePhoto={facePhoto}/>{(['upper','bottom','shoes','hat','neck','hand'] as const).map(zone => { const item = zone === 'upper' ? outfit.outer ?? outfit.top : outfit[zone]; return item && !garment(item).base ? <button key={zone} className={`worn-target worn-${zone}`} aria-label={`${garment(item).name} 옷장으로 벗기`} onPointerDown={e=>startDrag(e,item,true)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}wear(item,false);}}/> : null; })}</div>{over&&<span className="drop-label">여기에 놓아요!</span>}</div>
        <div className="worn" aria-label="입은 옷"><span>입은 옷</span>{wornItems(outfit).map(item=>garment(item).base ? <span className="base-label" key={item}>{garment(item).name}</span> : <button key={item} onClick={()=>wear(item,false)} aria-label={`${garment(item).name} 벗기`}>{garment(item).name} <span aria-hidden="true">×</span></button>)}</div>
        <button className="done" disabled={saving} onClick={async()=>{setSaving(true);try { await onComplete({avatar:state.avatar,clothes:outfit,season,weather,completedAt:new Date().toISOString()}); } catch { setMessage('저장하지 못했어요. 다시 눌러 주세요.'); } finally { setSaving(false); }}}>{saving ? '저장하고 있어요…' : '다 입었어요 ✓'}</button>
      </section>
      <section ref={closet} className="closet" aria-label="나의 옷장"><div className="panel-top"><h2>나의 옷장</h2><button className="outfit-undo" disabled={!history.length || saving} onClick={()=>{const previous=history.at(-1);if(previous){setState(previous);setHistory(history.slice(0,-1));}}}>↶ 되돌리기</button></div>
        <div className="categories" role="group" aria-label="옷 종류">{(['all','top','bottom','outer','accessory'] as const).map((c,i)=><button key={c} aria-pressed={category===c} onClick={()=>{setCategory(c);}}>{['전체','상의','하의','겉옷','신발·기타'][i]}</button>)}</div>
        <div className="items">{visible.map(item=><button className={`item ${item.id}`} key={item.id} aria-pressed={equipped(item.id)} aria-label={`${item.name} ${equipped(item.id)?(item.base?'선택됨':'벗기'):'입기'}`} onPointerDown={e=>startDrag(e,item.id)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag} onClick={()=>{if(suppressClick.current){suppressClick.current=false;return;}wear(item.id,!equipped(item.id));}}><span className="item-picture"><img src={path(item.image)} style={outfitRegistration(item.image)} alt="" draggable={false}/></span><span className="item-name">{item.name}</span><span className="check" aria-hidden="true">{equipped(item.id)?'✓':'＋'}</span></button>)}</div>
        {!visible.length && <p className="empty-items">다른 계절이나 옷 종류를 골라 주세요.</p>}
        <div className="layer-guide"><span>부위별로 하나씩, 따로 갈아입어요</span><div>{(['top','bottom','outer','shoes'] as const).map((slot,i)=><span key={slot} className={outfit[slot]?'active':''}>{['상의','하의','겉옷','신발'][i]} · {outfit[slot]?garment(outfit[slot]!).name:'없음'}</span>)}</div></div>
        <div className="feedback" role="status">{message}</div>

      </section>
    </div>{drag&&createPortal(<div className={`outfit-drag-ghost ${drag.item}`} style={{left:drag.x,top:drag.y}}><img src={path(garment(drag.item).image)} style={outfitRegistration(garment(drag.item).image)} alt="" draggable={false}/></div>,document.body)}
  </div>;
}
