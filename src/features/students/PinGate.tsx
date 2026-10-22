import { useEffect, useState } from 'react';
import { checkPin, hasPin, pinWait, recoveryMatches, savePin } from '@/core/data/pin';
import { downloadBackup } from '@/core/data/backupActions';

// 잠금 해제는 각 창 안에서만 유지한다. 이 부품을 다시 열면 반드시 다시 확인한다.
export function PinGate({ onUnlock, change = false }: { onUnlock: () => void; change?: boolean }) {
  const [mode, setMode] = useState<'loading' | 'check' | 'new' | 'confirm' | 'backup'>('loading');
  const [digits, setDigits] = useState('');
  const [first, setFirst] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [wait, setWait] = useState(pinWait());
  useEffect(() => { void hasPin().then((v) => setMode(v ? 'check' : 'new')).catch(() => setMessage('잠금을 읽지 못했어요')); }, []);
  useEffect(() => { const timer = setInterval(() => setWait(pinWait()), 500); return () => clearInterval(timer); }, []);
  const enter = async (value: string) => {
    setDigits(value);
    if (value.length !== 4) return;
    setBusy(true); setMessage('');
    try {
      if (mode === 'check') {
        if (await checkPin(value)) { if (change) setMode('new'); else onUnlock(); }
        else { setWait(pinWait()); setMessage('번호가 맞지 않아요. 다시 입력해 주세요'); }
      } else if (mode === 'new') { setFirst(value); setMode('confirm'); }
      else if (mode === 'confirm') {
        if (first === value) { await savePin(value); setFirst(''); setMode('backup'); }
        else { setMode('new'); setFirst(''); setMessage('두 번호가 달라요. 다시 정해 주세요'); }
      }
    } catch { setMessage('잠금을 확인하지 못했어요. 다시 해 주세요'); }
    finally { setDigits(''); setBusy(false); }
  };
  if (mode === 'loading') return <p role="status">잠금을 확인하고 있어요…</p>;
  if (mode === 'backup') return <div className="sc-panel"><p>PIN을 정했어요. 백업이 없으면 PIN을 되찾을 수 없어요.</p><button onClick={() => void downloadBackup().catch(() => setMessage('백업을 받지 못했어요'))}>지금 백업 받기</button><button onClick={onUnlock}>완료</button><p role="status">{message}</p></div>;
  return <section className="sc-pin">
    <h3>{mode === 'check' ? '선생님 PIN을 입력해 주세요' : mode === 'new' ? 'PIN 네 자리를 정해 주세요' : '같은 PIN을 한 번 더 입력해 주세요'}</h3>
    {mode !== 'check' && <p>백업 파일이 있어야 PIN을 되찾을 수 있어요.</p>}
    <div aria-label={`${digits.length}자리 입력됨`} className="sc-digits">{'●'.repeat(digits.length)}{'○'.repeat(4 - digits.length)}</div>
    <div className="sc-keypad">{['1','2','3','4','5','6','7','8','9','지우기','0','←'].map((x) => <button key={x} disabled={busy || (mode === 'check' && wait > 0)} onClick={() => { if (x === '지우기') setDigits(''); else if (x === '←') setDigits((s) => s.slice(0, -1)); else void enter(digits + x); }}>{x}</button>)}</div>
    <p role="status">{mode === 'check' && wait ? `${wait}초 뒤에 다시 입력해 주세요` : message}</p>
    {mode === 'check' && <label className="sc-file">PIN을 잊었어요<input type="file" accept=".json,application/json" onChange={async (e) => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      try { if (await recoveryMatches(await file.text())) { setMode('new'); setDigits(''); setWait(0); } else setMessage('이 기기의 복구 열쇠가 있는 백업을 골라 주세요'); }
      catch { setMessage('백업 파일을 확인하지 못했어요'); }
    }} /><small>이 기기에서 PIN을 정한 뒤 받은 백업을 골라 주세요. 현재 자료는 바뀌지 않아요.</small></label>}
  </section>;
}
