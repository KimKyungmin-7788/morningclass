import { useEffect, useRef, useState } from 'react';
import { Popup } from '@/core/ui/Popup';
import { SlotContext } from '@/core/ui/slot';
import { ensureAudio, playSound } from '@/core/sound';
import { cardById } from '@/features/registry';
import { usePlacement } from './store';

// 바구니(보관함)에 담긴 카드: 진행률 줄 왼쪽에 이름만 글자로 늘어놓는다.
// 화면에 꺼내 놓지 않아도 이름을 누르면 창으로 열어 그대로 쓸 수 있다.

/**
 * 창 안에 카드를 큰 칸 모습으로 그린다. 누르면 창이 열리는 카드는 그 창까지 바로 열어 준다 —
 * 그때는 카드를 담은 바깥 창을 감추고, 카드의 창을 닫으면 바깥 창도 함께 닫는다 (창이 두 겹으로 보이지 않게).
 */
function DockCard({ id, onDone }: { id: string; onDone: () => void }) {
  const card = cardById(id)!;
  const box = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    let obs: MutationObserver | null = null;
    const t = setTimeout(() => {
      const outer = box.current?.closest<HTMLElement>('.popup-overlay');
      const count = () => document.querySelectorAll('.popup-overlay').length;
      const before = count();
      box.current?.querySelector<HTMLElement>(':scope > .card.touchable')?.click();
      requestAnimationFrame(() => {
        if (!outer || count() <= before) return;                  // 카드가 창을 열지 않았다 — 바깥 창을 그대로 쓴다
        outer.classList.add('dock-under');
        obs = new MutationObserver(() => { if (count() <= before) { obs?.disconnect(); onDoneRef.current(); } });
        obs.observe(document.body, { childList: true });
      });
    }, 250);
    return () => { clearTimeout(t); obs?.disconnect(); };
  }, []);
  return (
    <div className="slot dock-slot" data-size="large" data-w="wide" ref={box}>
      <SlotContext value="large"><card.Component size="large" /></SlotContext>
    </div>
  );
}

export function DockCards() {
  const { drawer } = usePlacement();
  const [open, setOpen] = useState<string | null>(null);
  const cards = drawer.map((id) => cardById(id)).filter((c) => !!c);
  const shown = open && drawer.includes(open) ? cardById(open) : undefined;
  if (!cards.length) return null;
  return (
    <>
      <nav className="dock" aria-label="바구니에 담긴 카드">
        <i className="ph-fill ph-basket" aria-hidden="true" />
        <div>
          {cards.map((c) => <button key={c.id} type="button" title={`${c.title} 열기`} onClick={() => { ensureAudio(); playSound('select'); setOpen(c.id); }}>{c.title}</button>)}
        </div>
      </nav>
      {shown && (
        <Popup title={<><i className={shown.icon} style={{ color: shown.color, marginRight: 8 }} />{shown.title}</>} large onClose={() => setOpen(null)}>
          <DockCard key={shown.id} id={shown.id} onDone={() => setOpen(null)} />
        </Popup>
      )}
    </>
  );
}
