export const MAX_CLOUD_BYTES = 10 * 1024 * 1024;
export function checkSnapshotSize(payload: string): void {
  if (new TextEncoder().encode(payload).length > MAX_CLOUD_BYTES) throw new Error('개인 서버 저장은 10MB까지 가능해요. 파일 백업을 이용해 주세요.');
}
export function cloudEnabled(env: { VITE_PERSONAL_CLOUD?: string; VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string }): boolean {
  return env.VITE_PERSONAL_CLOUD === 'true' && !!env.VITE_SUPABASE_URL?.startsWith('https://') && !!env.VITE_SUPABASE_PUBLISHABLE_KEY;
}
