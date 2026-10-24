import { describe, it, expect } from 'vitest';
import { checkSnapshotSize, cloudEnabled, MAX_CLOUD_BYTES } from './model';
describe('개인 클라우드 경계', () => {
 it('공개 빌드는 기본 비활성', () => { expect(cloudEnabled({})).toBe(false); expect(cloudEnabled({VITE_PERSONAL_CLOUD:'true'})).toBe(false); });
 it('명시적인 설정이 모두 있어야 활성', () => { expect(cloudEnabled({VITE_PERSONAL_CLOUD:'true',VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'public'})).toBe(true); });
 it('문자 수가 아닌 실제 전송 바이트를 제한', () => { expect(() => checkSnapshotSize('a'.repeat(MAX_CLOUD_BYTES))).not.toThrow(); expect(() => checkSnapshotSize('가'.repeat(Math.ceil(MAX_CLOUD_BYTES/3)))).toThrow(); });
});

import { fingerprint, syncDecision } from './model';
describe('자동 동기화 판단', () => {
 const base = { revision: 1, fingerprint: 'old' };
 it('첫 서버가 비어 있으면 업로드하고 첫 연결 자료가 다르면 멈춘다', () => {
  expect(syncDecision('local', null, null)).toBe('push');
  expect(syncDecision('local', 'remote', 1)).toBe('conflict');
 });
 it('로컬만 바뀌면 업로드, 서버만 바뀌면 다운로드한다', () => {
  expect(syncDecision('new', 'old', 1, base)).toBe('push');
  expect(syncDecision('old', 'new', 2, base)).toBe('pull');
 });
 it('동시 수정과 서버 삭제는 임의로 덮어쓰지 않는다', () => {
  expect(syncDecision('local', 'remote', 2, base)).toBe('conflict');
  expect(syncDecision('old', null, null, base)).toBe('conflict');
 });
 it('이미 같은 결과면 재전송하지 않는다', () => { expect(syncDecision('same', 'same', 2, base)).toBe('same'); });
 it('키 순서에는 영향받지 않고 실제 내용·목록 순서를 구분한다', async () => {
  expect(await fingerprint({a:1,b:2})).toBe(await fingerprint({b:2,a:1}));
  expect(await fingerprint([1,2])).not.toBe(await fingerprint([2,1]));
 });
});
