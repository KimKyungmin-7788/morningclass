import { saveEmotionAvatar } from '@/core/storage/db';
import { useData } from './store';

/** 저장에 성공한 캐릭터를 화면에 반영한다. */
export async function chooseEmotionAvatar(classId: string, studentId: string, avatar: 'boy' | 'girl') {
  const updated = await saveEmotionAvatar(classId, studentId, avatar);
  useData.setState(current => ({classes: current.classes.map(c => c.id === classId ? updated : c)}));
}
