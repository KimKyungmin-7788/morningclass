import { SCHEMA_VERSION, type AppData, type ClassId, type ClassRoom, type DateKey, type DayRecord, type Timetable } from '@/core/data/types';

// 저장 창구: 앱의 모든 자료는 여기(IndexedDB)를 거쳐 읽고 쓴다.
// 기능 코드는 이 파일을 직접 쓰지 않고 core/data 의 저장소(store)·함수를 쓴다.

const DB_NAME = 'morningclass';
const DB_VERSION = 1;

/** 낱개 값(형식 버전, 지금 학급, D-DAY, 수업 차시 등)은 kv 에 열쇠-값으로 둔다 */
type Store = 'kv' | 'classes' | 'records' | 'timetables' | 'mealImages';
const STORES: Store[] = ['kv', 'classes', 'records', 'timetables', 'mealImages'];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('classes')) db.createObjectStore('classes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: ['classId', 'date'] });
      if (!db.objectStoreNames.contains('timetables')) db.createObjectStore('timetables', { keyPath: ['classId', 'day'] });
      if (!db.objectStoreNames.contains('mealImages')) db.createObjectStore('mealImages');
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
    Promise.resolve(run(t)).then((r) => { result = r; }, (e) => { try { t.abort(); } catch { /* 이미 끝남 */ } reject(e); });
  });
}

// ── 낱개 값 ──
export const kvGet = <T>(key: string) => tx(['kv'], 'readonly', (t) => done(t.objectStore('kv').get(key) as IDBRequest<T | undefined>));
export const kvSet = (key: string, value: unknown) => tx(['kv'], 'readwrite', (t) => { t.objectStore('kv').put(value, key); });

// ── 학급 ──
export const getClasses = () => tx(['classes'], 'readonly', (t) => done(t.objectStore('classes').getAll() as IDBRequest<ClassRoom[]>));
export const putClass = (cls: ClassRoom) => tx(['classes'], 'readwrite', (t) => { t.objectStore('classes').put(cls); });

/** 학급과 그 학급의 기록·시간표·D-DAY 를 함께 지운다 */
export function deleteClassData(classId: ClassId) {
  const range = IDBKeyRange.bound([classId], [classId, []]);
  return tx(['classes', 'records', 'timetables', 'kv'], 'readwrite', (t) => {
    t.objectStore('classes').delete(classId);
    t.objectStore('records').delete(range);
    t.objectStore('timetables').delete(range);
    t.objectStore('kv').delete(`ddays:${classId}`);
    t.objectStore('kv').delete(`dateSet:${classId}`);
  });
}

// ── 하루 기록 ──
export const getRecord = (classId: ClassId, date: DateKey) =>
  tx(['records'], 'readonly', (t) => done(t.objectStore('records').get([classId, date]) as IDBRequest<DayRecord | undefined>));
export const putRecord = (rec: DayRecord) => tx(['records'], 'readwrite', (t) => { t.objectStore('records').put(rec); });
/** 한 학급의 기록 전체 (날짜순) — 출결 대시보드·이전 기록 보기용 */
export const getRecordsOf = (classId: ClassId) =>
  tx(['records'], 'readonly', (t) => done(t.objectStore('records').getAll(IDBKeyRange.bound([classId], [classId, []])) as IDBRequest<DayRecord[]>));

// ── 시간표 ──
export const getTimetablesOf = (classId: ClassId) =>
  tx(['timetables'], 'readonly', (t) => done(t.objectStore('timetables').getAll(IDBKeyRange.bound([classId], [classId, []])) as IDBRequest<Timetable[]>));
export const putTimetable = (tt: Timetable) => tx(['timetables'], 'readwrite', (t) => { t.objectStore('timetables').put(tt); });

// ── 전체 읽기·바꾸기 (백업, 가져오기, 기존 자료 변환) ──
export function readAll(): Promise<AppData> {
  return tx(STORES, 'readonly', async (t) => {
    const kv = t.objectStore('kv');
    const [classes, records, timetables, kvKeys, kvVals, imgKeys, imgVals] = await Promise.all([
      done(t.objectStore('classes').getAll()), done(t.objectStore('records').getAll()), done(t.objectStore('timetables').getAll()),
      done(kv.getAllKeys()), done(kv.getAll()),
      done(t.objectStore('mealImages').getAllKeys()), done(t.objectStore('mealImages').getAll()),
    ]);
    const kvMap = new Map(kvKeys.map((k, i) => [String(k), kvVals[i]]));
    const grouped = (prefix: string) => Object.fromEntries([...kvMap].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v]));
    return {
      schemaVersion: (kvMap.get('schemaVersion') as number) ?? SCHEMA_VERSION,
      classes, records, timetables,
      currentClassId: (kvMap.get('currentClassId') as string) ?? classes[0]?.id ?? '',
      ddays: grouped('ddays:'), dateSet: grouped('dateSet:'),
      lessons: (kvMap.get('lessons') as AppData['lessons']) ?? [],
      videos: (kvMap.get('videos') as AppData['videos']) ?? [],
      mealImages: Object.fromEntries(imgKeys.map((k, i) => [String(k), imgVals[i]])),
    } as AppData;
  });
}

/** 저장소 내용을 통째로 바꾼다 — 한 번에 성공하거나 전부 그대로 남는다 */
export function replaceAll(data: AppData): Promise<void> {
  return tx(STORES, 'readwrite', (t) => {
    for (const s of STORES) t.objectStore(s).clear();
    const kv = t.objectStore('kv');
    kv.put(data.schemaVersion, 'schemaVersion');
    kv.put(data.currentClassId, 'currentClassId');
    kv.put(data.lessons, 'lessons');
    kv.put(data.videos, 'videos');
    for (const [id, v] of Object.entries(data.ddays)) kv.put(v, `ddays:${id}`);
    for (const [id, v] of Object.entries(data.dateSet)) kv.put(v, `dateSet:${id}`);
    for (const c of data.classes) t.objectStore('classes').put(c);
    for (const r of data.records) t.objectStore('records').put(r);
    for (const tt of data.timetables) t.objectStore('timetables').put(tt);
    for (const [k, v] of Object.entries(data.mealImages)) t.objectStore('mealImages').put(v, k);
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
