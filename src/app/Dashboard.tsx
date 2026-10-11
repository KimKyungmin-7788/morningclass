import { useMemo } from 'react';
import { useCurrentClass } from '@/core/data/store';
import { SlotContext, type SlotInfo } from '@/core/ui/slot';
import { CARD_IDS, cardById } from '@/features/registry';
import { SLOTS, resolveLayout, type SlotDef } from '@/features/layout/model';

const COLUMNS: SlotDef['col'][] = [0, 1, 2, 3];

const slotInfo = (slot: SlotDef): SlotInfo => ({
  size: slot.size,
  style: { flex: slot.flex, ...(slot.minHeight ? { minHeight: slot.minHeight } : {}) },
});
const SLOT_INFO: Record<string, SlotInfo> = Object.fromEntries(SLOTS.map((s) => [s.id, slotInfo(s)]));

// 대시보드 4열. 칸의 자리와 크기는 고정이고, 어느 카드가 어느 칸에 놓일지는 학급의 배치표가 정한다.
export function Dashboard() {
  const saved = useCurrentClass()?.options.layout;
  const { slots } = useMemo(() => resolveLayout(saved, CARD_IDS), [saved]);
  return (
    <main>
      {COLUMNS.map((col) => (
        <div className="col" key={col}>
          {SLOTS.filter((s) => s.col === col).map((slot) => {
            const info = SLOT_INFO[slot.id];
            const card = cardById(slots[slot.id]);
            if (!card) return <div key={slot.id} className="slot-empty" style={info.style} aria-hidden="true" />;
            return (
              <SlotContext value={info} key={slot.id}>
                <card.Component size={slot.size} />
              </SlotContext>
            );
          })}
        </div>
      ))}
    </main>
  );
}
