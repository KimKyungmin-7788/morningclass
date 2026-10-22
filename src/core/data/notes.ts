import { useEffect, useState } from 'react';
import * as db from '@/core/storage/db';
import type { StudentNote } from './types';

// 저장 성공 뒤에만 목록을 다시 읽는다. 새 기록 창에는 이 목록을 전달하지 않는다.
const listeners = new Set<() => void>();
export const refreshNotes = () => listeners.forEach((fn) => fn());
export const readNotes = db.notesOf;
export const readIeps = db.iepsOf;
export async function saveNotes(notes: StudentNote[]) { await db.putNotes(notes); refreshNotes(); }
export async function removeNotes(ids: string[]) { await db.deleteNotes(ids); refreshNotes(); }
export function useStudentNotes(classId: string, studentId: string) {
  const [notes, setNotes] = useState<StudentNote[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const read = () => { void db.notesOf(classId, studentId).then((value) => { if (active) { setNotes(value); setError(''); } }, () => { if (active) setError('기록을 불러오지 못했어요'); }); };
    read(); listeners.add(read);
    return () => { active = false; listeners.delete(read); };
  }, [classId, studentId]);
  return { notes, error };
}
