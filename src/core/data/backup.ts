import { hasLegacyData, migrateLegacy, type LegacyDump, type MigrationReport } from './migrateLegacy';
import { SCHEMA_VERSION, type AppData } from './types';

// 백업 파일: 새 형식 하나로 내보내고, 가져올 때는 새 형식과 기존 앱의 백업 파일을 모두 읽는다.

const FORMAT = 'morningclass-backup';

interface BackupFile { format: typeof FORMAT; schemaVersion: number; exportedAt: string; data: AppData }

export function buildBackup(data: AppData, now = new Date()): string {
  const file: BackupFile = { format: FORMAT, schemaVersion: data.schemaVersion, exportedAt: now.toISOString(), data };
  return JSON.stringify(file);
}

export interface ParsedBackup {
  data: AppData;
  /** 기존 앱의 백업을 변환한 경우에만 있다 */
  report?: MigrationReport;
}

/** 백업 파일 내용을 읽는다. 읽을 수 없으면 이유를 담아 던진다. */
export function parseBackup(text: string): ParsedBackup {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('백업 파일을 읽을 수 없어요 (JSON 형식이 아니에요)');
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('아침교실 백업 파일이 아니에요');
  const file = json as Partial<BackupFile> & Record<string, unknown>;

  if (file.format === FORMAT) {
    const data = file.data;
    if (!data || !Array.isArray(data.classes) || !data.classes.length || !Array.isArray(data.records)) throw new Error('백업 파일의 내용이 비어 있거나 깨졌어요');
    if ((data.schemaVersion ?? 0) > SCHEMA_VERSION) throw new Error('더 새로운 버전의 아침교실에서 만든 백업이에요. 앱을 새로 고친 뒤 다시 해 주세요');
    return { data };
  }
  // 기존 앱의 백업: mc_ 로 시작하는 열쇠에 문자열 값이 그대로 들어 있다
  const dump: LegacyDump = {};
  for (const [k, v] of Object.entries(file)) if (k.startsWith('mc_') && typeof v === 'string') dump[k] = v;
  if (!hasLegacyData(dump)) throw new Error('아침교실 백업 파일이 아니에요');
  const { data, report } = migrateLegacy(dump);
  return { data, report };
}

export function backupFileName(now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `아침교실_백업_${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}.json`;
}
