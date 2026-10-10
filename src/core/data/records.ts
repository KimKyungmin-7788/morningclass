import { useCallback, useEffect, useState } from 'react';
import * as db from '@/core/storage/db';
import { useDay } from './day';
import type { ClassId, DayRecord } from './types';

// 한 학급의 기록 전체를 읽는 훅 (출결 대시보드·이전 기록 보기). 오늘 기록이 바뀌면 다시 읽는다.
export function useRecordsOf(classId: ClassId): { records: DayRecord[] | null; remove: (date: string) => Promise<void> } {
  const [records, setRecords] = useState<DayRecord[] | null>(null);
  const savedAt = useDay((s) => s.record.savedAt);
  const reloadDay = useDay((s) => s.load);
  const dayClass = useDay((s) => s.classId);

  const load = useCallback(() => {
    let alive = true;
    void db.getRecordsOf(classId).then((list) => { if (alive) setRecords(list); });
    return () => { alive = false; };
  }, [classId]);
  useEffect(load, [load, savedAt]);

  const remove = useCallback(async (date: string) => {
    await db.deleteRecord(classId, date);
    if (dayClass === classId) await reloadDay(classId);          // 지운 것이 지금 보고 있는 날이면 화면도 비운다
    load();
  }, [classId, dayClass, reloadDay, load]);

  return { records, remove };
}
