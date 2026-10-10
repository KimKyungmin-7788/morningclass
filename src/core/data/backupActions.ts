import * as db from '@/core/storage/db';
import { usePrefs } from '@/core/prefs';
import { backupFileName, buildBackup, parseBackup, type ParsedBackup } from './backup';
import { useData } from './store';
import type { ClassId } from './types';

// 백업 파일 내려받기·가져오기, 저장소 통계, 기록 정리 (화면에서 부르는 동작)

export async function downloadBackup(): Promise<void> {
  const blob = new Blob([buildBackup(await db.readAll())], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = backupFileName();
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  usePrefs.getState().set({ lastBackup: new Date().toISOString() });
}

/** 파일을 읽어 내용을 확인한다 (아직 바꾸지 않음). 읽을 수 없으면 이유를 담아 던진다 */
export const readBackupFile = async (file: File): Promise<ParsedBackup> => parseBackup(await file.text());

export const applyBackup = (parsed: ParsedBackup) => useData.getState().replaceAll(parsed.data);

export async function storageStats(classId: ClassId): Promise<{ records: number; allRecords: number; usageKB: number | null }> {
  const all = await db.readAll();
  let usageKB: number | null = null;
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.usage != null) usageKB = est.usage / 1024;
  } catch {
    /* 사용량을 알려 주지 않는 브라우저 */
  }
  return { records: all.records.filter((r) => r.classId === classId).length, allRecords: all.records.length, usageKB };
}

/** 그 날짜(YYYYMMDD)보다 앞선 기록을 모든 학급에서 지운다. 지운 건수를 돌려준다 */
export async function deleteRecordsBefore(dateKey: string): Promise<number> {
  const old = (await db.readAll()).records.filter((r) => r.date < dateKey);
  for (const r of old) await db.deleteRecord(r.classId, r.date);
  return old.length;
}

export async function countRecordsBefore(dateKey: string): Promise<number> {
  return (await db.readAll()).records.filter((r) => r.date < dateKey).length;
}

export const recordsOf = (classId: ClassId) => db.getRecordsOf(classId);
