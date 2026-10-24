import { useState } from 'react';
import './personalCloud.css';
import { cloud, loginCloud } from '@/core/data/cloud/client';
import { downloadBackup } from '@/core/data/backupActions';
import { downloadSyncRecovery, setAutoSync, syncNow, useCloudSync } from '@/core/data/cloud/sync';

export function PersonalCloud({ onRestored }: { onRestored: () => void }) {
 const { email, enabled, busy, message, conflict, savedAt } = useCloudSync();
 const [error, setError] = useState('');
 const [backedUp, setBackedUp] = useState(false);
 async function run(action: () => Promise<unknown>) {
  setError('');
  try { await action(); } catch (e) { setError(e instanceof Error ? e.message : '연결을 확인해 주세요.'); }
 }
 return <section className="personal-cloud">
  <h3>개인 서버 · 자동 저장</h3>
  <p>{email || '본인 Google 계정으로 로그인해 주세요.'}</p>
  <div className="personal-cloud-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
   {!email && <button className="btn-save" onClick={() => void run(loginCloud)}>Google 로그인</button>}
   {email && <button className="btn-test" disabled={busy} onClick={() => void run(async () => {
    const result = await cloud!.auth.signOut({ scope: 'local' }); if (result.error) throw result.error;
   })}>로그아웃</button>}
   <button className="btn-test" disabled={busy} onClick={() => void syncNow('check')}>서버 상태 확인</button>
  </div>
  <label style={{ display: 'flex', gap: 12, margin: '20px 0' }}>
   <input type="checkbox" checked={enabled} disabled={busy} onChange={e => void run(() => setAutoSync(e.target.checked))} />
   이 기기에서 자동 저장 · 최신 자료 불러오기
  </label>
  <p className="hint">기기에는 바로 저장해요. 자동 저장을 켜거나 아래 단추를 누를 때만 서버와 주고받아요.</p>
  <p className="personal-cloud-status" role="status" aria-live="polite">{error || message}</p>
  {savedAt && <p className="hint">마지막 저장 · {new Date(savedAt).toLocaleString('ko-KR')}</p>}
  {(conflict || !enabled) && <div className="field" style={{ padding: 16, background: 'var(--soft)', borderRadius: 16 }}>
   <h4>{conflict ? '어느 자료로 이어갈까요?' : '필요할 때 직접 저장·불러오기'}</h4>
   <p>먼저 현재 자료를 백업한 뒤 사용할 단추를 눌러 주세요. 자동 저장은 켜지지 않아요.</p>
   <button className="btn-test" disabled={busy} onClick={() => void run(async () => { setBackedUp(await downloadBackup()); })}>현재 자료 백업</button>
   <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
    <button className="btn-save" disabled={busy || !backedUp} onClick={() => void syncNow('local')}>지금 서버에 저장</button>
    <button className="btn-test" disabled={busy || !backedUp} onClick={() => void run(async () => { await syncNow('server'); if (useCloudSync.getState().message === '서버 저장 완료') onRestored(); })}>서버 자료 불러오기</button>
   </div>
  </div>}
  <p className="hint">자동 저장을 켠 기기만: 약 2초 간격 저장 · 다시 열면 최신 자료 확인</p>
  <details>
   <summary>저장 안내 · 복구 사본</summary>
   <p>사용 중에는 30초마다 최신 자료를 확인해요. 연결이 끊기면 기기에 보관하고 다시 연결될 때 재시도해요. 앱을 닫기 전 ‘저장됨’을 확인해 주세요.</p>
   <div className="personal-cloud-actions">
    <button className="btn-test" onClick={() => void run(() => downloadSyncRecovery())}>불러오기 전 기기 자료</button>
    <button className="btn-test" onClick={() => void run(() => downloadSyncRecovery(true))}>덮어쓰기 전 서버 자료</button>
   </div>
   <p>최근 복구 사본을 이 기기에 각각 하나씩 보관해요. 내려받은 파일은 관리 → 백업에서 복원할 수 있어요.</p>
   <p>이름·얼굴 사진·활동·누가기록을 포함해요. 최대 10MB · PIN은 기기마다 설정해요. 공개 버전은 기기에만 저장해요.</p>
  </details>
 </section>;
}
