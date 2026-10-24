import { outfitBase } from './outfitVariants';
import { FacePhoto } from './FacePhoto';
import { useId } from 'react';
import { outfitAsset, outfitRegistration } from './outfitAssets';
import { affine, fittedPatches, GARMENT_RIGS, type Patch } from './outfitRig';
import type { OutfitAvatar, OutfitClothes, OutfitItem } from '@/core/data/types';
import './outfitFigure.css';
function Garment({ item, id, boots }: { item:string; id:string; boots:boolean }) {
  return <g data-garment={item}>{fittedPatches(item,boots).map((patch:Patch,i:number)=>{
    const key=`${id}-${i}`, matrix=affine(patch.source,patch.target);
    // 삼각형 내부 경계의 안티앨리어싱 틈만 0.5px 겹친다.
    const cx=patch.target.reduce((n,p)=>n+p[0],0)/3,cy=patch.target.reduce((n,p)=>n+p[1],0)/3;
    const points=patch.target.map(([x,y])=>{const d=Math.hypot(x-cx,y-cy);return `${x+(x-cx)/d*.5},${y+(y-cy)/d*.5}`;}).join(' ');
    return <g key={i}><defs><clipPath id={key}><polygon points={points}/></clipPath><clipPath id={`${id}-under-outer`}><path d="M445 530 L579 530 L644 620 L644 910 L380 910 L380 620 Z"/></clipPath></defs><g clipPath={`url(#${key})`}><image href={outfitAsset(item)} width="1024" height="1536" transform={`matrix(${matrix.join(' ')})`}/></g></g>;
  })}</g>;
}
export function OutfitFigure({ avatar, clothes, facePhoto }: { avatar: OutfitAvatar; clothes: OutfitClothes; facePhoto?: string }) {
  const id=useId().replace(/:/g,'');
  const boots=outfitBase(clothes.shoes??'')==='boots';
  const closed=['winter-coat','puffer'].includes(outfitBase(clothes.outer??''));
  const customTop=clothes.top!=='base-shirt'||closed;
  const longSleeves=!!clothes.outer||['sweater','rust-sweatshirt'].includes(outfitBase(clothes.top));
  const customBottom=clothes.bottom!=='shorts';
  const layers=[clothes.shoes&&!boots?clothes.shoes:undefined,clothes.bottom,closed?undefined:clothes.top,clothes.outer,boots?clothes.shoes:undefined].filter((item):item is OutfitItem=>!!item&&!!GARMENT_RIGS[item]);
  return <div className="outfit-figure" role="img" aria-label="고른 옷을 입은 아바타">
    <svg viewBox="0 0 1024 1536" className="outfit-rig" aria-hidden="true">
      <defs><mask id={`${id}-body`}><rect width="1024" height="1536" fill="white"/>
        {customTop&&<path fill="black" d="M295 690 L345 555 L440 520 L458 538 Q512 600 572 538 L584 520 L679 555 L729 690 L635 735 L660 910 L365 910 L389 735 Z"/>}
        {clothes.outer&&<path fill="black" d="M300 685 L370 570 L400 585 L400 735 Z M724 685 L654 570 L624 585 L624 735 Z"/>}
        {longSleeves&&<path fill="black" d="M325 690 L400 720 L350 825 L294 884 L244 859 Z M699 690 L624 720 L674 825 L730 884 L780 859 Z"/>}
        {customBottom&&<rect fill="black" x="338" y="885" width="354" height="185"/>}
        {clothes.shoes&&<rect x="280" y={boots?1280:1360} width="470" height="1536" fill="black"/>}
      </mask><clipPath id={`${id}-pants`}><rect width="1024" height={boots?1300:1536}/></clipPath><clipPath id={`${id}-under-outer`}><path d="M445 530 L579 530 L644 620 L644 910 L380 910 L380 620 Z"/></clipPath></defs>
      <image href={outfitAsset(avatar)} width="1024" height="1536" mask={`url(#${id}-body)`}/>
      {layers.map(item=><g key={item} clipPath={item===clothes.top&&clothes.outer?`url(#${id}-under-outer)`:['pants','chinos','cargo-pants'].includes(outfitBase(item))?`url(#${id}-pants)`:undefined}><Garment boots={boots} item={item} id={`${id}-${item}`}/></g>)}
      <FacePhoto photo={facePhoto} x={512} y={380} radius={157}/>
    </svg>
    {(['hat','neck','hand'] as const).map(slot=>clothes[slot]&&<img key={slot} className={`layer-${clothes[slot]}`} src={outfitAsset(clothes[slot]!)} style={outfitRegistration(clothes[slot]!)} alt="" draggable={false}/>)}
  </div>;
}
