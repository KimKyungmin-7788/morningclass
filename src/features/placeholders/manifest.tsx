import { useState } from 'react';
import type { CSSProperties } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import type { CardDef, FeatureManifest } from '../types';

// 1단계 임시 카드: 기존 대시보드와 같은 자리에 빈 카드를 놓아 배치를 맞춘다.
// 기능을 옮길 때마다 여기서 한 줄씩 빼고 그 기능 폴더의 manifest 로 옮긴다.

interface Slot {
  id: string; col: CardDef['col']; order: number; title: string;
  icon: string; tint: string; color: string; step: number; style?: CSSProperties;
}

const SMALL: CSSProperties = { flex: '0 0 auto', minHeight: 170 };
const SIDE: CSSProperties = { flex: 1.1, minHeight: 160 };

const SLOTS: Slot[] = [
  { id: 'attendance', col: 0, order: 3, title: '오늘의 출석', icon: 'ph-fill ph-hand-waving', tint: '#ffedd5', color: '#ea580c', step: 4 },
  { id: 'timetable', col: 1, order: 1, title: '오늘의 시간표', icon: 'ph-fill ph-calendar-check', tint: '#e0e7ff', color: '#4f46e5', step: 5 },
  { id: 'dday', col: 1, order: 2, title: 'D-DAY', icon: 'ph-fill ph-flag-pennant', tint: '#e0e7ff', color: '#4f46e5', step: 3, style: SMALL },
  { id: 'emotions', col: 2, order: 1, title: '우리반 감정', icon: 'ph-fill ph-smiley', tint: '#fce7f3', color: '#db2777', step: 6 },
  { id: 'helper', col: 2, order: 2, title: '오늘의 도우미', icon: 'ph-duotone ph-dice-five', tint: '#ede9fe', color: '#7c3aed', step: 4, style: SMALL },
  { id: 'meal', col: 3, order: 1, title: '오늘의 급식', icon: 'ph-fill ph-bowl-food', tint: '#ffedd5', color: '#ea580c', step: 7, style: SIDE },
  { id: 'notes', col: 3, order: 2, title: '오늘의 유의사항', icon: 'ph-fill ph-megaphone', tint: '#fee2e2', color: '#dc2626', step: 3, style: SIDE },
  { id: 'tools', col: 3, order: 3, title: '수업 도구', icon: 'ph-fill ph-timer', tint: '#e0f2fe', color: '#0284c7', step: 3, style: SIDE },
  { id: 'book', col: 3, order: 4, title: '영상 재생', icon: 'ph-fill ph-play-circle', tint: '#e0f2fe', color: '#0284c7', step: 3, style: { flex: '0 0 90px', minHeight: 90, padding: 10 } },
];

function PlaceholderCard({ slot }: { slot: Slot }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CardFrame id={slot.id} label={slot.title} style={slot.style}
        onOpen={() => { ensureAudio(); playSound('select'); setOpen(true); }}>
        <CardTitle icon={slot.icon} tint={slot.tint} color={slot.color}>{slot.title}</CardTitle>
        <div className="card-hint" style={{ fontSize: 15 }}>{slot.step}단계에서 옮겨요</div>
      </CardFrame>
      {open && (
        <Popup title={slot.title} onClose={() => setOpen(false)}>
          <p style={{ lineHeight: 1.6 }}>
            이 기능은 아직 새 틀로 옮기지 않았어요. 아래 버튼으로 공용 부품(알림·소리·음성)이 동작하는지 확인할 수 있어요.
          </p>
          <PopupActions>
            <button className="btn-cancel" onClick={() => { playSound('complete'); toast('알림이 잘 보여요', 'success'); }}>알림 + 소리</button>
            <button className="btn-save" onClick={() => speak(`${slot.title} 기능은 ${slot.step}단계에서 옮겨요.`)}>음성 안내</button>
          </PopupActions>
        </Popup>
      )}
    </>
  );
}

const manifest: FeatureManifest = {
  id: 'placeholders',
  cards: SLOTS.map((slot) => ({
    id: slot.id, col: slot.col, order: slot.order,
    Component: () => <PlaceholderCard slot={slot} />,
  })),
};

export default manifest;
