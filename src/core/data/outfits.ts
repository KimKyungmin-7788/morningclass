import { chooseEmotionAvatar } from './emotionAvatar';
import { saveStudentOutfit } from '@/core/storage/db';
import { useDay } from './day';
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
  await chooseEmotionAvatar(classId, studentId, avatar);
}
