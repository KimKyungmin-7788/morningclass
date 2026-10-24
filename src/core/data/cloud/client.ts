import { createClient } from '@supabase/supabase-js';
import * as db from '@/core/storage/db';
import { buildBackup, parseBackup } from '../backup';
import { checkSnapshotSize, cloudEnabled } from './model';

export const personalCloudEnabled = cloudEnabled(import.meta.env);
// 공개 빌드에서는 클라이언트를 만들지도, 로그인 세션을 읽지도 않는다.
export const cloud = personalCloudEnabled ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { flowType: 'pkce', storageKey: 'morningclass-private-auth', detectSessionInUrl: true },
}) : null;
export interface CloudSnapshot { payload: string; revision: number; saved_at: string }
export async function requireOwner() {
  if (!cloud) throw new Error('개인용 연결이 설정되지 않았어요.');
  const { data, error } = await cloud.auth.getUser();
  if (error || !data.user) throw new Error('Google 계정으로 로그인해 주세요.');
  const allowed = await cloud.from('mc_private_owners').select('user_id').eq('user_id', data.user.id).maybeSingle();
  if (allowed.error || !allowed.data) throw new Error('이 개인 서버를 사용할 수 없는 계정이에요.');
  return data.user;
}
export async function getCloudSnapshot(): Promise<CloudSnapshot | null> {
  const user = await requireOwner();
  const {data,error} = await cloud!.from('mc_private_snapshots').select('payload,revision,saved_at').eq('user_id',user.id).maybeSingle();
  if(error) throw new Error('서버 기록을 확인하지 못했어요. 다시 시도해 주세요.');
  return data;
}
/** 읽어 본 버전과 일치할 때만 저장해 다른 기기의 새 기록을 덮어쓰지 않는다. */
export async function saveCloudSnapshot(expectedRevision: number | null): Promise<void> {
  const user = await requireOwner();
  const payload = buildBackup(await db.readAll());
  checkSnapshotSize(payload);
  const next = { user_id: user.id, payload, revision: (expectedRevision ?? 0)+1, saved_at: new Date().toISOString() };
  const result = expectedRevision === null
    ? await cloud!.from('mc_private_snapshots').insert(next).select('revision').single()
    : await cloud!.from('mc_private_snapshots').update(next).eq('user_id',user.id).eq('revision',expectedRevision).select('revision').maybeSingle();
  if(result.error || !result.data) throw new Error('저장하지 못했어요. 다른 기기의 변경이 있는지 서버 상태를 다시 확인해 주세요.');
}
export async function readCloudBackup() {
  const snapshot = await getCloudSnapshot();
  if(!snapshot) throw new Error('서버에 저장된 자료가 없어요.');
  checkSnapshotSize(snapshot.payload);
  return { snapshot, parsed: parseBackup(snapshot.payload) };
}
export async function loginCloud() {
  if(!cloud) return;
  const {error} = await cloud.auth.signInWithOAuth({provider:'google',options:{redirectTo: `${location.origin}/app.html?nocount`,queryParams:{prompt:'select_account'}}});
  if(error) throw new Error('Google 로그인을 시작하지 못했어요.');
}
