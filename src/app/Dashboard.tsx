import { useEffect, useRef } from 'react';
import { useCurrentClass } from '@/core/data/store';
import { ensureAudio, playSound } from '@/core/sound';
import { SlotContext } from '@/core/ui/slot';
import { cardById } from '@/features/registry';
import { SLOTS, clearSlot, swapSlots, type SlotDef } from '@/features/layout/model';
import { startDrag } from '@/features/layout/drag';
import { currentPlacement, saveLayout, useLayoutEdit, usePlacement } from '@/features/layout/store';

const COLUMNS: SlotDef['col'][] = [0, 1, 2, 3];
/** 길게 누르기로 치는 시간(ms)과, 그동안 손이 움직여도 되는 거리(px) */
const HOLD_MS = 550;
const HOLD_SLOP = 10;

// 대시보드 4열. 칸의 자리와 크기는 고정이고, 어느 카드가 어느 칸에 놓일지는 학급의 배치표가 정한다.
// 설정에서 '화면 꾸미기 허용'을 켜면 카드를 길게 눌러 수정 모드로 들어간다 (자리 바꾸기 · 빼기 · 넣기).
export function Dashboard() {
  const allowed = useCurrentClass()?.options.layoutEdit === true;
  const { slots } = usePlacement();
  const editing = useLayoutEdit((s) => s.editing);
  const setEditing = useLayoutEdit((s) => s.setEditing);
  /** 길게 누른 손을 뗄 때 따라오는 누르기(click)를 한 번 삼킨다 */
  const swallow = useRef(false);

  // 잠그거나 화면을 떠나면 수정 모드도 끝낸다
  useEffect(() => { if (!allowed) setEditing(false); }, [allowed, setEditing]);
  useEffect(() => () => setEditing(false), [setEditing]);
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditing(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, setEditing]);

  /** 칸의 카드를 끈다: 다른 칸에 놓으면 맞바꾸고, 보관함에 놓으면 뺀다 */
  const dragFrom = (slotEl: HTMLElement, start: { clientX: number; clientY: number }) => {
    const from = slotEl.dataset.slot!;
    const cardEl = slotEl.querySelector<HTMLElement>(':scope > .card');
    if (!cardEl) return;
    startDrag({
      start, source: cardEl, origin: slotEl,
      onDrop: (t) => {
        if (!t) return;
        const now = currentPlacement().slots;
        const next = 'slot' in t ? swapSlots(now, from, t.slot) : clearSlot(now, from);
        if (next !== now) { saveLayout(next); playSound('select'); }
      },
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    swallow.current = false;
    if (e.button || !(editing || allowed)) return;
    const target = e.target as Element;
    const slotEl = target.closest<HTMLElement>('[data-slot]');
    if (!slotEl || target.closest('.lay-x')) return;
    const start = { clientX: e.clientX, clientY: e.clientY };
    if (editing) { dragFrom(slotEl, start); return; }

    // 평소: 움직이지 않고 길게 누르면 수정 모드로 들어가고, 누른 카드를 그대로 끌 수 있다
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };
    const onMove = (ev: PointerEvent) => {
      if (Math.abs(ev.clientX - start.clientX) > HOLD_SLOP || Math.abs(ev.clientY - start.clientY) > HOLD_SLOP) stop();
    };
    const timer = setTimeout(() => {
      stop();
      swallow.current = true;
      ensureAudio();
      playSound('select');
      setEditing(true);
      dragFrom(slotEl, start);
    }, HOLD_MS);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  };

  /** 수정 모드에서는 카드가 열리지 않게 누르기 · 글쇠를 막는다 (빼기 단추만 통과) */
  const guard = (e: React.SyntheticEvent) => {
    if ((e.target as Element).closest('.lay-x')) return;
    e.stopPropagation();
    e.preventDefault();
  };

  const remove = (slot: string) => { saveLayout(clearSlot(currentPlacement().slots, slot)); playSound('select'); };

  return (
    <main
      className={[editing ? 'lay-editing' : '', allowed ? 'lay-can' : ''].filter(Boolean).join(' ') || undefined}
      onPointerDownCapture={onPointerDown}
      onClickCapture={(e) => { if (editing || swallow.current) { swallow.current = false; guard(e); } }}
      onKeyDownCapture={(e) => { if (editing && (e.key === 'Enter' || e.key === ' ')) guard(e); }}
      onContextMenu={(e) => { if (editing || allowed) e.preventDefault(); }}
    >
      {COLUMNS.map((col) => (
        <div className="col" key={col}>
          {SLOTS.filter((s) => s.col === col).map((slot) => {
            const card = cardById(slots[slot.id]);
            return (
              <div key={slot.id} className={`slot${card ? '' : ' empty'}`} data-slot={slot.id} data-size={slot.size} data-w={slot.col === 0 || slot.col === 3 ? 'narrow' : 'wide'}
                style={{ flex: slot.flex, ...(slot.minHeight ? { minHeight: slot.minHeight } : {}) }}>
                {card && (
                  <SlotContext value={slot.size}>
                    <card.Component key={card.id} size={slot.size} />
                  </SlotContext>
                )}
                {editing && card && (
                  <button type="button" className="lay-x" aria-label={`${card.title} 빼기`} onClick={() => remove(slot.id)}>
                    <i className="ph-bold ph-minus" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </main>
  );
}
