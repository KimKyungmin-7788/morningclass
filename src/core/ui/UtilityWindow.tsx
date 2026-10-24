import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './utilityWindow.css';
import { WindowDocument } from './WindowDocument';

/** 버튼 클릭 안에서 호출해야 브라우저가 새 창을 허용한다. */
export function openUtilityWindow(title: string): Window | null {
  const child=window.open('', '_blank', 'popup=yes,width=1000,height=740,resizable=yes,scrollbars=yes');
  if(!child || child.closed)return null;
  child.document.title=title;
  const base=child.document.createElement('base');base.href=document.baseURI;child.document.head.append(base);
  document.querySelectorAll('link[rel="stylesheet"],style').forEach(node=>child.document.head.append(node.cloneNode(true)));
  child.document.body.className='utility-document';
  return child;
}
export function UtilityWindow({title,external,onClose,children,initialPlacement='default'}: {initialPlacement?:'default'|'top-right';title:string;external?:Window|null;onClose:()=>void;children:ReactNode}) {
  const [target,setTarget]=useState(external ?? null);
  const [full,setFull]=useState(false);
  const [pos,setPos]=useState(()=>initialPlacement==='top-right' ? {x:Math.max(8,window.innerWidth-Math.min(960,window.innerWidth*.9)-56),y:Math.min(32,window.innerHeight*.04)} : {x:40,y:70});
  const [error,setError]=useState('');
  const root=useRef<HTMLDivElement>(null);
  const closingTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
  const closeRef=useRef(onClose);closeRef.current=onClose;
  const doc=target?.document ?? document;
  useEffect(()=>{
    if(!target)return;
    clearTimeout(closingTimer.current);
    const closed=()=>closeRef.current();
    const parentClosed=()=>target.close();
    target.addEventListener('beforeunload',closed);window.addEventListener('pagehide',parentClosed);
    const poll=window.setInterval(()=>{if(target.closed)closed();},500);
    return ()=>{clearInterval(poll);target.removeEventListener('beforeunload',closed);window.removeEventListener('pagehide',parentClosed);closingTimer.current=setTimeout(()=>{if(!target.closed)target.close();},0);};
  },[target]);
  useEffect(()=>{const change=()=>setFull(!!doc.fullscreenElement);doc.addEventListener('fullscreenchange',change);return()=>doc.removeEventListener('fullscreenchange',change);},[doc]);
  return createPortal(<div ref={root} className={`utility-window ${target?'is-external':'is-floating'}${full?' is-full':''}`} style={!target&&!full?{left:pos.x,top:pos.y}:undefined} role="dialog" aria-label={title}>
    <div className="utility-titlebar" onPointerDown={e=>{if(target||full||(e.target as HTMLElement).closest('button'))return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,left:pos.x,top:pos.y};}} onPointerMove={e=>{const d=drag.current;if(d)setPos({x:Math.max(0,Math.min(window.innerWidth-100,d.left+e.clientX-d.x)),y:Math.max(0,Math.min(window.innerHeight-60,d.top+e.clientY-d.y))});}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>
      <strong>{title}</strong><div>{!target&&<button onClick={()=>{const child=openUtilityWindow(title);if(child)setTarget(child);else setError('새 창이 차단됐어요. 브라우저에서 팝업을 허용해 주세요.');}}>별도 창으로 ↗</button>}<button onClick={async()=>{try{if(doc.fullscreenElement)await doc.exitFullscreen();else await root.current?.requestFullscreen();}catch{setFull(v=>!v);}}}>{full?'작게 보기':'전체 화면'}</button><button aria-label={`${title} 닫기`} onClick={onClose}>✕</button></div>
    </div>
    {error&&<p role="status">{error}</p>}<div className="utility-content"><WindowDocument.Provider value={doc}>{children}</WindowDocument.Provider></div>
  </div>,doc.body);
}
