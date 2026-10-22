import type { ClassRoom, DayRecord, Iep, NoteCategory, StudentNote, SupportLevel } from '@/core/data/types';

export const CATEGORIES: [NoteCategory, string][] = [['study', '학습'], ['behavior', '행동'], ['challenge', '도전행동'], ['health', '건강'], ['peer', '교우관계'], ['home', '가정 연계']];
export const SUPPORTS: [SupportLevel, string][] = [['independent', '혼자'], ['verbal', '말로 도움'], ['model', '보여 주기'], ['physical', '손잡고']];
export const EMOTIONS = { joy: '😊 기쁨', sad: '😢 슬픔', angry: '😠 화남', tired: '😴 피곤', excited: '🤩 신남', anxious: '😟 걱정', meh: '😐 그저 그래요', sick: '🤒 아픔' };
export function semesterOf(date: Date) { const m = date.getMonth() + 1; return `${date.getFullYear() - (m < 3 ? 1 : 0)}-${m >= 3 && m <= 8 ? 1 : 2}`; }
export function monthsOfSemester(sem: string) { return /^\d{4}-1$/.test(sem) ? [3, 4, 5, 6, 7, 8] : /^\d{4}-2$/.test(sem) ? [9, 10, 11, 12, 1, 2] : []; }
export function currentMonthlyGoals(iep: Iep, date: Date) {
  if (iep.semester !== semesterOf(date)) return [];
  return iep.subjects.flatMap((s) => s.goals.flatMap((g) => g.monthly.filter((m) => m.months.includes(date.getMonth() + 1)).map((m) => ({ ...m, subject: s.name }))));
}
export const notesForGoal = (notes: StudentNote[], goalId: string) => notes.filter((n) => n.goalId === goalId).sort((a, b) => a.at.localeCompare(b.at));
export const supportTrend = (notes: StudentNote[], goalId: string) => notesForGoal(notes, goalId).filter((n) => n.support).map((n) => ({ at: n.at, support: n.support! }));
export function filterNotes(notes: StudentNote[], f: { category?: NoteCategory; goalId?: string; share?: boolean; from?: string; to?: string }) {
  return notes.filter((n) => (!f.category || n.category === f.category) && (!f.goalId || n.goalId === f.goalId) && (f.share == null || !!n.share === f.share) && (!f.from || n.at >= f.from) && (!f.to || n.at <= f.to)).sort((a, b) => b.at.localeCompare(a.at));
}
export const doneToday = (record: DayRecord, id: string) => !!record.attendance[id] && !!(record.emotions[id]?.items.length || record.emotions[id]?.legacy);
export function studentSummary(records: DayRecord[], cls: ClassRoom, studentId: string, range: { from: string; to: string }) {
  const rows = records.filter((r) => r.classId === cls.id && r.date >= range.from && r.date <= range.to);
  const attendance = { present: 0, late: 0, early: 0, absent: 0 };
  const emotions = { joy: 0, sad: 0, angry: 0, tired: 0, excited: 0, anxious: 0, meh: 0, sick: 0 };
  const praise = rows.flatMap((r) => (r.praise ?? []).filter((p) => p.s === studentId));
  let roleDays = 0;
  for (const r of rows) {
    const a = r.attendance[studentId]; if (a) attendance[a.status]++;
    for (const e of r.emotions[studentId]?.items ?? []) emotions[e.k]++;
    if (Object.values(r.roleDone ?? {}).some((ids) => ids.includes(studentId))) roleDays++;
  }
  return { attendance, emotions, praise, roleDays };
}
