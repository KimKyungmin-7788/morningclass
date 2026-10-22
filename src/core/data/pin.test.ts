import { beforeEach, describe, expect, it, vi } from 'vitest';
const memory = vi.hoisted(() => new Map<string, unknown>());
vi.mock('@/core/storage/db', () => ({ kvGet: async (key: string) => memory.get(key), setPin: async (pin: unknown, recovery: string) => { memory.set('pinHash', pin); memory.set('recoveryKey', recovery); } }));
import { checkPin, hashPin, pinWait, recoveryMatches, savePin } from './pin';
import { emptyData } from './types';
import { buildBackup } from './backup';
beforeEach(async () => { vi.useRealTimers(); memory.clear(); await savePin('1234'); });
describe('학생 기록 PIN', () => {
  it('해시와 무작위 복구 열쇠를 저장하고 PIN 원문은 남기지 않는다', async () => {
    expect(memory.get('recoveryKey')).toMatch(/^[a-f0-9]{64}$/);
    expect(memory.get('pinHash')).toMatchObject({ iter: 100_000 });
    expect(await checkPin('1234')).toBe(true); expect(await checkPin('4321')).toBe(false);
    expect((await hashPin('1234')).hash).not.toEqual((await hashPin('1234')).hash);
    await expect(hashPin('123')).rejects.toThrow();
  });
  it('5번 틀리면 맞는 PIN도 1분 동안 막고 그 뒤 다시 받는다', async () => {
    vi.useFakeTimers();
    for (let i=0;i<5;i++) expect(await checkPin('0000')).toBe(false);
    expect(pinWait()).toBe(60); expect(await checkPin('1234')).toBe(false);
    vi.advanceTimersByTime(60_000); expect(await checkPin('1234')).toBe(true);
  });
  it('같은 복구 열쇠만 인정하며 파일의 다른 자료는 불러오지 않는다', async () => {
    const data = emptyData(); data.recoveryKey = memory.get('recoveryKey') as string;
    const before = [...memory]; expect(await recoveryMatches(buildBackup(data))).toBe(true); expect([...memory]).toEqual(before);
    data.recoveryKey = 'other'; expect(await recoveryMatches(buildBackup(data))).toBe(false);
    delete data.recoveryKey; expect(await recoveryMatches(buildBackup(data))).toBe(false);
  });
});
