// 칭찬 인증서: 판을 다 채워 보상을 고르면 한 장을 그린다 (A4 가로 비율의 그림 한 장).
// 화면에 보여 주고, 그대로 인쇄하거나 그림 파일로 받는다. 인증서는 저장하지 않고 그 자리에서만 만든다.

export interface CertData {
  name: string;
  /** 판 이름과 칸 수 (예: 칭찬 포도 · 20) */
  board: string;
  size: number;
  shape: 'grape' | 'tree' | 'star';
  /** 몇 번째로 완성한 판인지 */
  nth: number;
  /** 칭찬받은 일 (많은 순) */
  reasons: { text: string; count: number }[];
  reward: string;
  date: Date;
  school: string;
  className: string;
}

const W = 1600; const H = 1131;                                   // A4 가로 비율
const FONT = "'Paperozi','Noto Sans KR',sans-serif";
const THEME = {
  grape: { main: '#6b21a8', soft: '#f3e8ff', edge: '#c084fc', emoji: '🍇' },
  tree: { main: '#166534', soft: '#dcfce7', edge: '#4ade80', emoji: '🌳' },
  star: { main: '#3730a3', soft: '#e0e7ff', edge: '#818cf8', emoji: '⭐' },
} as const;

const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => resolve(null);
  img.src = src;
});

/** 너비에 맞춰 띄어쓰기에서 줄을 바꾼다 */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}
/** 한 줄에 들어가도록 글자 크기를 줄인다 */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number): number {
  let px = size;
  for (; px > 24; px -= 2) { ctx.font = `${weight} ${px}px ${FONT}`; if (ctx.measureText(text).width <= max) break; }
  return px;
}
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function drawCertificate(d: CertData): Promise<HTMLCanvasElement> {
  const t = THEME[d.shape];
  try { await Promise.all([document.fonts.load(`700 80px ${FONT}`), document.fonts.load(`400 40px ${FONT}`)]); } catch { /* 글꼴이 없어도 기본 글꼴로 그린다 */ }
  const stickers = d.shape === 'tree' ? [] : (await Promise.all([1, 2, 3, 4].map((n) => loadImage(`/img/praise/${d.shape}-sticker-${n}.webp`)))).filter((x): x is HTMLImageElement => !!x);

  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  // 바탕과 테두리 (금색 굵은 선 + 안쪽 가는 선)
  ctx.fillStyle = '#fffdf6'; ctx.fillRect(0, 0, W, H);
  const gold = ctx.createLinearGradient(0, 0, W, H);
  gold.addColorStop(0, '#f6c453'); gold.addColorStop(0.5, '#fde68a'); gold.addColorStop(1, '#e0a52a');
  ctx.strokeStyle = gold; ctx.lineWidth = 22; roundRect(ctx, 34, 34, W - 68, H - 68, 36); ctx.stroke();
  ctx.strokeStyle = t.edge; ctx.lineWidth = 3; roundRect(ctx, 62, 62, W - 124, H - 124, 22); ctx.stroke();

  // 네 귀퉁이 꾸밈: 받은 스티커 그림 (나무는 그림이 없어 이모지)
  const corners: [number, number][] = [[128, 128], [W - 128, 128], [128, H - 128], [W - 128, H - 128]];
  corners.forEach(([x, y], i) => {
    if (stickers.length) { const img = stickers[i % stickers.length]; ctx.drawImage(img, x - 52, y - 52, 104, 104); }
    else { ctx.font = `80px ${FONT}`; ctx.fillText(t.emoji, x, y); }
  });

  // 제목
  ctx.fillStyle = t.main;
  ctx.font = `400 34px ${FONT}`; ctx.fillText(`제 ${d.nth} 호`, W / 2, 132);
  ctx.font = `800 112px ${FONT}`; ctx.fillText('칭찬 인증서', W / 2, 232);
  ctx.fillStyle = t.soft; roundRect(ctx, W / 2 - 150, 300, 300, 50, 25); ctx.fill();
  ctx.fillStyle = t.main; ctx.font = `700 30px ${FONT}`; ctx.fillText('참 잘했어요!', W / 2, 326);

  // 이름
  ctx.fillStyle = '#1e293b';
  const namePx = fitFont(ctx, d.name, 800, 104, W - 520);
  ctx.font = `800 ${namePx}px ${FONT}`; ctx.fillText(d.name, W / 2, 440);
  const nameW = ctx.measureText(d.name).width;
  ctx.strokeStyle = t.edge; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(W / 2 - nameW / 2 - 40, 502); ctx.lineTo(W / 2 + nameW / 2 + 40, 502); ctx.stroke();

  // 칭찬하는 글
  ctx.fillStyle = '#334155'; ctx.font = `500 38px ${FONT}`;
  const body = `위 학생은 칭찬 스티커 ${d.size}개를 차곡차곡 모아 ${d.board} 한 판을 모두 채웠습니다. 스스로 노력한 그 마음을 크게 칭찬하며 이 인증서를 드립니다.`;
  let y = 572;
  for (const line of wrap(ctx, body, W - 330)) { ctx.fillText(line, W / 2, y); y += 58; }

  // 칭찬받은 일
  if (d.reasons.length) {
    const text = d.reasons.slice(0, 4).map((r) => `${r.text} ${r.count}번`).join('   ·   ');
    const px = fitFont(ctx, text, 700, 36, W - 420);
    ctx.fillStyle = t.main; ctx.font = `700 ${px}px ${FONT}`; ctx.fillText(text, W / 2, y + 18);
    y += 70;
  }

  // 보상
  const rewardText = `🎁  ${d.reward}`;
  const rewardPx = fitFont(ctx, rewardText, 800, 54, W - 520);
  ctx.font = `800 ${rewardPx}px ${FONT}`;
  const rw = Math.max(520, ctx.measureText(rewardText).width + 120);
  const ry = Math.min(y + 12, 838);
  ctx.fillStyle = '#fff7ed'; roundRect(ctx, W / 2 - rw / 2, ry, rw, 104, 52); ctx.fill();
  ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 4; roundRect(ctx, W / 2 - rw / 2, ry, rw, 104, 52); ctx.stroke();
  ctx.fillStyle = '#9a3412'; ctx.fillText(rewardText, W / 2, ry + 54);

  // 날짜 · 학급 · 선생님
  ctx.fillStyle = '#475569'; ctx.font = `500 36px ${FONT}`;
  ctx.fillText(`${d.date.getFullYear()}년 ${d.date.getMonth() + 1}월 ${d.date.getDate()}일`, W / 2, 990);
  const who = [d.school, d.className].filter(Boolean).join(' ');
  ctx.fillStyle = '#1e293b'; ctx.font = `700 42px ${FONT}`;
  ctx.fillText(`${who ? `${who}  ` : ''}담임 선생님`, W / 2, 1046);
  return cv;
}

export const certFileName = (d: CertData) => `칭찬인증서_${d.name}_${d.date.getFullYear()}${String(d.date.getMonth() + 1).padStart(2, '0')}${String(d.date.getDate()).padStart(2, '0')}.png`;

/** 그림 파일로 받는다 */
export function downloadCanvas(cv: HTMLCanvasElement, name: string): Promise<void> {
  return new Promise((resolve, reject) => cv.toBlob((blob) => {
    if (!blob) { reject(new Error('그림으로 만들지 못했어요')); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    resolve();
  }, 'image/png'));
}

/** 인증서 한 장만 인쇄한다 (보이지 않는 틀에 그림을 넣어 그 틀만 인쇄 — 화면의 다른 것은 찍히지 않는다) */
export function printImage(dataUrl: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0';
  frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>칭찬 인증서</title><style>@page{size:A4 landscape;margin:8mm}html,body{margin:0;height:100%}body{display:flex;align-items:center;justify-content:center}img{max-width:100%;max-height:100%}</style></head><body><img src="${dataUrl}" alt="칭찬 인증서"></body></html>`;
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) { frame.remove(); return; }
    win.onafterprint = () => frame.remove();
    setTimeout(() => { win.focus(); win.print(); }, 150);        // 그림이 그려질 시간을 준다
    setTimeout(() => frame.remove(), 120000);                      // 인쇄 창을 닫았는데도 남아 있으면 치운다
  };
  document.body.appendChild(frame);
}
