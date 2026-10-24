import { BoardWindow } from '@/features/board/BoardWindow';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ToolWindow, TOOLS } from '@/features/tools/manifest';
import { openUtilityWindow, UtilityWindow } from './UtilityWindow';
import '@/styles/legacy.css';
import '@/styles/v2.css';
function Preview(){
 const [board,setBoard]=useState(false);
 const [open,setOpen]=useState(false),[external,setExternal]=useState<Window|null>(null),[demo,setDemo]=useState(false);
 return <div style={{padding:32}}><h1>도구 창 미리보기</h1><p>학생 자료를 변경하지 않아요.</p><button onClick={()=>{setExternal(openUtilityWindow('수업 도구'));setOpen(true);}}>수업 도구 새 창</button><button onClick={()=>{setExternal(openUtilityWindow('판서'));setBoard(true);}}>판서 새 창</button><button onClick={()=>setDemo(true)}>화면 안에서 이동</button>{board&&<UtilityWindow title="판서" external={external} onClose={()=>setBoard(false)}><BoardWindow embedded onClose={()=>setBoard(false)}/></UtilityWindow>}{open&&<ToolWindow list={TOOLS} start="clock" external={external} onClose={()=>setOpen(false)}/>} {demo&&<UtilityWindow title="이동 가능한 작은 창" onClose={()=>setDemo(false)}><p style={{padding:24}}>제목 줄을 잡아 옮기거나 오른쪽 아래를 끌어 크기를 바꿔요.</p></UtilityWindow>}</div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Preview/></StrictMode>);
