export const MAX_CLOUD_BYTES = 10 * 1024 * 1024;
export function checkSnapshotSize(payload: string): void {
  if (new TextEncoder().encode(payload).length > MAX_CLOUD_BYTES) throw new Error('개인 서버 저장은 10MB까지 가능해요. 파일 백업을 이용해 주세요.');
}
export function cloudEnabled(env: { VITE_PERSONAL_CLOUD?: string; VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string }): boolean {
  return env.VITE_PERSONAL_CLOUD === 'true' && !!env.VITE_SUPABASE_URL?.startsWith('https://') && !!env.VITE_SUPABASE_PUBLISHABLE_KEY;
}

export interface SyncBaseline { revision: number; fingerprint: string }
export function syncDecision(local: string, remote: string | null, revision: number | null, base?: SyncBaseline): 'push' | 'pull' | 'same' | 'conflict' {
  if (remote === local) return 'same';
  if (!base) return remote === null ? 'push' : 'conflict';
  if (revision === base.revision) return 'push';
  if (local === base.fingerprint && remote !== null) return 'pull';
  return 'conflict';
}
/** 내보낸 시간·객체 키 순서는 변경으로 세지 않는다. */
export async function fingerprint(data: unknown): Promise<string> {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : value;
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(canonical(data))));
  return Array.from(new Uint8Array(bytes), v => v.toString(16).padStart(2, '0')).join('');
}
