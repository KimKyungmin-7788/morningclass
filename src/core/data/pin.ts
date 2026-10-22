import * as db from '@/core/storage/db';
import { parseBackup } from './backup';

interface PinHash { salt: string; hash: string; iter: number }
const hex = (bytes: Uint8Array) => [...bytes].map((x) => x.toString(16).padStart(2, '0')).join('');
const randomKey = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export async function hashPin(pin: string, salt = randomKey(), iter = 100_000): Promise<PinHash> {
  if (!/^\d{4}$/.test(pin)) throw new Error('숫자 네 자리를 입력해 주세요');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: iter, hash: 'SHA-256' }, key, 256);
  return { salt, hash: hex(new Uint8Array(bits)), iter };
}
export const hasPin = async () => !!(await db.kvGet<PinHash>('pinHash'));
let failures = 0;
let blockedUntil = 0;
export const pinWait = () => Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
export async function checkPin(pin: string): Promise<boolean> {
  if (pinWait()) return false;
  const stored = await db.kvGet<PinHash>('pinHash');
  if (!stored) return false;
  const ok = (await hashPin(pin, stored.salt, stored.iter)).hash === stored.hash;
  if (ok) failures = 0;
  else if (++failures >= 5) { failures = 0; blockedUntil = Date.now() + 60_000; }
  return ok;
}
export async function savePin(pin: string) {
  const recoveryKey = (await db.kvGet<string>('recoveryKey')) ?? randomKey();
  await db.setPin(await hashPin(pin), recoveryKey);
  failures = 0; blockedUntil = 0;
}
/** 복구 파일은 열쇠만 비교하며 현재 자료를 불러오거나 바꾸지 않는다. */
export async function recoveryMatches(text: string) {
  const key = await db.kvGet<string>('recoveryKey');
  return !!key && parseBackup(text).data.recoveryKey === key;
}
