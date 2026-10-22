import { create } from 'zustand';
// 헤더·설정·수업교실에서 같은 진입점을 쓴다. 기록 내용은 여기 두지 않는다.
export const useStudentWindows = create<{ open: null | { classId: string; studentId?: string; quick: boolean }; show: (classId: string, studentId?: string, quick?: boolean) => void; close: () => void }>((set) => ({
  open: null, show: (classId, studentId, quick = false) => set({ open: { classId, studentId, quick } }), close: () => set({ open: null }),
}));
