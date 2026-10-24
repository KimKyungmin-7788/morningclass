import { create } from 'zustand';
import * as db from '@/core/storage/db';
import { useData } from '../store';
import { buildBackup, parseBackup } from '../backup';
import { cloud, personalCloudEnabled, requireOwner, getCloudSnapshot, getCloudRevision, saveCloudSnapshot } from './client';
import { emptyData } from '../types';
import { checkSnapshotSize, fingerprint, syncDecision, type SyncBaseline } from './model';

export const useCloudSync = create<{ message: string; enabled: boolean; conflict: boolean; busy: boolean; email: string; savedAt: string }>(() => ({
 message: '이 기기는 자동 저장이 꺼져 있어요.', enabled: false, conflict: false, busy: false, email: '', savedAt: '',
}));
let running = false;
let lastGeneration = -1;
let lastCheck = 0;
let authEpoch = 0;
const state = useCloudSync.setState;

export async function setAutoSync(enabled: boolean) {
 await db.cloudMetaSet('_cloud:autoSyncOptIn', enabled);
 state({ enabled, message: enabled ? '최신 자료를 확인해요…' : '기기에만 저장 중이에요.' });
 if (enabled) await syncNow();
}

/** 같은 브라우저의 탭은 잠금으로, 다른 기기는 서버 revision 조건으로 보호한다. */
export async function syncNow(choice?: 'local' | 'server' | 'check') {
 if (!cloud || running) return;
 running = true;
 state({ busy: true });
 try {
  await navigator.locks.request('morningclass-cloud-sync', async () => {
   const enabled = (await db.kvGet<boolean>('_cloud:autoSyncOptIn')) === true;
   state({ enabled });
   const { data: session } = await cloud!.auth.getSession();
   state({ email: session.session?.user?.email ?? '' });
   if (!enabled && !choice) { state({ message: '이 기기는 자동 저장이 꺼져 있어요. 직접 지정할 때만 서버와 주고받아요.' }); return; }
   if (!session.session) { state({ email: '', message: 'Google 로그인 후 사용할 수 있어요.', conflict: false }); return; }
   const epoch = authEpoch;
   const user = await requireOwner();
   state({ email: user.email ?? '', busy: true });
   const key = `_cloud:baseline:${user.id}`;
   const local = await db.readVersioned();
   lastGeneration = local.generation;
   const base = await db.kvGet<SyncBaseline>(key);
   const localHash = await fingerprint(local.data);
   const revision = await getCloudRevision();
   if (epoch !== authEpoch) return;
   const snapshot = revision !== null && (revision !== base?.revision || choice) ? await getCloudSnapshot() : null;
   if (snapshot) checkSnapshotSize(snapshot.payload);
   const remoteData = snapshot ? parseBackup(snapshot.payload).data : null;
   const remoteHash = remoteData ? await fingerprint(remoteData) : revision === base?.revision ? base.fingerprint : null;
   const actualRevision = snapshot?.revision ?? revision;
   let action = syncDecision(localHash, remoteHash, actualRevision, base);
   if (!base && remoteData) {
    const blank = emptyData();
    if (local.data.classes.length === 1) {
     blank.classes[0].id = local.data.classes[0].id;
     blank.currentClassId = local.data.currentClassId;
     if (localHash === await fingerprint(blank)) action = 'pull';
    }
   }
   if (choice === 'local') action = 'push';
   if (choice === 'server') {
    if (!remoteData) throw new Error('서버에 불러올 자료가 없어요.');
    action = 'pull';
   }
   if (epoch !== authEpoch) return;
   if (choice === 'check') { state({ conflict: action === 'conflict', message: action === 'same' ? '서버와 기기 자료가 같아요.' : '서버 상태를 확인했어요. 저장하거나 불러올 자료를 직접 선택해 주세요.' }); return; }
   if (action === 'conflict') {
    state({ conflict: true, message: '기기와 서버의 자료가 달라요. 관리 → 개인 서버에서 선택해 주세요.' });
    return;
   }
   if (action === 'push') {
    state({ message: '서버에 저장 중…' });
    // 전송 중 추가 입력은 다음 주기에 저장한다. 전송한 사본만 기준으로 기록한다.
    if (choice && remoteData) await db.cloudMetaSet('_cloud:serverRecovery', remoteData);
    await saveCloudSnapshot(actualRevision, local.data);
    await db.cloudMetaSet(key, { revision: (actualRevision ?? 0) + 1, fingerprint: localHash });
    state({ savedAt: new Date().toISOString() });
   } else if (action === 'pull' && remoteData && snapshot) {
    // 입력/다른 창이 열려 있을 때는 닫은 뒤 적용해 미완료 입력을 보호한다.
    if (!choice && (document.querySelector('[role="dialog"], .modal-overlay, .popup-overlay') || document.activeElement?.matches('input, textarea, [contenteditable="true"]'))) {
     state({ message: '새 서버 자료가 있어요. 입력 창을 닫으면 불러와요.' }); return;
    }
    state({ message: '최신 자료를 불러오는 중…' });
    await useData.getState().replaceAll(remoteData, { generation: local.generation, recovery: local.data, key, baseline: { revision: snapshot.revision, fingerprint: remoteHash! } });
    state({ savedAt: snapshot.saved_at });
   } else if (actualRevision !== null) {
    await db.cloudMetaSet(key, { revision: actualRevision, fingerprint: localHash });
   }
   lastGeneration = local.generation;
   state({ conflict: false, message: '서버 저장 완료' });
  });
 } catch (error) {
  state({ message: error instanceof Error ? error.message : '연결을 확인해 주세요. 기기 자료는 유지돼요.' });
 } finally { running = false; lastCheck = Date.now(); state({ busy: false }); }
}

export function startCloudSync() {
 if (!personalCloudEnabled || !cloud) return () => {};
 let stopped = false;
 const check = async () => {
  if (stopped || document.visibilityState === 'hidden' || running) return;
  const generation = (await db.kvGet<number>('_cloud:generation')) ?? 0;
  if (generation !== lastGeneration || Date.now() - lastCheck > 30_000) await syncNow();
 };
 const wake = () => { lastCheck = 0; void check().catch(() => state({ message: '기기 저장소를 확인하지 못했어요.' })); };
 const timer = setInterval(() => { void check().catch(() => state({ message: '기기 저장소를 확인하지 못했어요.' })); }, 2000);
 const { data } = cloud.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') state({ email: '', conflict: false, savedAt: '', message: '로그아웃했어요. 기기에만 저장해요.' });
  authEpoch++;
  // 인증 콜백 안에서 다시 인증 API를 기다리지 않는다.
  setTimeout(() => { if (!stopped) wake(); }, 0);
 });
 window.addEventListener('online', wake);
 window.addEventListener('focus', wake);
 document.addEventListener('visibilitychange', wake);
 void syncNow();
 return () => { stopped = true; clearInterval(timer); data.subscription.unsubscribe(); window.removeEventListener('online', wake); window.removeEventListener('focus', wake); document.removeEventListener('visibilitychange', wake); };
}

export async function downloadSyncRecovery(server = false) {
 const data = await db.kvGet<unknown>(server ? '_cloud:serverRecovery' : '_cloud:recovery');
 if (!data) throw new Error('아직 자동 불러오기 전 복구 사본이 없어요.');
 const parsed = parseBackup(JSON.stringify({ format: 'morningclass-backup', data }));
 const url = URL.createObjectURL(new Blob([buildBackup(parsed.data)], { type: 'application/json' }));
 const a = document.createElement('a'); a.href = url; a.download = server ? '아침교실_덮어쓰기전_서버복구.json' : '아침교실_자동불러오기전_복구.json'; a.click();
 setTimeout(() => URL.revokeObjectURL(url), 1000);
}
