import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as db from '@/core/storage/db';
import { emptyData } from '../types';
import { buildBackup } from '../backup';
import { fingerprint } from './model';
const api = vi.hoisted(() => ({ session: vi.fn(), owner: vi.fn(), revision: vi.fn(), snapshot: vi.fn(), save: vi.fn() }));
vi.mock('./client', () => ({ cloud: { auth: { getSession: api.session } }, personalCloudEnabled: true, requireOwner: api.owner, getCloudRevision: api.revision, getCloudSnapshot: api.snapshot, saveCloudSnapshot: api.save }));
vi.mock('../store', () => ({ useData: { getState: () => ({ replaceAll: db.replaceAll }) } }));
import { syncNow, useCloudSync, setAutoSync } from './sync';
const key = '_cloud:baseline:owner';
beforeEach(async () => {
 vi.clearAllMocks();
 vi.stubGlobal('navigator', { locks: { request: async (_name: string, run: () => Promise<void>) => run() } });
 vi.stubGlobal('document', { querySelector: () => null, activeElement: null });
 api.session.mockResolvedValue({data:{session:{}}}); api.owner.mockResolvedValue({id:'owner',email:'owner@example.com'});
 api.revision.mockResolvedValue(null); api.snapshot.mockResolvedValue(null); api.save.mockResolvedValue(undefined);
 const data = emptyData(); data.classes[0].schoolName = '기존 학급'; await db.replaceAll(data); await db.cloudMetaSet('_cloud:autoSyncOptIn', true);
 useCloudSync.setState({enabled:true,conflict:false,busy:false,message:''});
});
afterEach(async () => { await db.destroy(); vi.unstubAllGlobals(); });
async function remoteChange() {
 const data = await db.readAll();
 await db.cloudMetaSet(key, {revision:1,fingerprint:await fingerprint(data)});
 const remote = structuredClone(data); remote.classes[0].schoolName = '서버 학급';
 api.revision.mockResolvedValue(2); api.snapshot.mockResolvedValue({revision:2,payload:buildBackup(remote),saved_at:'2026-10-24T00:00:00Z'});
 return {data,remote};
}
describe('자동 저장/불러오기 통합', () => {
 it('기존 자료를 전송하고 재확인 시 중복 전송하지 않는다', async () => {
  const data = await db.readAll(); await syncNow();
  expect(api.save).toHaveBeenCalledWith(null, data);
  api.revision.mockResolvedValue(1); await syncNow(); expect(api.save).toHaveBeenCalledTimes(1);
  expect(await db.readAll()).toEqual(data);
 });
 it('서버만 바뀌면 이전 자료를 보관하고 최신 자료와 기준을 함께 저장한다', async () => {
  const {data,remote} = await remoteChange(); await syncNow();
  expect(await db.readAll()).toEqual(remote); expect(await db.kvGet('_cloud:recovery')).toEqual(data);
  expect(await db.kvGet(key)).toEqual({revision:2,fingerprint:await fingerprint(remote)});
  expect(buildBackup(await db.readAll())).not.toContain('_cloud:');
 });
 it('처음 연결한 서로 다른 자료는 자동으로 덮어쓰지 않는다', async () => {
  const {data} = await remoteChange(); await db.cloudMetaSet(key, undefined); await syncNow();
  expect(await db.readAll()).toEqual(data); expect(api.save).not.toHaveBeenCalled(); expect(useCloudSync.getState().conflict).toBe(true);
 });
 it('양쪽 수정은 충돌이며 명시적 로컬 선택만 서버를 바꾼다', async () => {
  await remoteChange(); await db.kvSet('videos', [{id:'new'}]); await syncNow();
  expect(useCloudSync.getState().conflict).toBe(true); expect(api.save).not.toHaveBeenCalled();
  await syncNow('local'); expect(api.save).toHaveBeenCalledWith(2, await db.readAll());
  expect(await db.kvGet('_cloud:serverRecovery')).toBeTruthy();
 });
 it('네트워크 실패 후 로컬을 유지하고 재시도한다', async () => {
  const data = await db.readAll(); api.save.mockRejectedValueOnce(new Error('offline')); await syncNow();
  expect(await db.readAll()).toEqual(data); expect(await db.kvGet(key)).toBeUndefined();
  await syncNow(); expect(api.save).toHaveBeenCalledTimes(2); expect(await db.kvGet(key)).toBeTruthy();
 });
 it('서버 조회 중 생긴 로컬 입력은 불러오기로 지워지지 않는다', async () => {
  const {remote} = await remoteChange();
  api.snapshot.mockImplementationOnce(async () => {
   await db.kvSet('videos', [{id:'during-request'}]);
   return {revision:2,payload:buildBackup(remote),saved_at:'2026-10-24T00:00:00Z'};
  });
  await syncNow(); expect((await db.readAll()).videos).toEqual([{id:'during-request'}]);
  expect((await db.readAll()).classes[0].schoolName).toBe('기존 학급');
 });
 it('미완료 입력창에서는 자동 불러오기를 미룬다', async () => {
  const {data} = await remoteChange(); vi.stubGlobal('document', {querySelector:()=>({}),activeElement:null}); await syncNow();
  expect(await db.readAll()).toEqual(data); expect(useCloudSync.getState().message).toContain('입력 창');
 });
 it('자동 저장 끄기와 로그아웃은 서버를 읽거나 쓰지 않는다', async () => {
  await setAutoSync(false); await syncNow(); expect(api.owner).not.toHaveBeenCalled();
  api.session.mockResolvedValue({data:{session:null}}); await setAutoSync(true); expect(api.owner).not.toHaveBeenCalled();
 });
 it('새 기기의 완전히 빈 기본 학급은 서버 자료를 자동으로 불러온다', async () => {
  const {remote} = await remoteChange(); await db.cloudMetaSet(key, undefined); await db.replaceAll(emptyData());
  await syncNow(); expect(await db.readAll()).toEqual(remote);
 });
 it('새 기기와 기존 자동 설정은 명시적 동의 없이는 전송하지 않는다', async () => {
  await db.cloudMetaSet('_cloud:autoSyncOptIn', undefined); await db.cloudMetaSet('_cloud:enabled', true);
  await syncNow(); expect(api.save).not.toHaveBeenCalled(); expect(api.revision).not.toHaveBeenCalled();
 });
 it('자동 저장이 꺼져 있어도 직접 저장은 한 번만 수행한다', async () => {
  await setAutoSync(false); await syncNow('local'); expect(api.save).toHaveBeenCalledTimes(1);
  await syncNow(); expect(api.save).toHaveBeenCalledTimes(1); expect(useCloudSync.getState().enabled).toBe(false);
 });
 it('상태 확인은 자료를 올리거나 덮어쓰지 않는다', async () => {
  const data = await db.readAll(); await setAutoSync(false); await syncNow('check');
  expect(api.save).not.toHaveBeenCalled(); expect(await db.readAll()).toEqual(data);
 });
 it('업로드 중 새 입력은 다음 전송에 남는다', async () => {
  api.save.mockImplementationOnce(async () => { await db.kvSet('videos', [{id:'later'}]); }); await syncNow();
  api.revision.mockResolvedValue(1); await syncNow();
  expect(api.save).toHaveBeenCalledTimes(2); expect(api.save.mock.calls[1][1].videos).toEqual([{id:'later'}]);
 });
});
