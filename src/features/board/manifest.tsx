import { UtilityWindow, openUtilityWindow } from '@/core/ui/UtilityWindow';
import { useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact } from '@/core/ui/slot';
import { ensureAudio, playSound } from '@/core/sound';
import type { CardProps, FeatureManifest } from '../types';
import { BoardWindow } from './BoardWindow';

// 판서 카드: 누르면 칠판(전체 화면)이 열린다. 예전에는 수업 도구 카드 안의 단추였다.

const TITLE = { icon: 'ph-fill ph-pencil-line', tint: '#e0f2fe', color: '#0369a1' };

function BoardCard({ size }: CardProps) {
  const [open, setOpen] = useState(false);
  const [external,setExternal]=useState<Window|null>(null);
  return (
    <>
      <CardFrame id="board" label="판서 열기" state="plain" className="bdc" onOpen={() => { if(open){external?.focus();return;} ensureAudio(); playSound('select'); setExternal(openUtilityWindow('판서')); setOpen(true); }}>
        {isCompact(size) ? <CardCompact {...TITLE} title="판서">칠판 열기</CardCompact> : <>
          <CardTitle {...TITLE}>판서</CardTitle>
          <div className="bdc-face"><i className="ph-fill ph-chalkboard-teacher" /><span>터치해서 칠판에 써요 ✏️</span></div>
        </>}
      </CardFrame>
      {open && <UtilityWindow title="판서" external={external} onClose={()=>setOpen(false)}><BoardWindow embedded onClose={() => setOpen(false)} /></UtilityWindow>}
    </>
  );
}

const manifest: FeatureManifest = { id: 'board', cards: [{ id: 'board', title: '판서', ...TITLE, Component: BoardCard }] };
export default manifest;
