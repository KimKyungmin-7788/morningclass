import { useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { useDay } from '@/core/data/day';
import type { FeatureManifest } from '../types';

// 오늘의 유의사항: 선생님이 적어 두는 그날의 전달 사항
function NotesCard() {
  const notes = useDay((s) => s.record.notes);
  const update = useDay((s) => s.update);
  const [draft, setDraft] = useState<string | null>(null);   // null = 창이 닫혀 있음

  const save = () => {
    const text = (draft ?? '').trim();
    update((r) => { r.notes = text; });
    playSound('save');
    toast('유의사항 저장!', 'success');
    setDraft(null);
  };

  return (
    <>
      <CardFrame id="notes" label="유의사항" state={notes ? 'filled' : 'empty'} style={{ flex: 1.1, minHeight: 160 }}
        onOpen={() => { ensureAudio(); setDraft(notes); }}>
        <CardTitle icon="ph-fill ph-megaphone" tint="#fce7f3" color="#db2777"
          extra={notes ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 유의사항</CardTitle>
        {notes ? <div className="notes-display">{notes}</div> : <div className="card-hint">✏️ 터치해서 선생님이 입력해요</div>}
      </CardFrame>
      {draft !== null && (
        <Popup title="📢 오늘의 유의사항" onClose={() => setDraft(null)}>
          <textarea className="notes-textarea" placeholder="오늘 학생들에게 전달할 내용을 입력하세요" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <PopupActions>
            <button className="btn-cancel" onClick={() => setDraft(null)}>취소</button>
            <button className="btn-save" onClick={save}>💾 저장</button>
          </PopupActions>
        </Popup>
      )}
    </>
  );
}

const manifest: FeatureManifest = { id: 'notes', cards: [{ id: 'notes', col: 3, order: 2, Component: NotesCard }] };
export default manifest;
