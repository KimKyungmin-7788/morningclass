import { useState } from 'react';

const students = [
  { id: 'demo-learner-A', label: '김민준 · 1번', icon: '🐻' },
  { id: 'demo-learner-B', label: '김민준 · 2번', icon: '🐰' },
];
/** 실제 학생 저장소와 분리된 QR 접속·결과 귀속 시안. */
export function StudentConnectionPreview() {
  const [selected, setSelected] = useState(students[0]);
  const [phase, setPhase] = useState<'qr' | 'activity' | 'receipt'>('qr');
  const [records, setRecords] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  return <div className="ea-student-demo">
    <button className="ea-primary" aria-expanded={open} onClick={() => setOpen(!open)}>학생별 QR → 포트폴리오 체험 {open ? '접기' : '열기'}</button>
    {open && <>
      <h4>이름은 같아도, 결과는 각자의 학생 카드로</h4>
      <p className="ea-hint">가상 학생 2명이에요. QR 촬영·서버 저장 없이 이 화면에서만 체험해요.</p>
      <div className="ea-student-picks" aria-label="QR을 받을 가상 학생">
        {students.map(student => <button key={student.id} aria-pressed={selected.id === student.id} onClick={() => { setSelected(student); setPhase('qr'); }}>
          <span>{student.icon} {student.label}</span><small>{student.id}</small>
        </button>)}
      </div>
      <ol className="ea-steps" aria-label="학생 접속 단계">{['학생별 QR', '태블릿 활동', '학생별 수신'].map((text, i) => <li key={text} aria-current={['qr', 'activity', 'receipt'][i] === phase ? 'step' : undefined}>{i + 1} {text}</li>)}</ol>
      <div className="ea-student-stage">
        {phase === 'qr' && <>
          <div className="ea-qr-placeholder"><i className="ph-bold ph-qr-code" aria-hidden="true"/><small>QR 자리 표시<br/>촬영할 수 없는 시안</small></div>
          <div><strong>{selected.icon} {selected.label} 전용 접속</strong><p>차근차근 수 세기 · 1~10 개수 세기</p><p className="ea-hint">실제 QR에는 이름 대신 일회용 접속 코드가 담겨요.</p><button className="ea-primary" onClick={() => setPhase('activity')}>태블릿으로 접속 체험 →</button></div>
        </>}
        {phase === 'activity' && <div className="ea-tablet-preview">
          <span className="ea-preview-badge">학생 태블릿 · 예시</span>
          <h4>{selected.icon} {selected.label}의 활동</h4><p>가을 열매를 세어요</p><div className="ea-counting-fruit" aria-hidden="true">🍎 🍎 🍎</div>
          <p>활동 완료 예시 · 10문항 중 8문항 · 그림 단서 사용</p>
          <button className="ea-primary" onClick={() => { setRecords(previous => ({ ...previous, [selected.id]: (previous[selected.id] ?? 0) + 1 })); setPhase('receipt'); }}>활동 마치고 전송 체험</button>
          <button onClick={() => setPhase('qr')}>내 이름이 아니에요</button>
        </div>}
        {phase === 'receipt' && <div role="status"><span className="ea-preview-badge">수신 완료 예시</span><h4>{selected.label}의 포트폴리오에 도착했어요</h4><p>차근차근 수 세기 · 8 / 10 · 그림 단서 사용</p><code>{selected.id}</code><p className="ea-hint">화면 안의 가상 기록만 추가했어요. 실제 학생 카드에는 저장하지 않아요.</p><button onClick={() => setPhase('qr')}>다음 활동 체험</button></div>}
      </div>
      <div className="ea-student-receipts" aria-label="교사 화면 학생별 수신 예시">
        {students.map(student => <article key={student.id}><strong>{student.icon} {student.label}</strong><small>{student.id}</small><b>{records[student.id] ?? 0}건</b><span>{records[student.id] ? '수 세기 · 최근 결과 8 / 10' : '아직 받은 결과가 없어요'}</span></article>)}
      </div>
      <p className="ea-hint">교사 화면 예시 · 두 학생을 번갈아 체험하면 같은 이름이어도 결과가 따로 쌓여요. 메뉴를 나가면 초기화돼요.</p>
    </>}
  </div>;
}
