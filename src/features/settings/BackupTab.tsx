import { useEffect, useRef, useState } from 'react';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { usePrefs } from '@/core/prefs';
import { useData } from '@/core/data/store';
import { applyBackup, countRecordsBefore, deleteRecordsBefore, downloadBackup, readBackupFile, storageStats } from '@/core/data/backupActions';
import { schoolYearOf } from '@/features/attendance/model';

// 설정 → 백업: 파일로 저장·불러오기, 저장소 현황, 정리하기

export function BackupTab({ classId }: { classId: string }) {
  const lastBackup = usePrefs((s) => s.lastBackup);
  const wipeAll = useData((s) => s.wipeAll);
  const [stats, setStats] = useState<{ records: number; usageKB: number | null } | null>(null);
  const [tick, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { void storageStats(classId).then(setStats); }, [classId, tick]);

  const last = lastBackup ? new Date(lastBackup) : null;
  const sy = schoolYearOf(new Date());
  const cutoff = `${sy}0301`;                                   // 이번 학년도가 시작한 날

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await readBackupFile(file);
      if (!confirm(`지금 자료를 지우고 파일의 자료(학급 ${parsed.data.classes.length}개, 기록 ${parsed.data.records.length}일)로 바꿀까요?`)) return;
      await applyBackup(parsed);
      playSound('save');
      toast(parsed.report?.warnings.length ? `불러오기 완료 ✅ (확인할 점 ${parsed.report.warnings.length}가지: ${parsed.report.warnings[0]})` : '불러오기 완료 ✅', 'success');
      setTick((n) => n + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : '파일을 불러오지 못했어요', 'error');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <h3>💾 백업 <small className="sec-sub">자료를 파일로 저장해 두는 기능이에요</small></h3>
      <div className="bk-lead">아침교실의 기록은 <b>이 컴퓨터(브라우저)</b>에만 저장돼요.<br />가끔 <b>파일로 저장</b>해 두면 기록이 지워져도 다시 살릴 수 있어요.</div>
      <div className="data-stats">
        <div className="dstat"><div className="dstat-num">{stats ? `${stats.records}일` : '…'}</div><div className="dstat-lbl">저장된 기록</div></div>
        <div className="dstat"><div className="dstat-num">{stats?.usageKB != null ? `${stats.usageKB < 1024 ? `${stats.usageKB.toFixed(0)}KB` : `${(stats.usageKB / 1024).toFixed(1)}MB`}` : '-'}</div><div className="dstat-lbl">사용 공간</div></div>
        <div className="dstat"><div className="dstat-num" style={{ fontSize: 14 }}>{last ? `${last.getFullYear()}. ${last.getMonth() + 1}. ${last.getDate()}.` : '아직 없음'}</div><div className="dstat-lbl">마지막으로 저장한 날</div></div>
      </div>
      <div className="bk-steps">
        <button className="bk-card save" onClick={() => { void downloadBackup().then(() => { playSound('save'); toast('백업 완료 📤', 'success'); }); }}>
          <span className="bk-ico">📤</span><b>파일로 저장하기</b><small>내 자료를 파일 하나로 내려받아요</small>
        </button>
        <button className="bk-card load" onClick={() => fileRef.current?.click()}>
          <span className="bk-ico">📥</span><b>저장한 파일 불러오기</b><small>예전에 저장한 파일로 되돌려요 (예전 아침교실 파일도 돼요)</small>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={(e) => void importFile(e.target.files?.[0])} />
      <div className="data-notice">
        <div className="dn-row safe"><span className="dn-ico">✅</span><div><b>자료는 이 컴퓨터에만 있어요</b><br />학생 정보를 서버에 모으거나 저장하지 않아요.</div></div>
        <div className="dn-row warn"><span className="dn-ico">⚠️</span><div><b>브라우저 기록을 지우면 자료도 사라져요</b><br />중요한 기록은 꼭 파일로 저장해 두세요.</div></div>
        <div className="dn-row warn" style={{ gridColumn: '1/-1' }}><span className="dn-ico">🔐</span><div><b>저장한 파일은 안전하게 보관해요</b><br />파일에는 학생 이름·출결·알레르기 정보가 들어 있어요. 공용 컴퓨터나 메신저에 남기지 마세요.</div></div>
      </div>
      <h4 className="data-manage-title">🧹 정리하기</h4>
      <button className="data-btn danger-ghost" onClick={async () => {
        const n = await countRecordsBefore(cutoff);
        if (!n) { toast(`${sy}학년도 이전 기록이 없어요`); return; }
        if (!confirm(`${sy}학년도(${sy}년 3월 1일) 이전의 기록 ${n}일치를 모든 학급에서 지울까요?\n되돌릴 수 없어요. 필요하면 먼저 파일로 저장해 두세요.`)) return;
        await deleteRecordsBefore(cutoff);
        toast(`지난 학년도 기록 ${n}일치를 지웠어요`, 'success');
        setTick((x) => x + 1);
      }}><span className="da-ico">🗑️</span>지난 학년도 기록 정리 <span className="da-sub">({sy}년 3월 이전 기록)</span></button>
      <button className="data-btn danger-ghost" onClick={async () => {
        if (!confirm('이 기기에 저장된 아침교실 데이터(모든 학급·학생·출결·알레르기·기록)를 지울까요?\n지우면 되돌릴 수 없어요. 필요하면 먼저 파일로 저장해 두세요.')) return;
        if (!confirm('정말 모두 지울까요?')) return;
        await wipeAll();
        location.reload();
      }}><span className="da-ico">🧹</span>이 컴퓨터의 아침교실 자료 모두 지우기 <span className="da-sub">(학년말·컴퓨터 반납 때)</span></button>
      <a className="privacy-link" href="./privacy.html" target="_blank" rel="noopener noreferrer">개인정보 처리방침 보기</a>
    </>
  );
}
