import { create } from 'zustand';

// 화면 위쪽 알림. 화면 낭독기를 위해 같은 문구를 aria-live 영역에도 넣는다.

export type ToastType = '' | 'success' | 'error';

interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

interface ToastState {
  items: ToastItem[];
  last: string;
  push: (msg: string, type: ToastType) => void;
}

let seq = 0;

const useToasts = create<ToastState>((set) => ({
  items: [],
  last: '',
  push: (msg, type) => {
    const id = ++seq;
    set((s) => ({ items: [...s.items, { id, msg, type }], last: msg }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), 2700);
  },
}));

export function toast(msg: string, type: ToastType = ''): void {
  useToasts.getState().push(msg, type);
}

export function ToastHost() {
  const items = useToasts((s) => s.items);
  const last = useToasts((s) => s.last);
  return (
    <>
      <div className="toast-container" id="toasts">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.msg}</div>
        ))}
      </div>
      <div className="sr-only" aria-live="polite">{last}</div>
    </>
  );
}
