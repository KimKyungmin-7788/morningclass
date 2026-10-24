import { chooseOutfitAvatar } from '@/core/data/outfits';
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
    expect(all.expr.c).toEqual(expr); expect(all.schemaVersion).toBe(9); expect(await db.kvGet('schemaVersion')).toBe(9);
    expect(all.studentNotes).toEqual([]); expect(all.ieps).toEqual([]);
    await db.putNotes([note('n')]); expect((await db.notesOf('c','s')).map((n) => n.id)).toEqual(['n']);
    const upgraded = await request(indexedDB.open('morningclass'));
    expect(upgraded.version).toBe(9);
    for (const name of ['notes','ieps']) expect(upgraded.transaction(name).objectStore(name).index('byStudent').keyPath).toEqual(['classId','studentId']);
    upgraded.close();
  });
  it('새 값과 생활표현이 전체 백업·복원 왕복 뒤에도 남고 같은 열쇠의 PIN을 유지한다', async () => {
    const data = emptyData(); data.classes = [emptyClass('c')]; data.currentClassId = 'c';
    data.classes[0].students = [{id:'s',name:'시험',outfitAvatar:'girl'}];
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

it('학생·학급·날짜별 옷차림과 마지막 완료 학생이 백업 왕복 뒤에도 유지된다',async()=>{
 const data=emptyData(); data.classes=[emptyClass('c')];data.currentClassId='c';await db.replaceAll(data);
 const day=emptyRecord('c','20261023');day.notes='보존할 기록';await db.putRecord(day);
 const outfit={avatar:'girl' as const,clothes:{top:'shirt' as const,bottom:'pants' as const,shoes:'boots' as const},season:'가을' as const,weather:'비' as const,completedAt:'2026-10-23T01:00:00Z'};
 await db.saveStudentOutfit('c','20261023','a',outfit);
 await db.saveStudentOutfit('c','20261023','b',{...outfit,avatar:'boy'});
 await db.saveStudentOutfit('c','20261024','a',outfit);
 await db.saveStudentOutfit('other','20261023','a',outfit);
 const before=await db.readAll();await db.replaceAll(parseBackup(buildBackup(before)).data);
 expect(await db.readAll()).toEqual(before);
 const saved=await db.getRecord('c','20261023');expect(saved?.notes).toBe('보존할 기록');expect(saved?.lastOutfitStudentId).toBe('b');expect(saved?.outfits?.a).toEqual(outfit);
 expect(Object.keys(saved!.outfits!)).toEqual(['a','b']);
 await db.saveStudentOutfit('c','20261023','a',{...outfit,clothes:{top:'sweater',bottom:'shorts'}});
 expect((await db.getRecord('c','20261023'))?.lastOutfitStudentId).toBe('a');
 expect((await db.getRecord('c','20261024'))?.outfits?.a.clothes.bottom).toBe('pants');
});
it('v2 저장소를 v3으로 올려도 기존 하루 기록을 바꾸지 않는다',async()=>{
 const req=indexedDB.open('morningclass',2);req.onupgradeneeded=()=>{req.result.createObjectStore('kv');req.result.createObjectStore('records',{keyPath:['classId','date']});};
 const old=await request(req);const t=old.transaction(['kv','records'],'readwrite');const finished=transaction(t);t.objectStore('kv').put(2,'schemaVersion');const record=emptyRecord('c','20261023');record.notes='이전 자료';t.objectStore('records').put(record);await finished;old.close();
 expect(await db.getRecord('c','20261023')).toEqual(record);expect(await db.kvGet('schemaVersion')).toBe(9);
});

it('v3 학급을 v4로 올릴 때 아바타를 임의로 정하지 않는다', async()=>{
 const req=indexedDB.open('morningclass',3);
 req.onupgradeneeded=()=>{req.result.createObjectStore('kv');req.result.createObjectStore('classes',{keyPath:'id'});};
 const old=await request(req);const t=old.transaction(['kv','classes'],'readwrite');const finished=transaction(t);
 const cls={...emptyClass('c'),students:[{id:'s',name:'시험'}]};
 t.objectStore('kv').put(3,'schemaVersion');t.objectStore('classes').put(cls);await finished;old.close();
 expect(await db.getClasses()).toEqual([cls]);expect(await db.kvGet('schemaVersion')).toBe(9);
});

it('학생별 첫 아바타 선택을 저장하고 재선택 및 백업 복원에도 유지한다',async()=>{
 const cls={...emptyClass('c'),students:[{id:'a',name:'학생 가'},{id:'b',name:'학생 나'}]};
 await db.putClass(cls);
 await chooseOutfitAvatar('c','a','girl');await chooseOutfitAvatar('c','a','boy');await chooseOutfitAvatar('c','b','boy');
 const saved=(await db.getClasses())[0];expect(saved.students.map(s=>s.outfitAvatar)).toEqual(['boy','boy']);
 expect(saved.students.map(s=>s.emotionAvatar)).toEqual(['boy','boy']);
 const backup=buildBackup(await db.readAll());await db.replaceAll(parseBackup(backup).data);
 expect((await db.getClasses())[0].students).toEqual(saved.students);
});

it('preserves v4 outfits without inventing accessories on v5 upgrade',async()=>{
 const req=indexedDB.open('morningclass',4);
 req.onupgradeneeded=()=>{req.result.createObjectStore('kv');req.result.createObjectStore('records',{keyPath:['classId','date']});};
 const old=await request(req);const t=old.transaction(['kv','records'],'readwrite');const finished=transaction(t);
 const record=emptyRecord('c','20261024');record.outfits={s:{avatar:'boy',clothes:{top:'shirt',bottom:'pants'},season:'all',weather:'맑음',completedAt:'2026-10-24T00:00:00Z'}};
 t.objectStore('kv').put(4,'schemaVersion');t.objectStore('records').put(record);await finished;old.close();
 expect(await db.getRecord('c','20261024')).toEqual(record);expect(await db.kvGet('schemaVersion')).toBe(9);
});

it('계절별 새 옷차림을 전체 백업 복원 후에도 보존한다',async()=>{
 const data=emptyData();
 const choices=[
  {top:'lemon-shirt',bottom:'summer-shorts',hat:'sun-hat'},
  {top:'rust-sweatshirt',bottom:'cargo-pants',outer:'denim-jacket'},
  {top:'sweater',bottom:'pants',outer:'winter-coat',hat:'knit-hat',neck:'wool-scarf'},
 ] as const;
 data.records=choices.map((clothes,i)=>({...emptyRecord(data.currentClassId,`2026102${i+4}`),outfits:{s:{avatar:'girl',clothes,season:'all',weather:'맑음',completedAt:'2026-10-24T00:00:00Z'}}}));
 await db.replaceAll(data);const backup=buildBackup(await db.readAll());
 await db.replaceAll(parseBackup(backup).data);
 expect((await db.readAll()).records).toEqual(data.records);
});

it('v5에서 v6으로 올려도 기존 옷과 소품을 바꾸지 않는다',async()=>{
 const req=indexedDB.open('morningclass',5);
 req.onupgradeneeded=()=>{req.result.createObjectStore('kv');req.result.createObjectStore('records',{keyPath:['classId','date']});};
 const old=await request(req);const t=old.transaction(['kv','records'],'readwrite');const finished=transaction(t);
 const record=emptyRecord('c','20261024');record.outfits={s:{avatar:'girl',clothes:{top:'stripe-shirt',bottom:'chinos',hat:'spring-cap'},season:'all',weather:'맑음',completedAt:'2026-10-24T00:00:00Z'}};
 t.objectStore('kv').put(5,'schemaVersion');t.objectStore('records').put(record);await finished;old.close();
 expect(await db.getRecord('c','20261024')).toEqual(record);expect(await db.kvGet('schemaVersion')).toBe(9);
});

it('우산과 신발을 저장하고 백업 복원해도 함께 남긴다',async()=>{
 const data=emptyData();const record=emptyRecord(data.currentClassId,'20261024');
 record.outfits={s:{avatar:'boy',clothes:{top:'shirt',bottom:'pants',shoes:'boots',hand:'umbrella'},season:'all',weather:'비',completedAt:'2026-10-24T00:00:00Z'}};
 data.records=[record];await db.replaceAll(data);
 await db.replaceAll(parseBackup(buildBackup(await db.readAll())).data);
 expect(await db.getRecord(data.currentClassId,'20261024')).toEqual(record);
});

it('v6 기록은 우산을 임의 추가하지 않고 v7에서 읽는다',async()=>{
 const req=indexedDB.open('morningclass',6);
 req.onupgradeneeded=()=>{req.result.createObjectStore('kv');req.result.createObjectStore('records',{keyPath:['classId','date']});};
 const old=await request(req);const t=old.transaction(['kv','records'],'readwrite');const finished=transaction(t);
 const record=emptyRecord('c','20261024');record.outfits={s:{avatar:'girl',clothes:{top:'stripe-shirt',bottom:'chinos',hat:'spring-cap'},season:'all',weather:'바람',completedAt:'2026-10-24T00:00:00Z'}};
 t.objectStore('kv').put(6,'schemaVersion');t.objectStore('records').put(record);await finished;old.close();
 expect(await db.getRecord('c','20261024')).toEqual(record);expect(await db.kvGet('schemaVersion')).toBe(9);
 const data=emptyData();data.schemaVersion=6;data.records=[record];expect(parseBackup(buildBackup(data)).data.records).toEqual([record]);
});

it('감정 캐릭터는 학생별로 유지되고 백업 복원되며 옷입히기 선택과 연동된다',async()=>{
 const data=emptyData();data.classes[0].students=[{id:'a',name:'가람',outfitAvatar:'boy'},{id:'b',name:'나래'}];
 await db.replaceAll(data);await db.saveEmotionAvatar(data.currentClassId,'a','girl');
 const backup=buildBackup(await db.readAll());await db.replaceAll(parseBackup(backup).data);
 expect((await db.getClasses())[0].students).toEqual([{id:'a',name:'가람',outfitAvatar:'girl',emotionAvatar:'girl'},{id:'b',name:'나래'}]);
 await db.saveEmotionAvatar(data.currentClassId,'a','boy');
 expect((await db.getClasses())[0].students[0].emotionAvatar).toBe('boy');
 await expect(db.saveEmotionAvatar(data.currentClassId,'missing','girl')).rejects.toThrow();
});

it('v7 학급은 기존 학생 설정을 유지하고 감정 캐릭터를 임의 지정하지 않는다',async()=>{
 const req=indexedDB.open('morningclass',7);
 req.onupgradeneeded=()=>{req.result.createObjectStore('kv');req.result.createObjectStore('classes',{keyPath:'id'});};
 const old=await request(req);const t=old.transaction(['kv','classes'],'readwrite');const finished=transaction(t);
 const data=emptyData();const cls=data.classes[0];cls.students=[{id:'s',name:'가람',outfitAvatar:'girl'}];
 t.objectStore('kv').put(7,'schemaVersion');t.objectStore('classes').put(cls);await finished;old.close();
 expect(await db.getClasses()).toEqual([cls]);expect(await db.kvGet('schemaVersion')).toBe(9);
 data.schemaVersion=7;expect(parseBackup(buildBackup(data)).data.classes).toEqual([cls]);
});

it('학생 얼굴은 다른 학생·아바타를 보존하고 백업 복원되며 초기화된다',async()=>{
 const data=emptyData();const cls=data.classes[0];cls.students=[{id:'a',name:'가람',outfitAvatar:'girl',emotionAvatar:'boy'},{id:'b',name:'나래'}];
 await db.replaceAll(data);
 const photo='data:image/jpeg;base64,/9j/';
 await db.saveStudentFace(cls.id,'a',photo);
 const backup=parseBackup(buildBackup(await db.readAll())).data;
 expect(backup.classes[0].students[0]).toEqual({...cls.students[0],facePhoto:photo});
 await db.replaceAll(backup);
 expect((await db.getClasses())[0].students[0].facePhoto).toBe(photo);
 await db.saveStudentFace(cls.id,'a');
 expect((await db.getClasses())[0].students).toEqual(cls.students);
 await expect(db.saveStudentFace(cls.id,'missing',photo)).rejects.toThrow();
 await expect(db.saveStudentFace(cls.id,'a','https://example.com/photo.jpg')).rejects.toThrow();
});
it('v8 학생·감정·옷차림은 v9 변환에서 얼굴 사진 없이 그대로 남는다',async()=>{
 const req=indexedDB.open('morningclass',8);
 req.onupgradeneeded=()=>{req.result.createObjectStore('kv');req.result.createObjectStore('classes',{keyPath:'id'});};
 const old=await request(req);const t=old.transaction(['kv','classes'],'readwrite');const finished=transaction(t);
 const data=emptyData();const cls=data.classes[0];cls.students=[{id:'s',name:'가람',outfitAvatar:'girl',emotionAvatar:'girl'}];
 t.objectStore('kv').put(8,'schemaVersion');t.objectStore('classes').put(cls);await finished;old.close();
 expect(await db.getClasses()).toEqual([cls]);expect(await db.kvGet('schemaVersion')).toBe(9);
 data.schemaVersion=8;expect(parseBackup(buildBackup(data)).data.classes).toEqual([cls]);
});
