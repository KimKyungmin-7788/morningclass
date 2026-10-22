import { SCHEMA_VERSION, defaultNotesConfig, type StudentNote, type Iep, type AppData, type ClassId, type ClassRoom, type DateKey, type DayRecord, type MealImage, type Timetable } from '@/core/data/types';

// 저장 창구: 앱의 모든 자료는 여기(IndexedDB)를 거쳐 읽고 쓴다.
// 기능 코드는 이 파일을 직접 쓰지 않고 core/data 의 저장소(store)·함수를 쓴다.

const DB_NAME = 'morningclass';
const DB_VERSION = 2;

/** 낱개 값(형식 버전, 지금 학급, D-DAY, 수업 차시 등)은 kv 에 열쇠-값으로 둔다 */
type Store = 'kv' | 'classes' | 'records' | 'timetables' | 'mealImages' | 'notes' | 'ieps';
const STORES: Store[] = ['kv', 'classes', 'records', 'timetables', 'mealImages', 'notes', 'ieps'];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of ['notes', 'ieps']) if (!db.objectStoreNames.contains(name)) {
        db.createObjectStore(name, { keyPath: 'id' }).createIndex('byStudent', ['classId', 'studentId']);
      }
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('classes')) db.createObjectStore('classes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: ['classId', 'date'] });
      if (!db.objectStoreNames.contains('timetables')) db.createObjectStore('timetables', { keyPath: ['classId', 'day'] });
      if (!db.objectStoreNames.contains('mealImages')) db.createObjectStore('mealImages');
      // 빈 저장소는 init 에 맡기고, 기존 자료는 그 자리에서 버전만 올린다.
      const kv = req.transaction!.objectStore('kv');
      const version = kv.get('schemaVersion');
      version.onsuccess = () => { if (version.result != null) kv.put(SCHEMA_VERSION, 'schemaVersion'); };
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('다른 탭에서 예전 버전을 쓰고 있어 저장소를 열 수 없어요'));
  });
  return dbPromise;
}

const done = <T>(req: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

async function tx<T>(stores: Store[], mode: IDBTransactionMode, run: (t: IDBTransaction) => Promise<T> | T): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result: T;
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error ?? new Error('저장이 취소됐어요'));
    const fail = (e: unknown) => { try { t.abort(); } catch { /* 이미 끝남 */ } reject(e); };
    // put()은 복제할 수 없는 값에서 동기로도 실패한다. 이때 앞선 쓰기도 취소한다.
    try { Promise.resolve(run(t)).then((r) => { result = r; }, fail); } catch (e) { fail(e); }
  });
}

// ── 낱개 값 ──
export const kvGet = <T>(key: string) => tx(['kv'], 'readonly', (t) => done(t.objectStore('kv').get(key) as IDBRequest<T | undefined>));
export const kvDelete = (key: string) => tx(['kv'], 'readwrite', (t) => { t.objectStore('kv').delete(key); });
export const kvSet = (key: string, value: unknown) => tx(['kv'], 'readwrite', (t) => { t.objectStore('kv').put(value, key); });

// ── 학급 ──
export const getClasses = () => tx(['classes'], 'readonly', (t) => done(t.objectStore('classes').getAll() as IDBRequest<ClassRoom[]>));
export const putClass = (cls: ClassRoom) => tx(['classes'], 'readwrite', (t) => { t.objectStore('classes').put(cls); });

/** 학급과 그 학급의 기록·시간표·D-DAY 를 함께 지운다 */
export function deleteClassData(classId: ClassId) {
  const range = IDBKeyRange.bound([classId], [classId, []]);
  return tx(['classes', 'records', 'timetables', 'kv', 'notes', 'ieps'], 'readwrite', (t) => {
    t.objectStore('classes').delete(classId);
    for (const name of ['notes', 'ieps']) deleteByStudent(t.objectStore(name), range);
    t.objectStore('kv').delete(`expr:${classId}`);
    t.objectStore('records').delete(range);
    t.objectStore('timetables').delete(range);
    t.objectStore('kv').delete(`ddays:${classId}`);
    t.objectStore('kv').delete(`dateSet:${classId}`);
    t.objectStore('kv').delete(IDBKeyRange.bound(`sd:${classId}_`, `sd:${classId}_\uffff`));
  });
}

// ── 하루 기록 ──
export const getRecord = (classId: ClassId, date: DateKey) =>
  tx(['records'], 'readonly', (t) => done(t.objectStore('records').get([classId, date]) as IDBRequest<DayRecord | undefined>));
export const deleteRecord = (classId: ClassId, date: DateKey) => tx(['records'], 'readwrite', (t) => { t.objectStore('records').delete([classId, date]); });
export const putRecord = (rec: DayRecord) => tx(['records'], 'readwrite', (t) => { t.objectStore('records').put(rec); });
/** 한 학급의 기록 전체 (날짜순) — 출결 대시보드·이전 기록 보기용 */
export const getRecordsOf = (classId: ClassId) =>
  tx(['records'], 'readonly', (t) => done(t.objectStore('records').getAll(IDBKeyRange.bound([classId], [classId, []])) as IDBRequest<DayRecord[]>));

// ── 시간표 ──
export const getTimetablesOf = (classId: ClassId) =>
  tx(['timetables'], 'readonly', (t) => done(t.objectStore('timetables').getAll(IDBKeyRange.bound([classId], [classId, []])) as IDBRequest<Timetable[]>));
export const putTimetable = (tt: Timetable) => tx(['timetables'], 'readwrite', (t) => { t.objectStore('timetables').put(tt); });

// ── 급식 메뉴 그림 (메뉴 이름 열쇠) ──
export const getMealImages = () => tx(['mealImages'], 'readonly', async (t) => {
  const s = t.objectStore('mealImages');
  const [keys, vals] = await Promise.all([done(s.getAllKeys()), done(s.getAll() as IDBRequest<MealImage[]>)]);
  return Object.fromEntries(keys.map((k, i) => [String(k), vals[i]])) as Record<string, MealImage>;
});
export const putMealImage = (key: string, img: MealImage) => tx(['mealImages'], 'readwrite', (t) => { t.objectStore('mealImages').put(img, key); });

// ── 전체 읽기·바꾸기 (백업, 가져오기, 기존 자료 변환) ──
export function readAll(): Promise<AppData> {
  return tx(STORES, 'readonly', async (t) => {
    const kv = t.objectStore('kv');
    const [classes, records, timetables, kvKeys, kvVals, imgKeys, imgVals, studentNotes, ieps] = await Promise.all([
      done(t.objectStore('classes').getAll()), done(t.objectStore('records').getAll()), done(t.objectStore('timetables').getAll()),
      done(kv.getAllKeys()), done(kv.getAll()),
      done(t.objectStore('mealImages').getAllKeys()), done(t.objectStore('mealImages').getAll()),
      done(t.objectStore('notes').getAll()), done(t.objectStore('ieps').getAll()),
    ]);
    const kvMap = new Map(kvKeys.map((k, i) => [String(k), kvVals[i]]));
    const grouped = (prefix: string) => Object.fromEntries([...kvMap].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
    return {
      schemaVersion: SCHEMA_VERSION,
      studentNotes, ieps, expr: grouped('expr:'), notesConfig: kvMap.get('studentNotesConfig') ?? defaultNotesConfig(),
      ...(kvMap.get('recoveryKey') ? { recoveryKey: kvMap.get('recoveryKey') } : {}),
      classes, records, timetables,
      currentClassId: (kvMap.get('currentClassId') as string) ?? classes[0]?.id ?? '',
      ddays: grouped('ddays:'), dateSet: grouped('dateSet:'), schoolDays: grouped('sd:'),
      lessons: (kvMap.get('lessons') as AppData['lessons']) ?? [],
      videos: (kvMap.get('videos') as AppData['videos']) ?? [],
      mealImages: Object.fromEntries(imgKeys.map((k, i) => [String(k), imgVals[i]])),
    } as AppData;
  });
}

/** 저장소 내용을 통째로 바꾼다 — 한 번에 성공하거나 전부 그대로 남는다 */
export function replaceAll(data: AppData): Promise<void> {
  return tx(STORES, 'readwrite', async (t) => {
    const [pin, recovery] = await Promise.all([done(t.objectStore('kv').get('pinHash')), done(t.objectStore('kv').get('recoveryKey'))]);
    for (const s of STORES) t.objectStore(s).clear();
    const kv = t.objectStore('kv');
    kv.put(SCHEMA_VERSION, 'schemaVersion');
    if (pin && recovery && recovery === data.recoveryKey) kv.put(pin, 'pinHash');
    if (data.recoveryKey) kv.put(data.recoveryKey, 'recoveryKey');
    kv.put(data.notesConfig ?? defaultNotesConfig(), 'studentNotesConfig');
    for (const [id, book] of Object.entries(data.expr ?? {})) kv.put(book, `expr:${id}`);
    for (const note of data.studentNotes ?? []) t.objectStore('notes').put(note);
    for (const iep of data.ieps ?? []) t.objectStore('ieps').put(iep);
    kv.put(data.currentClassId, 'currentClassId');
    kv.put(data.lessons, 'lessons');
    kv.put(data.videos, 'videos');
    for (const [id, v] of Object.entries(data.ddays)) kv.put(v, `ddays:${id}`);
    for (const [id, v] of Object.entries(data.dateSet)) kv.put(v, `dateSet:${id}`);
    for (const [k, v] of Object.entries(data.schoolDays ?? {})) kv.put(v, `sd:${k}`);
    for (const c of data.classes) t.objectStore('classes').put(c);
    for (const r of data.records) t.objectStore('records').put(r);
    for (const tt of data.timetables) t.objectStore('timetables').put(tt);
    for (const [k, v] of Object.entries(data.mealImages)) t.objectStore('mealImages').put(v, k);
  });
}

/** 저장소를 통째로 지운다 */
export async function destroy(): Promise<void> {
  (await open()).close();
  dbPromise = null;
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

/** 브라우저가 공간이 모자랄 때 이 사이트 자료를 임의로 지우지 않도록 요청한다 */
export async function requestPersistence(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

// 학생별 자료: 여러 학생에게 남긴 한 묶음은 같은 트랜잭션으로 저장한다.
function deleteByStudent(store: IDBObjectStore, range: IDBKeyRange) {
  const cursor = store.index('byStudent').openCursor(range);
  cursor.onsuccess = () => { const c = cursor.result; if (c) { c.delete(); c.continue(); } };
}
export const notesOf = (classId: string, studentId?: string) => tx(['notes'], 'readonly', (t) =>
  done(t.objectStore('notes').index('byStudent').getAll(studentId ? [classId, studentId] : IDBKeyRange.bound([classId], [classId, []])) as IDBRequest<StudentNote[]>));
export const iepsOf = (classId: string, studentId?: string) => tx(['ieps'], 'readonly', (t) =>
  done(t.objectStore('ieps').index('byStudent').getAll(studentId ? [classId, studentId] : IDBKeyRange.bound([classId], [classId, []])) as IDBRequest<Iep[]>));
export const putNotes = (notes: StudentNote[]) => tx(['notes'], 'readwrite', (t) => { for (const n of notes) t.objectStore('notes').put(n); });
export const deleteNotes = (ids: string[]) => tx(['notes'], 'readwrite', (t) => { for (const id of ids) t.objectStore('notes').delete(id); });
export const setPin = (pin: unknown, recoveryKey: string) => tx(['kv'], 'readwrite', (t) => {
  t.objectStore('kv').put(pin, 'pinHash'); t.objectStore('kv').put(recoveryKey, 'recoveryKey');
});
