import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isFacePhoto } from '@/core/data/facePhoto';
import { setStudentFace } from '@/core/data/faces';
import { Popup } from './Popup';
import { cropGeometry, INITIAL_CROP, type Crop } from './faceCrop';
import './face.css';

export function FaceControl({classId, studentId, photo, render}: {classId: string; studentId: string; photo?: string; render: (photo?: string) => ReactNode}) {
  const [open, setOpen] = useState(false);
  return <div className="face-control" onClick={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()}>
    <button className="face-entry" onClick={()=>setOpen(true)}>{photo ? '내 얼굴 바꾸기' : '내 얼굴 넣기'}</button>
    {open && <FaceEditor photo={photo} render={render} onClose={()=>setOpen(false)} onSave={value=>setStudentFace(classId,studentId,value)}/>}
  </div>;
}
export function FaceEditor({photo, render, onClose, onSave}: {photo?: string; render: (photo?: string)=>ReactNode; onClose: ()=>void; onSave: (photo?: string)=>Promise<void>}) {
  const [source, setSource] = useState<HTMLImageElement>();
  const [crop, setCrop] = useState<Crop>(INITIAL_CROP);
  const [preview, setPreview] = useState(isFacePhoto(photo) ? photo : undefined);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const file = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const alive = useRef(true), request = useRef(0);
  const drag = useRef<{id:number; x:number; y:number; crop:Crop} | undefined>(undefined);
  const stopCamera = () => { request.current++; stream.current?.getTracks().forEach(t=>t.stop()); stream.current=null; setCamera(false); setStartingCamera(false); };
  useEffect(()=>{ alive.current=true; return ()=>{alive.current=false;request.current++;stream.current?.getTracks().forEach(t=>t.stop());}; },[]);
  useEffect(()=>{if(camera && video.current){video.current.srcObject=stream.current;void video.current.play().catch(()=>setError('카메라를 재생하지 못했어요. 파일을 골라 주세요.'));}},[camera]);
  const load = async (src:string) => {
    setLoading(true);setError('');
    try {const img=new Image();img.src=src;await img.decode();if(!alive.current)return;setSource(img);setCrop({...INITIAL_CROP});}
    catch {if(alive.current)setError('사진을 읽지 못했어요. JPG·PNG 사진을 골라 주세요.');}
    finally {if(alive.current)setLoading(false);}
  };
  useEffect(()=>{if(isFacePhoto(photo))void load(photo);},[photo]);
  useEffect(()=>{
    if(!source)return;
    const g=cropGeometry(source.naturalWidth,source.naturalHeight,crop);
    const canvas=document.createElement('canvas');canvas.width=canvas.height=320;
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,320,320);
    ctx.drawImage(source,g.left*320,g.top*320,g.width*320,g.height*320);
    setPreview(canvas.toDataURL('image/jpeg',.88));
  },[source,crop]);
  const move=(next:Crop)=>{if(source)setCrop(cropGeometry(source.naturalWidth,source.naturalHeight,next).crop);};
  const startCamera=async()=>{
    stopCamera();const token=++request.current;setStartingCamera(true);setError('');
    try {const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:{ideal:1280}},audio:false});
      if(!alive.current || token!==request.current){s.getTracks().forEach(t=>t.stop());return;}stream.current=s;setCamera(true);
    } catch {if(alive.current && token===request.current)setError('카메라를 사용할 수 없어요. 권한을 확인하거나 사진 파일을 골라 주세요.');}
    finally {if(alive.current && token===request.current)setStartingCamera(false);}
  };
  const save=async(value?:string)=>{setBusy(true);setError('');try{await onSave(value);onClose();}catch{setError('저장하지 못했어요. 다시 눌러 주세요.');}finally{setBusy(false);}};
  return <div onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();if(!busy)onClose();}}}>
    <Popup title="내 얼굴 넣기" onClose={()=>{if(!busy)onClose();}}>
      <div className="face-editor">
        <div className="face-source-actions"><button disabled={busy||loading} onClick={()=>{stopCamera();file.current?.click();}}>사진 파일 선택</button><button disabled={busy||loading||startingCamera} onClick={()=>void startCamera()}>사진 찍기</button></div>
        <input ref={file} type="file" accept="image/*" hidden onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(!f)return;if(f.size>20*1024*1024){setError('20MB 이하 사진을 골라 주세요.');return;}const url=URL.createObjectURL(f);try{await load(url);}finally{URL.revokeObjectURL(url);}}}/>
        {camera ? <div className="face-camera"><video ref={video} autoPlay playsInline muted/><button onClick={()=>{const v=video.current;if(!v?.videoWidth)return;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d')!.drawImage(v,0,0);void load(c.toDataURL('image/jpeg',.9));stopCamera();}}>촬영하기</button><button onClick={stopCamera}>카메라 닫기</button></div> : <div className="face-edit-layout"><div className="face-avatar-preview">{render(preview)}</div><div className="face-crop-tools">
          <div className="face-crop" role="group" aria-label="사진 위치 조절" tabIndex={0}
            onPointerDown={e=>{if(!source||busy)return;e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,crop};}}
            onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const size=e.currentTarget.getBoundingClientRect().width;move({...d.crop,x:d.crop.x+(e.clientX-d.x)/size,y:d.crop.y+(e.clientY-d.y)/size});}}
            onPointerUp={()=>{drag.current=undefined;}} onPointerCancel={()=>{drag.current=undefined;}}
            onKeyDown={e=>{const delta:Record<string,[number,number]>={ArrowLeft:[-.02,0],ArrowRight:[.02,0],ArrowUp:[0,-.02],ArrowDown:[0,.02]};if(delta[e.key]){e.preventDefault();move({...crop,x:crop.x+delta[e.key][0],y:crop.y+delta[e.key][1]});}}}>
            {preview ? <img src={preview} alt="원 안의 내 얼굴" draggable={false}/> : <span>사진을 골라 주세요</span>}
          </div>
          <p>원 안의 사진을 움직여 맞춰요</p>
          <label>사진 크기<input aria-label="사진 크기" type="range" min="1" max="4" step=".01" disabled={!source||busy} value={crop.zoom} onChange={e=>move({...crop,zoom:Number(e.target.value)})}/></label>
          <button disabled={!source||busy} onClick={()=>setCrop({...INITIAL_CROP})}>가운데로</button>
        </div></div>}
        {loading && <p role="status">사진을 불러오고 있어요…</p>}{startingCamera && <p role="status">카메라 권한을 확인해 주세요</p>}{error && <p role="alert">{error}</p>}
        <div className="popup-actions"><button className="btn-cancel" disabled={!photo||busy} onClick={()=>void save(undefined)}>얼굴 초기화</button><button className="btn-save" disabled={!preview||busy||loading||camera||startingCamera} onClick={()=>void save(preview)}>{busy?'저장하고 있어요…':'저장'}</button></div>
      </div>
    </Popup>
  </div>;
}
