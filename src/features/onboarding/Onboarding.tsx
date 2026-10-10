import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popup } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { usePrefs } from '@/core/prefs';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { dateKeyOf } from '@/core/data/day';
import { addNames } from '@/core/data/roster';
import { downloadBackup, storageStats } from '@/core/data/backupActions';

// 첫 접속 흐름: 학급이 여러 개면 학급 선택, 학생이 없으면 환영 창. 그리고 백업 알림.

/** 체험학급: 이름은 체험학교지만 급식은 실제 학교(강원 K10 / 7801212)의 것을 불러온다 */
const DEMO = { schoolName: '체험학교', className: '4학년 1반', level: 'elem' as const, students: ['김안목', '김강문', '김경포', '김순긋', '김사천'], neis: { atptCode: 'K10', schoolCode: '7801212' } };

export function ClassPicker({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const { classes, currentClassId, setCurrentClass, addClass } = useData();
  return (
    <Popup title="🏫 학급 선택" onClose={onClose}>
      <div className="hint" style={{ marginBottom: 14 }}>사용할 학급을 선택하세요</div>
      <div className="class-pick-list">
        {classes.map((c) => (
          <button key={c.id} className={`class-pick-btn${c.id === currentClassId ? ' current' : ''}`} onClick={() => { void setCurrentClass(c.id); playSound('select'); onClose(); }}>
            <span className="cp-name">{c.className || '이름 없는 학급'}</span><span className="cp-school">{c.schoolName || '학교 미설정'}</span>
          </button>
        ))}
        <button className="class-pick-btn add" onClick={() => { void addClass().then(onAdd); }}>
          <span className="cp-name">＋ 새 학급 추가</span><span className="cp-school">학생·시간표를 새로 등록해요</span>
        </button>
      </div>
    </Popup>
  );
}

export function Welcome({ onClose, onMine }: { onClose: () => void; onMine: () => void }) {
  const cls = useCurrentClass();
  const { saveClass, addClass } = useData();
  const startDemo = async () => {
    const preset = { schoolName: DEMO.schoolName, className: DEMO.className, level: DEMO.level, neis: { ...DEMO.neis }, students: addNames([], DEMO.students) };
    // 학생이 없는 지금 학급이면 그 자리에 채우고, 아니면 새 학급으로 추가한다
    if (cls && !activeStudents(cls).length) await saveClass({ ...cls, ...preset });
    else await addClass(preset);
    playSound('select');
    toast(`🧭 체험학급(${DEMO.schoolName} ${DEMO.className})으로 시작해요`, 'success');
    onClose();
  };
  return (
    <Popup title="🌅 환영합니다!" onClose={onClose}>
      <div className="welcome">
        <h2>아침교실에 오신 것을 환영해요!</h2>
        <p>어떻게 시작할까요?</p>
        <div className="wl-choices">
          <button className="wl-card" onClick={onMine}><span className="wl-ico">🏫</span><b>내 학급 만들기</b><small>학교·학급·학생을<br />직접 등록해요</small></button>
          <button className="wl-card demo" onClick={() => void startDemo()}><span className="wl-ico">🧭</span><b>체험학급으로 둘러보기</b><small>{DEMO.schoolName} {DEMO.className} · 학생 {DEMO.students.length}명<br />바로 써 볼 수 있어요</small></button>
        </div>
        <div className="wl-note">체험학급은 나중에 ⚙️ 설정에서 학급을 추가한 뒤 삭제할 수 있어요.</div>
      </div>
    </Popup>
  );
}

/** 기록이 있는데 7일 넘게 백업하지 않았으면 화면 아래에 알린다. '나중에'를 누르면 그날은 다시 묻지 않는다 */
export function BackupReminder() {
  const cls = useCurrentClass();
  const { lastBackup, backupSnooze, set } = usePrefs();
  const [show, setShow] = useState(false);
  const today = dateKeyOf(new Date());
  const days = lastBackup ? (Date.now() - new Date(lastBackup).getTime()) / 86400000 : Infinity;
  const hasStudents = activeStudents(cls).length > 0;

  useEffect(() => {
    if (!cls || !hasStudents || backupSnooze === today || days < 7) { setShow(false); return; }
    let alive = true;
    void storageStats(cls.id).then((s) => { if (alive) setShow(s.allRecords >= 1); });
    return () => { alive = false; };
  }, [cls, hasStudents, backupSnooze, today, days]);

  if (!show) return null;
  return createPortal(
    <div className="backup-reminder" role="status">
      <span className="br-ico">💾</span>
      <div className="br-text"><b>기록을 파일로 저장해 두세요</b><br /><span className="br-sub">{lastBackup ? `${Math.floor(days)}일째 백업을 안 했어요` : '아직 파일 백업을 한 번도 안 했어요'}. 브라우저 데이터가 지워지면 복구할 수 없어요.</span></div>
      <button className="br-backup" onClick={() => { void downloadBackup().then(() => toast('백업 완료 📤', 'success')); }}>📤 백업하기</button>
      <button className="br-later" onClick={() => set({ backupSnooze: today })}>나중에</button>
    </div>,
    document.body,
  );
}
