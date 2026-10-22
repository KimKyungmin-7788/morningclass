import { useState } from 'react';
import { useKv } from '@/core/data/kv';
import { defaultNotesConfig, type NotesConfig } from '@/core/data/types';
import { PinGate } from './PinGate';
const DEFAULT = defaultNotesConfig();

export function NotesTab() {
  const [config, setConfig, loaded] = useKv('studentNotesConfig', DEFAULT);
  const [pin, setPin] = useState(false);
  if (pin) return <div className="sc-panel"><PinGate change onUnlock={() => setPin(false)} /><button onClick={() => setPin(false)}>돌아가기</button></div>;
  return <section className="sc-panel"><h3>학생 기록</h3><button onClick={() => setPin(true)}>PIN 정하기·바꾸기 / PIN을 잊었어요</button>
    {loaded && (['quick','abcA','abcC'] as const).map((key) => <ChipEditor key={key} label={{ quick: '빠른 문장', abcA: '도전행동 · 선행사건 보기', abcC: '도전행동 · 결과·대응 보기' }[key]} items={config[key]} onChange={(items) => setConfig({ ...config, [key]: items })} />)}
    <p className="sc-hint">바꾸면 바로 저장돼요. PIN은 화면을 잠그며 자료를 암호화하지 않아요.</p>
  </section>;
}
function ChipEditor({ label, items, onChange }: { label: string; items: NotesConfig['quick']; onChange: (items: string[]) => void }) {
  const [text, setText] = useState('');
  return <fieldset><legend>{label}</legend>{items.map((item, i) => <div key={item} className="sc-chip-row"><span>{item}</span><button aria-label={`${item} 위로`} disabled={!i} onClick={() => { const next = [...items]; [next[i-1], next[i]] = [next[i], next[i-1]]; onChange(next); }}>↑</button><button aria-label={`${item} 아래로`} disabled={i === items.length - 1} onClick={() => { const next = [...items]; [next[i+1], next[i]] = [next[i], next[i+1]]; onChange(next); }}>↓</button><button aria-label={`${item} 지우기`} onClick={() => onChange(items.filter((_, n) => n !== i))}>✕</button></div>)}<form onSubmit={(e) => { e.preventDefault(); if (text.trim() && !items.includes(text.trim())) { onChange([...items, text.trim()]); setText(''); } }}><label>{label} 더하기<input value={text} onChange={(e) => setText(e.target.value)} /></label><button disabled={!text.trim() || items.includes(text.trim())}>＋ 더하기</button></form></fieldset>;
}
