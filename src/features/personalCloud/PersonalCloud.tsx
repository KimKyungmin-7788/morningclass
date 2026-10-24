import { useEffect, useState } from 'react';
import { cloud, getCloudSnapshot, loginCloud, readCloudBackup, requireOwner, saveCloudSnapshot } from '@/core/data/cloud/client';
import { toast } from '@/core/ui/toast';
import { applyBackup, downloadBackup } from '@/core/data/backupActions';

export function PersonalCloud({onRestored}:{onRestored:()=>void}) {
 const [identity,setIdentity] = useState('');
 const [revision,setRevision] = useState<number|null>(null);
 const [savedAt,setSavedAt] = useState('');
 const [ready,setReady] = useState(false);
 const [busy,setBusy] = useState(false);
 const [message,setMessage] = useState('');
 const [consent,setConsent] = useState(false);
 const [restore,setRestore] = useState<Awaited<ReturnType<typeof readCloudBackup>>|null>(null);
 const [backupConfirmed,setBackupConfirmed] = useState(false);
 async function refresh() {
  setReady(false); setIdentity('');
  const user = await requireOwner();
  setIdentity(user.email ?? '개인 계정');
  const snapshot = await getCloudSnapshot();
  setRevision(snapshot?.revision ?? null); setSavedAt(snapshot?.saved_at ?? ''); setReady(true);
 }
 async function run(action:()=>Promise<void>) {
  setBusy(true);setMessage('');
  try{await action();}catch(error){setMessage(error instanceof Error?error.message:'연결을 확인해 주세요.');}finally{setBusy(false);}
 }
 useEffect(()=>{void run(refresh);},[]);
 return <section>
  <h3>개인 서버 저장</h3>
  <p className="hint">본인 전용 연결이에요. 로그인만으로 학생 자료가 전송되지는 않아요.</p>
  <p>{identity || '로그인이 필요해요.'}</p>
  <div className="field" style={{display:'flex',gap:12,flexWrap:'wrap'}}>
   <button className="btn-test" disabled={busy} onClick={()=>void run(loginCloud)}>Google 로그인</button>
   <button className="btn-test" disabled={busy} onClick={()=>void run(refresh)}>서버 상태 확인</button>
   {identity && <button className="btn-test" disabled={busy} onClick={()=>void run(async()=>{const result=await cloud!.auth.signOut({scope:'local'});if(result.error)throw result.error;setIdentity('');setReady(false);setConsent(false);setMessage('이 기기에서 로그아웃했어요.');})}>로그아웃</button>}
  </div>
  {ready && <>
   <p>마지막 서버 저장: {savedAt ? new Date(savedAt).toLocaleString('ko-KR') : '아직 없음'}</p>
   <label style={{display:'flex',gap:12,margin:'20px 0'}}><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} disabled={busy}/>학생 이름·얼굴 사진·누가기록을 포함한 이 기기의 전체 학급 자료를 개인 서버에 저장해요.</label>
   <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
    <button className="btn-save" disabled={busy||!consent} onClick={()=>void run(async()=>{await saveCloudSnapshot(revision);await refresh();setMessage('서버에 저장했어요.');})}>서버에 저장</button>
    <button className="btn-test" disabled={busy||revision===null} onClick={()=>void run(async()=>{
      setRestore(await readCloudBackup()); setBackupConfirmed(false);
    })}>서버 자료 불러오기</button>
   </div>
   {restore && <div className="field" role="region" aria-label="서버 자료 불러오기 확인" style={{padding:16,background:'var(--soft)',borderRadius:16,marginTop:16}}>
    <h4>서버 자료로 바꾸기 전에</h4>
    <p>{new Date(restore.snapshot.saved_at).toLocaleString('ko-KR')}에 저장한 {restore.parsed.data.classes.length}개 학급을 불러와요. 이 기기의 전체 학급 자료가 바뀌어요.</p>
    <button className="btn-test" disabled={busy} onClick={()=>void run(async()=>{await downloadBackup();})}>현재 자료 백업 다운로드</button>
    <label style={{display:'flex',gap:12,margin:'16px 0'}}><input type="checkbox" checked={backupConfirmed} disabled={busy} onChange={e=>setBackupConfirmed(e.target.checked)}/>현재 자료의 백업 파일을 안전하게 보관했어요.</label>
    <button className="btn-cancel" disabled={busy} onClick={()=>setRestore(null)}>취소</button>
    <button className="btn-save" disabled={busy||!backupConfirmed} onClick={()=>void run(async()=>{await requireOwner();await applyBackup(restore.parsed);toast('서버 자료를 불러왔어요.', 'success');onRestored();})}>백업 확인 · 불러오기</button>
   </div>}
   <p className="hint">자동 동기화는 하지 않아요. 기기를 바꿀 때는 서버 자료를 먼저 불러와 주세요. 최대 10MB · PIN은 기기마다 설정해요.</p>
  </>}
  <p role="status" aria-live="polite">{busy?'처리 중이에요…':message}</p>
 </section>;
}
