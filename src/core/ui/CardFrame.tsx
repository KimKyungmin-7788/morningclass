import type { CSSProperties, ReactNode } from 'react';

// 대시보드 카드의 겉모양. 상태(비어 있음/채워짐)와 누르기 동작만 맡고, 내용은 기능이 채운다.

interface CardFrameProps {
  id: string;
  label: string;
  state?: 'empty' | 'filled' | 'plain';
  onOpen?: () => void;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function CardFrame({ id, label, state = 'empty', onOpen, className = '', style, children }: CardFrameProps) {
  const cls = ['card', onOpen ? 'touchable' : '', state === 'plain' ? '' : state, className].filter(Boolean).join(' ');
  return (
    <div
      className={cls}
      id={`card-${id}`}
      aria-label={label}
      style={style}
      {...(onOpen
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: onOpen,
            onKeyDown: (e) => {
              if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) {
                e.preventDefault();
                onOpen();
              }
            },
          }
        : {})}
    >
      {children}
    </div>
  );
}

/** 카드 제목 줄: 동그란 아이콘 + 제목 (+ 오른쪽에 둘 것) */
export function CardTitle({ icon, tint, color, children, extra }: {
  icon: string; tint: string; color: string; children: ReactNode; extra?: ReactNode;
}) {
  return (
    <div className="v3-title">
      <span className="v3-ico" style={{ background: tint, color }}><i className={icon} /></span>
      {children}
      {extra}
    </div>
  );
}
