import { getClasses, putClass, saveStudentOutfit } from '@/core/storage/db';
import { useDay } from './day';
import { useData } from './store';
import type { OutfitAvatar, StudentOutfit } from './types';

/** 완료한 옷차림만 저장한다. 다른 학생과 다른 활동 기록은 유지한다. */
export async function completeOutfit(classId: string, date: string, studentId: string, value: StudentOutfit) {
  const record = await saveStudentOutfit(classId, date, studentId, value);
  const current = useDay.getState();
  if (current.classId === classId && current.record.date === date) {
    useDay.setState({ record: { ...current.record, outfits: record.outfits, lastOutfitStudentId: studentId } });
  }
}

/** 날짜가 바뀌어도 유지할 학생별 아바타. 저장 성공 후 화면에 반영한다. */
export async function chooseOutfitAvatar(classId: string, studentId: string, avatar: OutfitAvatar) {
  const cls = (await getClasses()).find(c => c.id === classId);
  if (!cls || !cls.students.some(s => s.id === studentId && !s.archived)) throw new Error('학생을 찾을 수 없어요');
  const updated = {...cls, students: cls.students.map(s => s.id === studentId ? {...s, outfitAvatar: s.outfitAvatar ?? avatar} : s)};
  await putClass(updated);
  useData.setState(current => ({classes: current.classes.map(c => c.id === classId ? updated : c)}));
}
