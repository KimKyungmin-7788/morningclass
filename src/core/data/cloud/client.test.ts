import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ create:vi.fn(),readAll:vi.fn() }));
vi.mock('@supabase/supabase-js',()=>({createClient:mocks.create}));
vi.mock('@/core/storage/db',()=>({readAll:mocks.readAll}));
afterEach(()=>{vi.unstubAllEnvs();vi.resetModules();});
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('VITE_PERSONAL_CLOUD','true');vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY','public-test');});
function setup(allowed=true, saved=true) {
 const query={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),update:vi.fn().mockReturnThis(),insert:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:saved?{revision:3}:null,error:null}),single:vi.fn().mockResolvedValue({data:{revision:1},error:null})};
 const owner={select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),maybeSingle:vi.fn().mockResolvedValue({data:allowed?{user_id:'owner'}:null,error:null})};
 mocks.create.mockReturnValue({auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:'owner'}},error:null})},from:vi.fn((name:string)=>name==='mc_private_owners'?owner:query)});
 mocks.readAll.mockResolvedValue({schemaVersion:9,classes:[],records:[],pinHash:'never-upload'});
 return query;
}
describe('개인 서버 저장',()=>{
 it('공개 빌드에서는 인증 클라이언트 생성도 하지 않는다',async()=>{vi.stubEnv('VITE_PERSONAL_CLOUD','false');const {cloud}=await import('./client');expect(cloud).toBeNull();expect(mocks.create).not.toHaveBeenCalled();});
 it('허용되지 않은 계정은 로컬 자료를 읽지 않는다',async()=>{setup(false);const {saveCloudSnapshot}=await import('./client');await expect(saveCloudSnapshot(null)).rejects.toThrow('사용할 수 없는');expect(mocks.readAll).not.toHaveBeenCalled();});
 it('확인한 서버 버전을 조건으로 저장하고 PIN은 제외한다',async()=>{const q=setup();const {saveCloudSnapshot}=await import('./client');await saveCloudSnapshot(2);expect(q.eq).toHaveBeenCalledWith('revision',2);expect(q.update.mock.calls[0][0].payload).not.toContain('never-upload');expect(q.update.mock.calls[0][0].revision).toBe(3);});
 it('다른 기기가 먼저 저장했다면 성공으로 표시하지 않는다',async()=>{setup(true,false);const {saveCloudSnapshot}=await import('./client');await expect(saveCloudSnapshot(2)).rejects.toThrow('다른 기기');});
 it('첫 저장은 upsert 대신 insert로 중복 생성을 막는다',async()=>{const q=setup();const {saveCloudSnapshot}=await import('./client');await saveCloudSnapshot(null);expect(q.insert).toHaveBeenCalledOnce();expect(q.update).not.toHaveBeenCalled();});
});
