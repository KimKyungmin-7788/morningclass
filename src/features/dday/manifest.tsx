import { useRef, useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { newId } from '@/core/data/types';
import type { FeatureManifest } from '../types';
import { ddayDiff, ddayLabel, ddaySorted, fmtDdayDate, type DdayItem } from './model';

// D-DAY: 학급별 목록. 날짜와 무관하게 항상 보이고, 지울 때까지 남는다.

function Row({ it, base, onDelete }: { it: DdayItem; base: Date; onDelete?: () => void }) {
  const diff = ddayDiff(it.date, base);
  return (
    <div className="dday-row">
      <span className={`dday-badge ${diff === 0 ? 'today' : diff < 0 ? 'past' : ''}`}>{ddayLabel(diff)}</span>
      <span className="dday-name">{it.name}</span>
      <span className="dday-date">{fmtDdayDate(it.date)}</span>
      {onDelete && <button className="dday-del" title="삭제" aria-label={`${it.name} 삭제`} onClick={onDelete}>✕</button>}
    </div>
  );
}

function DdayCard() {
  const classId = useData((s) => s.currentClassId);
  const base = useDay((s) => s.date);
  const [items, setItems] = useKv<DdayItem[]>(`ddays:${classId}`, []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const pad = (n: number) => String(n).padStart(2, '0');
  const [date, setDate] = useState(`${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`);
  const nameRef = useRef<HTMLInputElement>(null);
  const list = ddaySorted(items, base);

  const add = () => {
    if (!name.trim()) { toast('이름을 입력해 주세요', 'error'); return; }
    if (!date) { toast('날짜를 선택해 주세요', 'error'); return; }
    setItems([...items, { id: newId('d'), name: name.trim(), date }]);
    playSound('save');
    toast('D-DAY 추가!', 'success');
    setName('');
    nameRef.current?.focus();
  };

  return (
    <>
      <CardFrame id="dday" label="디데이" state={list.length ? 'filled' : 'empty'} style={{ flex: '0 0 auto', minHeight: 170 }}
        onOpen={() => { ensureAudio(); playSound('select'); setOpen(true); }}>
        <CardTitle icon="ph-fill ph-flag-banner" tint="#e0e7ff" color="#4f46e5">D-DAY</CardTitle>
        {list.length
          ? <div className="dday-list">{list.map((it) => <Row key={it.id} it={it} base={base} />)}</div>
          : <div className="card-hint" style={{ fontSize: 15 }}>터치해서 기념일·시험 D-DAY를 추가해요 👆</div>}
      </CardFrame>
      {open && (
        <Popup title="🚩 D-DAY 관리" onClose={() => setOpen(false)}>
          <div className="dday-add">
            <input ref={nameRef} type="text" className="name" placeholder="예) 현장체험학습, 중간고사" maxLength={20} value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }} />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="날짜" />
            <button onClick={add}>➕ 추가</button>
          </div>
          <div className="dday-list dday-list-manage">
            {list.length
              ? list.map((it) => <Row key={it.id} it={it} base={base} onDelete={() => { setItems(items.filter((x) => x.id !== it.id)); playSound('select'); }} />)
              : <div className="card-hint" style={{ padding: 24 }}>아직 등록한 D-DAY가 없어요 📭</div>}
          </div>
        </Popup>
      )}
    </>
  );
}

const manifest: FeatureManifest = { id: 'dday', cards: [{ id: 'dday', col: 1, order: 2, Component: DdayCard }] };
export default manifest;
