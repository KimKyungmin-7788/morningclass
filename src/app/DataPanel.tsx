import { useEffect, useRef, useState } from 'react';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { activeStudents, useData } from '@/core/data/store';
import { backupFileName, buildBackup, parseBackup } from '@/core/data/backup';
import type { MigrationReport } from '@/core/data/migrateLegacy';
import * as db from '@/core/storage/db';

// 2단계 임시 화면: 저장소에 무엇이 들어 있는지 보고, 백업을 내보내고 가져온다.
// 5단계에서 설정 창(학급·학생·백업 탭)이 생기면 그쪽으로 옮기고 이 파일은 지운다.

export function DataPanel({ onClose }: { onClose: () => void }) {
  const { classes, currentClassId, migration, setCurrentClass, replaceAll } = useData();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [report, setReport] = useState<MigrationReport | null>(migration);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    void db.readAll().then((d) => {
      const byClass: Record<string, number> = {};
      for (const r of d.records) byClass[r.classId] = (byClass[r.classId] ?? 0) + 1;
      setCounts({ ...byClass, _images: Object.keys(d.mealImages).length, _lessons: d.lessons.length, _timetables: d.timetables.length });
    });
  };
  useEffect(refresh, [classes]);

  const exportBackup = async () => {
    const blob = new Blob([buildBackup(await db.readAll())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    playSound('save');
    toast('백업 파일을 저장했어요 📤', 'success');
  };

  const importBackup = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = parseBackup(await file.text());
      const n = parsed.data.classes.length;
      if (!confirm(`지금 자료를 지우고 백업 파일의 자료(학급 ${n}개, 기록 ${parsed.data.records.length}건)로 바꿀까요?`)) return;
      await replaceAll(parsed.data);
      setReport(parsed.report ?? null);
      playSound('save');
      toast('백업을 가져왔어요 ✅', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : '백업을 가져오지 못했어요', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Popup title="🗂️ 자료 (임시 화면)" onClose={onClose}>
      <div className="hint" style={{ marginBottom: 12 }}>
        새 저장소에 들어 있는 자료예요. 학급을 누르면 그 학급으로 바꿔요.
      </div>
      <div className="class-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {classes.map((c) => {
          const students = activeStudents(c).length;
          const archived = c.students.length - students;
          return (
            <button key={c.id} className={`class-chip${c.id === currentClassId ? ' active' : ''}`}
              onClick={() => { playSound('select'); void setCurrentClass(c.id); }}>
              {c.className || '이름 없는 학급'} · 학생 {students}명{archived ? ` (+보관 ${archived})` : ''} · 기록 {counts[c.id] ?? 0}일
            </button>
          );
        })}
      </div>
      <div className="hint">
        시간표 {counts._timetables ?? 0}개 요일 · 급식 그림 {counts._images ?? 0}개 · 수업 차시 {counts._lessons ?? 0}개
      </div>
      {report && (
        <div style={{ marginTop: 14, padding: '12px 14px', background: '#F6F9FF', border: '1.5px solid #c9d5ea', borderRadius: 12, fontSize: 15, lineHeight: 1.6 }}>
          <b>기존 자료를 옮겼어요</b> — 학급 {report.classes}개 · 학생 {report.students}명 · 보관된 학생 {report.archivedStudents}명 · 기록 {report.records}일
          {report.warnings.length > 0 && (
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              {report.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </div>
      )}
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importBackup(e.target.files?.[0])} />
      <PopupActions>
        <button className="btn-cancel" onClick={() => fileRef.current?.click()}>📥 백업 가져오기</button>
        <button className="btn-save" onClick={() => void exportBackup()}>📤 백업 내보내기</button>
      </PopupActions>
    </Popup>
  );
}
