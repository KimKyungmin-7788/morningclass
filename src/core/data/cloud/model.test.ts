import { describe, it, expect } from 'vitest';
import { checkSnapshotSize, cloudEnabled, MAX_CLOUD_BYTES } from './model';
describe('개인 클라우드 경계', () => {
 it('공개 빌드는 기본 비활성', () => { expect(cloudEnabled({})).toBe(false); expect(cloudEnabled({VITE_PERSONAL_CLOUD:'true'})).toBe(false); });
 it('명시적인 설정이 모두 있어야 활성', () => { expect(cloudEnabled({VITE_PERSONAL_CLOUD:'true',VITE_SUPABASE_URL:'https://example.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'public'})).toBe(true); });
 it('문자 수가 아닌 실제 전송 바이트를 제한', () => { expect(() => checkSnapshotSize('a'.repeat(MAX_CLOUD_BYTES))).not.toThrow(); expect(() => checkSnapshotSize('가'.repeat(Math.ceil(MAX_CLOUD_BYTES/3)))).toThrow(); });
});
