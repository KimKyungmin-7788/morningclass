import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FaceEditor } from './FaceControl';
import { OutfitFigure } from './OutfitFigure';
import { EmotionFace } from './EmotionFace';
import '@/styles/legacy.css';
import '@/styles/v2.css';
function Preview() {
 const [avatar,setAvatar]=useState<'boy'|'girl'>('boy');
 const [photos,setPhotos]=useState<Record<string,string|undefined>>({});
 const [open,setOpen]=useState(false);
 const [emotion,setEmotion]=useState(false);
 const photo=photos[avatar];
 const pose=`/img/emotion/${avatar==='boy'?'person.webp':'girl.png'}`;
 const render=(p?:string)=>emotion?<div className="emo-face-preview"><img src={pose} alt="감정 아바타"/><EmotionFace photo={p}/></div>:<OutfitFigure avatar={avatar} clothes={{top:'stripe-shirt',outer:'jacket',bottom:'pants',shoes:'sneakers'}} facePhoto={p}/>;
 return <main style={{display:'block',maxWidth:850,margin:'auto',padding:24}}><h1>내 얼굴 넣기 미리보기</h1><p>실제 학생 자료에는 저장하지 않아요.</p><div className="face-source-actions">{(['boy','girl'] as const).map(a=><button key={a} aria-pressed={a===avatar} onClick={()=>setAvatar(a)}>{a==='boy'?'남학생':'여학생'}</button>)}<button onClick={()=>setEmotion(!emotion)}>{emotion?'옷입히기 보기':'감정 보기'}</button><button onClick={async()=>{const img=new Image();img.src='/img/emotion/person.webp';await img.decode();const c=document.createElement('canvas');c.width=c.height=320;const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.fillRect(0,0,320,320);ctx.drawImage(img,167,131,190,190,0,0,320,320);setPhotos(p=>({...p,[avatar]:c.toDataURL('image/jpeg',.88)}));setOpen(true);}}>예시 얼굴로 확인</button></div><div className="face-avatar-preview" style={{height:500}}>{render(photo)}<button className="face-entry" style={{position:'absolute',top:8,left:8}} onClick={()=>setOpen(true)}>{photo?'내 얼굴 바꾸기':'내 얼굴 넣기'}</button></div>{open&&<FaceEditor photo={photo} render={render} onClose={()=>setOpen(false)} onSave={async value=>setPhotos(p=>({...p,[avatar]:value}))}/>}</main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
