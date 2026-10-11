import type { ReactNode } from 'react';

// 판서 화면의 선 그림 아이콘. 색은 글자색(currentColor)을 따른다.

const line = (children: ReactNode) => (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);
const ring = (dash?: string, width = 2.2) => (size: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeDasharray={dash} /></svg>
);

const ICONS: Record<string, (size: number) => ReactNode> = {
  select: line(<path d="M5 3l7 18 2.5-7L21 11.5 5 3z" />),
  hand: line(<>
    <path d="M8 11V5.5a1.5 1.5 0 0 1 3 0V10" /><path d="M11 10V4.5a1.5 1.5 0 0 1 3 0V10" /><path d="M14 10V5.5a1.5 1.5 0 0 1 3 0V12" />
    <path d="M8 11v-1a1.5 1.5 0 0 0-3 0v3.5c0 3.6 2.4 6.5 6 6.5s6-2.4 6-6.5V11" />
  </>),
  pen: line(<><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /><path d="M14.5 5.5l3 3" /></>),
  highlighter: line(<><path d="M5 17l3 3 9.5-9.5-3-3L5 17z" /><path d="M14.5 7.5l2-2a1.8 1.8 0 0 1 2.6 0l.4.4a1.8 1.8 0 0 1 0 2.6l-2 2" /><path d="M5 17l-1.5 4 4-1.5" /></>),
  eraser: line(<><path d="M8 20H4l9.5-9.5a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L15 20H8z" /><path d="M8 20l-3-3" /></>),
  undo: line(<><path d="M9 7L4 12l5 5" /><path d="M4 12h11a5 5 0 0 1 0 10h-2" /></>),
  redo: line(<><path d="M15 7l5 5-5 5" /><path d="M20 12H9a5 5 0 0 0 0 10h2" /></>),
  trash: line(<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M5 7l1 13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-13" /><path d="M9 7V4h6v3" /></>),
  'chevron-left': line(<path d="M15 6l-6 6 6 6" />),
  'chevron-right': line(<path d="M9 6l6 6-6 6" />),
  close: line(<path d="M6 6l12 12M18 6L6 18" />),
  background: line(<><rect x="4" y="4" width="16" height="16" rx="2.5" /><path d="M4 9.5h16M4 14.5h16" /><path d="M9.5 4v16M14.5 4v16" opacity={0.55} /></>),
  // 칸 나누기: 가운데 선을 사이에 둔 두 사람
  split: line(<>
    <path d="M12 3v18" strokeDasharray="2.5 3" />
    <circle cx="6" cy="8.5" r="2.3" /><path d="M2.2 18.5c0-2.6 1.6-4.3 3.8-4.3s3.3 1.2 3.6 3" />
    <circle cx="18" cy="8.5" r="2.3" /><path d="M21.8 18.5c0-2.6-1.6-4.3-3.8-4.3s-3.3 1.2-3.6 3" />
  </>),
  image: line(<><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><circle cx="9" cy="10" r="1.6" /><path d="M4 17l4.5-4.5 3.5 3.5 2.5-2.5L20 19" /></>),
  copy: line(<><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></>),
  cut: line(<><circle cx="6.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /><path d="M8.3 15.7L19 4" /><path d="M15.7 15.7L5 4" /></>),
  paste: line(<><rect x="5" y="5" width="14" height="16" rx="2" /><path d="M9 5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" /><path d="M9 11h6M9 15h4" /></>),
  rotate: line(<><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" /><path d="M19.5 4v4.5H15" /></>),
  // 투명도: 반은 비치는 물방울
  opacity: line(<><path d="M12 3.5c3.2 3.6 5.5 6.4 5.5 9.5a5.5 5.5 0 0 1-11 0c0-3.1 2.3-5.9 5.5-9.5z" /><path d="M12 18.5a5.5 5.5 0 0 0 5.5-5.5c0-3.1-2.3-5.9-5.5-9.5z" fill="currentColor" stroke="none" opacity={0.35} /></>),
  download: line(<><path d="M12 4v11" /><path d="M7.5 11l4.5 4.5 4.5-4.5" /><path d="M5 19.5h14" /></>),
  // 손글씨: 위는 굵고 아래는 가는 고리 — 누르는 힘에 따라 굵기가 변하는 느낌
  'dash-draw': (size) => (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" fill="currentColor" d="M4 12a8 8 0 1 0 16 0a8 8 0 1 0 -16 0ZM7.5 13.4a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0 -9 0Z" /></svg>
  ),
  'dash-solid': ring(),
  'dash-dashed': ring('5 4'),
  'dash-dotted': ring('0.1 4', 2.4),
};

export function Icon({ id, size = 24 }: { id: string; size?: number }) {
  return <>{ICONS[id]?.(size) ?? null}</>;
}
