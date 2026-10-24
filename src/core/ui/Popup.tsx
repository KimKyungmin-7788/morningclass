import { useEffect, useId, useRef, useState, type ReactNode, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useWindowDocument } from './WindowDocument';

// 공용 창. 기능은 <Popup> 을 조건부로 그리고, 닫기는 onClose 로 받는다.
// 바깥 누르기·Esc·✕ 로 닫히고, 닫힐 때 열기 전 초점으로 돌아간다.

interface PopupProps {
  title: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClose: () => void;
  /** 넓은 창 (전자칠판 전체 화면용 기능) */
  large?: boolean;
  /** 자동 저장 창은 닫기 전에 저장을 마친다. 실패하면 창을 그대로 둔다. */
  beforeClose?: () => Promise<boolean>;
  /** 제목 줄 오른쪽에 둘 버튼 (예: 급식 보기 방식) */
  headerExtra?: ReactNode;
  children: ReactNode;
}

const CLOSE_MS = 180;

export function Popup({ title, onClose, large, headerExtra, children, beforeClose, className = '', style }: PopupProps) {
  const doc = useWindowDocument();
  const host = doc.defaultView ?? window;
  const titleId = useId();
  const [closing, setClosing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const beforeCloseRef = useRef(beforeClose);
  beforeCloseRef.current = beforeClose;
  const savingClose = useRef(false);
  const close = useRef(async () => {
    if (savingClose.current) return;
    savingClose.current = true;
    try {
      if (beforeCloseRef.current && !(await beforeCloseRef.current())) return;
      setClosing(true);
      setTimeout(() => onCloseRef.current(), CLOSE_MS); // 닫히는 움직임이 끝난 뒤 실제로 닫음
    } finally { savingClose.current = false; }
  }).current;

  useEffect(() => {
    const prevFocus = doc.activeElement as HTMLElement | null;
    const prevOverflow = doc.body.style.overflow;
    doc.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      bodyRef.current?.querySelector<HTMLElement>('button, input, textarea, select')?.focus();
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) close();
    };
    host.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      host.removeEventListener('keydown', onKey);
      doc.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [close, doc, host]);

  return createPortal(
    <div
      className={`popup-overlay active${closing ? ' closing' : ''}`}
      role="dialog"
      aria-modal={className === 'student-folder' ? false : true}
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className={`popup-card${large ? ' large' : ''} ${className}`} style={style} id="popup-card">
        <div className="popup-header">
          <h2 className="popup-title" id={titleId}>{title}</h2>
          <div id="popup-extra">{headerExtra}</div>
          <button className="popup-close" aria-label="닫기" onClick={close}>✕</button>
        </div>
        <div id="popup-body" ref={bodyRef}>{children}</div>
      </div>
    </div>,
    doc.body,
  );
}

/** 창 아래 버튼 줄 (취소 · 완료 등) */
export function PopupActions({ children }: { children: ReactNode }) {
  return <div className="popup-actions">{children}</div>;
}
