import { useEffect, useRef, useState } from 'react';
import { playSound } from '@/core/sound';
import { Popup } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { cardById } from '@/features/registry';
import { firstEmptySlot, isDefaultLayout, placeCard } from './model';
import { startDrag } from './drag';
import { currentPlacement, saveLayout, useLayoutEdit, usePlacement } from './store';

// 화면 꾸미기의 확인 문제(창)와 보관함(진행률 줄 자리에 나오는 서랍).

/** 확인 문제: 카드를 길게 누르면 뜨는 창. 곱셈의 답을 보기에서 고른다 — 맞히면 수정 모드로, 틀리면 닫힌다. */
export function LayoutGate() {
  const gate = useLayoutEdit((s) => s.gate);
  const answerGate = useLayoutEdit((s) => s.answerGate);
  const closeGate = useLayoutEdit((s) => s.closeGate);
  if (!gate) return null;
  const choose = (n: number) => {
    if (answerGate(n)) playSound('correct');
    else { playSound('wrong'); toast('답이 달라요. 다시 길게 눌러 주세요'); }
  };
  return (
    <Popup title="🧩 화면 꾸미기" onClose={closeGate}>
      <div className="lay-gate">
        <div className="lay-gate-hint">문제를 맞히면 카드의 자리를 바꿀 수 있어요</div>
        <div className="lay-gate-q" aria-live="polite">{gate.a} × {gate.b} = ?</div>
        <div className="lay-gate-choices">
          {gate.choices.map((n) => <button key={n} type="button" className="lay-btn num" onClick={() => choose(n)}>{n}</button>)}
        </div>
      </div>
    </Popup>
  );
}

/** 이만큼(px) 움직이면 누르기가 아니라 끌기로 본다 */
const MOVE = 6;

/**
 * 보관함(바구니): 놓이지 않은 카드를 타일로 담아 둔다.
 *  · 타일을 위로 끌어 칸에 넣고, 칸의 카드를 바구니로 끌어오면 담긴다. 타일을 그냥 누르면 첫 빈 칸에 들어간다.
 *  · 카드가 많아 넘치면 바구니 안을 좌우로 끌어 넘긴다 (양옆 화살표로도).
 */
export function LayoutDrawer() {
  const { slots, drawer } = usePlacement();
  const setEditing = useLayoutEdit((s) => s.setEditing);
  const rail = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });

  // 넘치는 쪽에만 화살표를 보인다
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const check = () => setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    check();
    el.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check); };
  }, [drawer.length]);
  const slide = (dir: 1 | -1) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.7, behavior: 'smooth' });

  const put = (card: string, slot: string) => { saveLayout(placeCard(currentPlacement().slots, slot, card)); playSound('select'); };
  const putInFirstEmpty = (card: string) => {
    const empty = firstEmptySlot(currentPlacement().slots);
    if (empty) put(card, empty);
    else toast('빈 칸이 없어요. 바꿀 카드 위로 끌어다 놓아요');
  };

  /**
   * 바구니 안에서 누르기: 옆으로 움직이면 바구니를 넘기고, 위아래로 움직이면 그 타일을 꺼내 끈다.
   * 움직이지 않고 떼면 타일을 첫 빈 칸에 넣는다.
   */
  const railDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button) return;
    const el = rail.current;
    if (!el) return;
    const tile = (e.target as Element).closest<HTMLElement>('.lay-chip');
    const card = tile?.dataset.card;
    const start = { clientX: e.clientX, clientY: e.clientY };
    const from = el.scrollLeft;
    let scrolling = false;
    const stop = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', stop);
      el.classList.remove('grabbing');
    };
    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - start.clientX; const dy = ev.clientY - start.clientY;
      if (!scrolling) {
        if (Math.abs(dx) < MOVE && Math.abs(dy) < MOVE) return;
        if (tile && card && Math.abs(dy) > Math.abs(dx)) {          // 위아래로: 타일을 꺼낸다
          stop();
          startDrag({ start, source: tile, onDrop: (t) => { if (t && 'slot' in t) put(card, t.slot); } });
          return;
        }
        scrolling = true;
        el.classList.add('grabbing');
      }
      el.scrollLeft = from - dx;
    };
    const onUp = () => { stop(); if (!scrolling && card) putInFirstEmpty(card); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', stop);
  };
  const reset = () => {
    if (!confirm('카드 배치를 처음 모습으로 되돌릴까요?')) return;
    saveLayout(null);
    playSound('select');
  };

  return (
    <div className={`lay-drawer${drawer.length ? '' : ' none'}`} data-lay-drawer role="region" aria-label="화면 꾸미기 보관함">
      <div className="lay-basket" aria-hidden="true"><i className="ph-fill ph-basket" />{drawer.length > 0 && <b>{drawer.length}</b>}</div>
      <div className="lay-drawer-title">보관함</div>
      {more.left && <button type="button" className="lay-btn arrow" aria-label="앞쪽 카드 보기" onClick={() => slide(-1)}><i className="ph-bold ph-caret-left" /></button>}
      <div className="lay-chips" ref={rail} onPointerDown={railDown}>
        {drawer.length === 0 && <span className="lay-drawer-hint"><i className="ph-bold ph-arrow-fat-line-down" /> 빼고 싶은 카드를 <b>이 바구니로 끌어다 놓아요.</b> 다시 넣을 때는 바구니에서 꺼내 칸에 놓아요.</span>}
        {drawer.map((id) => {
          const card = cardById(id)!;
          return (
            <button key={id} type="button" className="lay-chip" data-card={id} aria-label={`${card.title} 넣기`}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); putInFirstEmpty(id); } }}>
              <span className="v3-ico" style={{ background: card.tint, color: card.color }}><i className={card.icon} /></span>
              {card.title}
            </button>
          );
        })}
      </div>
      {more.right && <button type="button" className="lay-btn arrow" aria-label="뒤쪽 카드 보기" onClick={() => slide(1)}><i className="ph-bold ph-caret-right" /></button>}
      {!isDefaultLayout(slots) && <button type="button" className="lay-btn" onClick={reset}>↺ 처음 배치로</button>}
      <button type="button" className="lay-btn done" onClick={() => { setEditing(false); playSound('save'); }}>✓ 완료</button>
    </div>
  );
}
