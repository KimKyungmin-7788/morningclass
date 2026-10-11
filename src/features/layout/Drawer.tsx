import { playSound } from '@/core/sound';
import { toast } from '@/core/ui/toast';
import { cardById } from '@/features/registry';
import { firstEmptySlot, isDefaultLayout, placeCard } from './model';
import { startDrag } from './drag';
import { currentPlacement, saveLayout, useLayoutEdit, usePlacement } from './store';

// 화면 꾸미기 서랍: 수정 모드일 때 진행률 줄 자리에 나온다.
// 놓이지 않은 카드(보관함)를 보여 주고, 끌거나 눌러서 칸에 넣는다. 카드를 여기로 끌어오면 보관함에 들어온다.
export function LayoutDrawer() {
  const { slots, drawer } = usePlacement();
  const setEditing = useLayoutEdit((s) => s.setEditing);

  const put = (card: string, slot: string) => { saveLayout(placeCard(currentPlacement().slots, slot, card)); playSound('select'); };
  const chipDown = (card: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button) return;
    startDrag({
      start: e.nativeEvent,
      source: e.currentTarget,
      onDrop: (t) => { if (t && 'slot' in t) put(card, t.slot); },
      onTap: () => {
        const empty = firstEmptySlot(currentPlacement().slots);
        if (empty) put(card, empty);
        else toast('빈 칸이 없어요. 바꿀 카드 위로 끌어다 놓아요');
      },
    });
  };
  const reset = () => {
    if (!confirm('카드 배치를 처음 모습으로 되돌릴까요?')) return;
    saveLayout(null);
    playSound('select');
  };

  return (
    <div className="lay-drawer" data-lay-drawer role="region" aria-label="화면 꾸미기">
      <div className="lay-drawer-title"><i className="ph-fill ph-squares-four" /> 보관함</div>
      <div className="lay-chips">
        {drawer.length === 0 && <span className="lay-drawer-hint">카드를 끌어 자리를 바꿔요. 여기로 끌어오거나 <b>−</b> 를 누르면 화면에서 빠져요.</span>}
        {drawer.map((id) => {
          const card = cardById(id)!;
          return (
            <button key={id} type="button" className="lay-chip" onPointerDown={chipDown(id)} aria-label={`${card.title} 넣기`}>
              <span className="v3-ico" style={{ background: card.tint, color: card.color }}><i className={card.icon} /></span>
              {card.title}
            </button>
          );
        })}
      </div>
      {!isDefaultLayout(slots) && <button type="button" className="lay-btn" onClick={reset}>↺ 처음 배치로</button>}
      <button type="button" className="lay-btn done" onClick={() => { setEditing(false); playSound('save'); }}>✓ 완료</button>
    </div>
  );
}
