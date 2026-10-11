// 카드 끌기 (손가락 · 펜 · 마우스 공통, 시간표의 과목 끌기와 같은 방식).
// 끄는 동안 원본을 복사한 그림자가 따라다니고, 놓은 자리의 칸 또는 보관함을 알려 준다.

export type DropTarget = { slot: string } | { drawer: true } | null;

interface DragOptions {
  /** 누르기 시작한 자리 */
  start: { clientX: number; clientY: number };
  /** 그림자로 복사할 것 */
  source: HTMLElement;
  /** 끄는 동안 흐리게 둘 것 (없으면 source) */
  origin?: HTMLElement;
  onDrop: (target: DropTarget) => void;
  /** 끌지 않고 뗐을 때 */
  onTap?: () => void;
}

const MOVE = 6;

function targetAt(x: number, y: number): { el: HTMLElement; target: DropTarget } | null {
  const hit = document.elementFromPoint(x, y);
  const slot = hit?.closest<HTMLElement>('[data-slot]');
  if (slot?.dataset.slot) return { el: slot, target: { slot: slot.dataset.slot } };
  const drawer = hit?.closest<HTMLElement>('[data-lay-drawer]');
  return drawer ? { el: drawer, target: { drawer: true } } : null;
}

export function startDrag({ start, source, origin = source, onDrop, onTap }: DragOptions): void {
  const rect = source.getBoundingClientRect();
  let ghost: HTMLElement | null = null;
  let over: HTMLElement | null = null;
  const setOver = (el: HTMLElement | null) => {
    if (over === el) return;
    over?.classList.remove('lay-over');
    over = el;
    over?.classList.add('lay-over');
  };
  const finish = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    ghost?.remove();
    origin.classList.remove('lay-dragging');
    setOver(null);
  };
  function onMove(ev: PointerEvent) {
    const dx = ev.clientX - start.clientX; const dy = ev.clientY - start.clientY;
    if (!ghost) {
      if (Math.abs(dx) < MOVE && Math.abs(dy) < MOVE) return;
      ghost = source.cloneNode(true) as HTMLElement;
      ghost.classList.add('lay-ghost');
      ghost.removeAttribute('id');
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      document.body.appendChild(ghost);
      origin.classList.add('lay-dragging');
    }
    ghost.style.left = `${rect.left + dx}px`;
    ghost.style.top = `${rect.top + dy}px`;
    const t = targetAt(ev.clientX, ev.clientY);
    setOver(t && t.el !== origin ? t.el : null);
  }
  function onUp(ev: PointerEvent) {
    const dragged = !!ghost;
    finish();
    if (dragged) onDrop(targetAt(ev.clientX, ev.clientY)?.target ?? null);
    else onTap?.();
  }
  function onCancel() { finish(); }
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);
}
