import { saveStudentFace } from '@/core/storage/db';
import { useData } from './store';
export async function setStudentFace(classId: string, studentId: string, photo?: string) {
  const updated = await saveStudentFace(classId, studentId, photo);
  useData.setState(s => ({classes: s.classes.map(c => c.id === classId ? updated : c)}));
}
