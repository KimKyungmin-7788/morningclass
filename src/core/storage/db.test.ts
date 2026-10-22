import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import * as db from './db';
import { emptyClass, emptyData, emptyRecord, type StudentNote } from '@/core/data/types';
import { buildBackup, parseBackup } from '@/core/data/backup';

const request = <T>(r: IDBRequest<T>) => new Promise<T>((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const transaction = (t: IDBTransaction) => new Promise<void>((resolve, reject) => { t.oncomplete = () => resolve(); t.onabort = () => reject(t.error); });
afterEach(() => db.destroy());
const note = (id: string, classId = 'c', studentId = 's'): StudentNote => ({ id, classId, studentId, text: '관찰', at: '2026-10-22T00:00:00Z', updatedAt: '2026-10-22T00:00:00Z' });

describe('학생 기록 저장소 v2', () => {
  it('v1 자료와 생활표현 설정을 보존하면서 두 store와 인덱스를 만든다', async () => {
    const req = indexedDB.open('morningclass', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('kv'); d.createObjectStore('classes', { keyPath: 'id' });
      d.createObjectStore('records', { keyPath: ['classId','date'] }); d.createObjectStore('timetables', { keyPath: ['classId','day'] }); d.createObjectStore('mealImages');
    };
    const old = await request(req);
    const t = old.transaction(['kv','classes','records'], 'readwrite');
    const finished = transaction(t);
    t.objectStore('kv').put(1, 'schemaVersion');
    const expr = { levels: { s: 'word' }, bag: { used: ['hello'], days: { '20261022': 'hello' } }, plan: {} };
    t.objectStore('kv').put(expr, 'expr:c'); t.objectStore('classes').put(emptyClass('c')); t.objectStore('records').put(emptyRecord('c','20261022'));
    await finished; old.close();
    const all = await db.readAll();
    expect(all.classes).toEqual([emptyClass('c')]); expect(all.records).toEqual([emptyRecord('c','20261022')]);
    expect(all.expr.c).toEqual(expr); expect(all.schemaVersion).toBe(2); expect(await db.kvGet('schemaVersion')).toBe(2);
    expect(all.studentNotes).toEqual([]); expect(all.ieps).toEqual([]);
    await db.putNotes([note('n')]); expect((await db.notesOf('c','s')).map((n) => n.id)).toEqual(['n']);
    const upgraded = await request(indexedDB.open('morningclass'));
    expect(upgraded.version).toBe(2);
    for (const name of ['notes','ieps']) expect(upgraded.transaction(name).objectStore(name).index('byStudent').keyPath).toEqual(['classId','studentId']);
    upgraded.close();
  });
  it('새 값과 생활표현이 전체 백업·복원 왕복 뒤에도 남고 같은 열쇠의 PIN을 유지한다', async () => {
    const data = emptyData(); data.classes = [emptyClass('c')]; data.currentClassId = 'c';
    data.studentNotes = [note('n')]; data.ieps = [{ id: 'i', classId: 'c', studentId: 's', semester: '2026-2', subjects: [] }];
    data.expr.c = { levels: { s: 'card' }, bag: { used: ['x'], days: { '20261022': 'x' } }, plan: { '20261023': 'y' } };
    data.notesConfig.quick = ['맞춤 문장']; data.recoveryKey = 'a'.repeat(64);
    await db.replaceAll(data); const pin = { salt: 'salt', hash: 'hash', iter: 100_000 }; await db.setPin(pin, data.recoveryKey);
    const text = buildBackup(await db.readAll()); expect(text).not.toContain('pinHash');
    await db.putNotes([note('extra')]); await db.replaceAll(parseBackup(text).data);
    expect(await db.readAll()).toEqual(data); expect(await db.kvGet('pinHash')).toEqual(pin);
    expect(await db.iepsOf('c','s')).toEqual(data.ieps);
  });
  it('다른 복구 열쇠 또는 예전 백업을 복원하면 이전 PIN을 없앤다', async () => {
    const data = emptyData(); data.recoveryKey = 'new'; await db.setPin({ hash: 'old' }, 'old');
    await db.replaceAll(data); expect(await db.kvGet('pinHash')).toBeUndefined(); expect(await db.kvGet('recoveryKey')).toBe('new');
    await db.setPin({ hash: 'old' }, 'new');
    const { studentNotes, ieps, notesConfig, expr, recoveryKey, ...v1 } = data;
    await db.replaceAll(parseBackup(JSON.stringify({ format: 'morningclass-backup', data: { ...v1, schemaVersion: 1 } })).data);
    expect(await db.kvGet('pinHash')).toBeUndefined(); expect((await db.readAll()).studentNotes).toEqual([]);
  });
  it('학급 삭제는 그 학급 기록·IEP·생활표현만 지운다', async () => {
    const data = emptyData(); data.classes = [emptyClass('c'), emptyClass('other')]; data.currentClassId = 'other';
    data.studentNotes = [note('n'), note('keep','other')]; data.ieps = ['c','other'].map((id) => ({ id, classId: id, studentId: 's', semester: '2026-2', subjects: [] }));
    data.expr = { c: { levels: {}, bag: { used: [], days: {} }, plan: {} }, other: { levels: {}, bag: { used: [], days: {} }, plan: {} } };
    await db.replaceAll(data); await db.deleteClassData('c'); const next = await db.readAll();
    expect(next.studentNotes.map((n) => n.id)).toEqual(['keep']); expect(next.ieps.map((i) => i.id)).toEqual(['other']); expect(Object.keys(next.expr)).toEqual(['other']);
  });
  it('여러 학생 기록 저장 중 실패하면 모두 그대로 남는다', async () => {
    await db.putNotes([note('before')]);
    const bad = { ...note('bad'), text: (() => {}) as unknown as string };
    await expect(db.putNotes([note('new'), bad])).rejects.toThrow();
    expect((await db.notesOf('c')).map((n) => n.id)).toEqual(['before']);
  });
  it('전체 복원이 실패해도 기존 자료와 PIN은 그대로 남는다', async () => {
    const data = emptyData(); await db.replaceAll(data); await db.setPin({ hash: 'keep' }, 'keep');
    const before = await db.readAll();
    await expect(db.replaceAll({ ...data, studentNotes: [{ ...note('bad'), id: undefined as unknown as string }] })).rejects.toThrow();
    expect(await db.readAll()).toEqual(before); expect(await db.kvGet('pinHash')).toEqual({ hash: 'keep' });
  });
});
