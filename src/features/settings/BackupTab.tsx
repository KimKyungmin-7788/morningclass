import { useRef, useState } from 'react';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { usePrefs } from '@/core/prefs';
import { useData } from '@/core/data/store';
import { applyBackup, countRecordsBefore, deleteRecordsBefore, downloadBackup, readBackupFile } from '@/core/data/backupActions';
import type { ParsedBackup } from '@/core/data/backup';
import { schoolYearOf } from '@/features/attendance/model';

export function BackupTab({ onRestored }: { onRestored: () => void }) {
  const lastBackup = usePrefs((s) => s.lastBackup);
  const wipeAll = useData((s) => s.wipeAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ name: string; parsed: ParsedBackup } | null>(null);
  const [busy, setBusy] = useState(false);
  const sy = schoolYearOf(new Date());
  const cutoff = `${sy}0301`;
  const last = lastBackup ? new Date(lastBackup) : null;
  const today = last?.toDateString() === new Date().toDateString();
  const lastText = last && !Number.isNaN(last.getTime())
    ? `${today ? '오늘' : last.toLocaleDateString('ko-KR')} ${last.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}에 백업`
    : '마지막 백업 없음';

  const download = async () => {
    setBusy(true);
    try { if (await downloadBackup()) { playSound('save'); toast('백업 파일을 준비했어요', 'success'); } }
    catch { toast('백업 파일을 만들지 못했어요. 다시 시도해 주세요', 'error'); }
    finally { setBusy(false); }
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setPreview(null); setBusy(true);
    try { setPreview({ name: file.name, parsed: await readBackupFile(file) }); }
    catch (e) { toast(e instanceof Error ? e.message : '파일을 읽지 못했어요', 'error'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const restore = async () => {
    if (!preview) return;
    if (!confirm('현재 모든 학급의 자료를 이 백업 내용으로 교체할까요? 현재 자료가 필요하면 먼저 백업을 다운로드해 주세요.')) return;
    setBusy(true);
    try { await applyBackup(preview.parsed); setPreview(null); playSound('save'); toast('백업 파일의 자료로 복원했어요', 'success'); onRestored(); }
    catch (e) { toast(e instanceof Error ? e.message : '복원하지 못했어요', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div className="backup-panel" aria-busy={busy}>
      <div className="backup-heading"><h3>백업</h3><p role="status">{lastText}</p></div>
      <section className="backup-download">
        <div className="backup-symbol" aria-hidden="true"><i className="ph-bold ph-download-simple" /></div>
        <h4>내 자료를 파일로 저장</h4>
        <p>모든 학급의 설정과 기록을 보관해요.</p>
        <button className="backup-primary" disabled={busy} onClick={() => void download()}>백업 다운로드</button>
      </section>
      <section className="backup-restore">
        <h4>백업 파일로 복원</h4>
        <p>파일을 선택하면 복원할 내용을 먼저 확인해요.</p>
        <button className="backup-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>파일 선택</button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void importFile(e.target.files?.[0])} />
        {preview && <div className="backup-preview">
          <strong>{preview.name}</strong>
          <p>학급 {preview.parsed.data.classes.length}개 · 기록 {preview.parsed.data.records.length}건</p>
          <p className="backup-replace-note">현재 모든 학급의 자료를 이 파일 내용으로 교체해요.</p>
          {!!preview.parsed.report?.warnings.length && <ul>{preview.parsed.report.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>}
          <div className="backup-preview-actions">
            <button className="backup-secondary" disabled={busy} onClick={() => setPreview(null)}>취소</button>
            <button className="backup-secondary restore-confirm" disabled={busy} onClick={() => void restore()}>이 파일로 복원</button>
          </div>
        </div>}
      </section>
      <p className="backup-note">자료는 현재 브라우저에 저장돼요.<br />백업 파일에는 학생 정보가 포함돼요.</p>
      <details className="backup-cleanup"><summary>자료 정리</summary>
      <button className="data-btn danger-ghost" onClick={async () => {
        const n = await countRecordsBefore(cutoff);
        if (!n) { toast(`${sy}학년도 이전 기록이 없어요`); return; }
        if (!confirm(`${sy}학년도(${sy}년 3월 1일) 이전의 기록 ${n}일치를 모든 학급에서 지울까요?\n되돌릴 수 없어요. 필요하면 먼저 파일로 저장해 두세요.`)) return;
        await deleteRecordsBefore(cutoff);
        toast(`지난 학년도 기록 ${n}일치를 지웠어요`, 'success');
      }}><span className="da-ico">🗑️</span>지난 학년도 기록 정리 <span className="da-sub">({sy}년 3월 이전 기록)</span></button>
      <button className="data-btn danger-ghost" onClick={async () => {
        if (!confirm('이 기기에 저장된 아침교실 데이터(모든 학급·학생·출결·알레르기·기록)를 지울까요?\n지우면 되돌릴 수 없어요. 필요하면 먼저 파일로 저장해 두세요.')) return;
        if (!confirm('정말 모두 지울까요?')) return;
        await wipeAll();
        location.reload();
      }}><span className="da-ico">🧹</span>이 컴퓨터의 아침교실 자료 모두 지우기 <span className="da-sub">(학년말·컴퓨터 반납 때)</span></button>
      </details>
      <a className="backup-privacy" href="/privacy" target="_blank" rel="noopener noreferrer">개인정보 처리방침</a>
    </div>
  );
}
