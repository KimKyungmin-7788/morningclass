import { SIZES, dashArray, isUniformLine, linePath, newStrokeId, placeImage, strokeOpacity, strokePath, columnRange, type BoardImage, type Stroke } from './model';
import { wrapText, type Sheet } from './morning';
import { getPaper, type PaperId } from './papers';

// 그림 불러오기(칠판에 붙이기)와 판서를 그림 파일로 저장하기. 모두 이 기기 안에서만 처리한다 — 어디로도 보내지 않는다.

/** 붙이는 그림의 긴 변 한도. 사진을 그대로 두면 저장할 때마다 수 MB 를 쓰게 된다 */
const MAX_SIDE = 1600;

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('그림을 읽지 못했어요'));
  img.src = src;
});

/** 그림 파일 → 칠판에 붙일 그림. 크면 줄이고, 지금 보이는 화면 가운데에 놓는다 */
export async function fileToBoardImage(file: Blob, view: { w: number; h: number }, viewport: { x: number; y: number }): Promise<BoardImage> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    cv.getContext('2d')!.drawImage(img, 0, 0, w, h);
    return canvasToBoardImage(cv, view, viewport);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 캔버스에 그린 것 → 칠판에 붙일 그림 (지금 보이는 화면 가운데에 놓는다) */
function canvasToBoardImage(cv: HTMLCanvasElement, view: { w: number; h: number }, viewport: { x: number; y: number }): BoardImage {
  const src = cv.toDataURL('image/webp', 0.9);                     // webp 를 못 만드는 브라우저는 알아서 png 로 준다 (투명한 곳도 그대로)
  const at = placeImage(cv.width, cv.height, view.w, view.h);
  return { id: newStrokeId(), src, ...at, x: at.x - viewport.x, y: at.y - viewport.y };
}

const FONT = "'Paperozi','Noto Sans KR','맑은 고딕',sans-serif";
/** 글자가 칸보다 길면 들어갈 때까지 글자 크기를 줄인다 (가장 작게는 60%) */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number): void {
  let px = size;
  ctx.font = `${weight} ${px}px ${FONT}`;
  while (px > size * 0.6 && ctx.measureText(text).width > maxWidth) { px -= 2; ctx.font = `${weight} ${px}px ${FONT}`; }
}

/**
 * 아침교실 내용(시간표 · 유의사항 · 급식 · D-DAY)을 칠판에 붙일 종이 한 장으로 그린다.
 * 칠판에서 멀리서도 읽히도록 큰 글씨로, 그 위에 덧쓸 수 있게 줄 사이를 넉넉히 둔다.
 */
export function sheetToBoardImage(sheet: Sheet, view: { w: number; h: number }, viewport: { x: number; y: number }): BoardImage {
  const W = 960; const PAD = 44; const HEAD = 116; const ROW = 92; const LINE = 66;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d')!;
  ctx.font = `700 42px ${FONT}`;
  const lines = sheet.body ? wrapText(sheet.body, W - PAD * 2, (s) => ctx.measureText(s).width) : [];
  const H = HEAD + (sheet.body ? lines.length * LINE + 30 : sheet.rows.length * ROW + 14) + PAD - 10;
  cv.width = W; cv.height = H;                                     // 크기를 바꾸면 그리기 설정이 처음으로 돌아가므로 아래에서 다시 정한다

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath(); ctx.roundRect(3, 3, W - 6, H - 6, 34); ctx.fill();
  ctx.strokeStyle = '#C9D6EA'; ctx.lineWidth = 6; ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1B3A57';
  ctx.font = `800 50px ${FONT}`;
  ctx.fillText(`${sheet.icon} ${sheet.title}`, PAD, 66);
  ctx.strokeStyle = '#E3EBF7'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(PAD, HEAD - 10); ctx.lineTo(W - PAD, HEAD - 10); ctx.stroke();

  if (sheet.body) {
    ctx.font = `700 42px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, PAD, HEAD + 24 + i * LINE + LINE / 2));
  }
  sheet.rows.forEach((row, i) => {
    const y = HEAD + 8 + i * ROW + ROW / 2;
    let x = PAD;
    if (row.badge) {
      ctx.font = `800 32px ${FONT}`;
      const bw = Math.max(128, ctx.measureText(row.badge).width + 44);
      ctx.fillStyle = '#5BB6FF';
      ctx.beginPath(); ctx.roundRect(x, y - 30, bw, 60, 30); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center';
      ctx.fillText(row.badge, x + bw / 2, y + 2);
      ctx.textAlign = 'left';
      x += bw + 24;
    } else {
      ctx.fillStyle = '#5BB6FF';
      ctx.beginPath(); ctx.arc(x + 12, y, 9, 0, Math.PI * 2); ctx.fill();
      x += 44;
    }
    const room = W - PAD - x;
    ctx.fillStyle = '#1B3A57';
    fitFont(ctx, row.text, 800, 46, row.sub ? room * 0.62 : room);
    ctx.fillText(row.text, x, y + 2);
    if (row.sub) {
      const used = ctx.measureText(row.text).width + 22;
      ctx.fillStyle = '#5A7A99';
      fitFont(ctx, row.sub, 600, 30, room - used);
      ctx.fillText(row.sub, x + used, y + 5);
    }
    if (i < sheet.rows.length - 1) { ctx.strokeStyle = '#EEF3FA'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PAD, y + ROW / 2); ctx.lineTo(W - PAD, y + ROW / 2); ctx.stroke(); }
  });
  return canvasToBoardImage(cv, view, viewport);
}

interface BoardPicture {
  strokes: Stroke[];
  images: BoardImage[];
  paper: PaperId;
  bg: string;
  viewport: { x: number; y: number };
  /** 나눈 칸의 학생 이름과 펜 색 (왼쪽부터) */
  columns: { name: string; ink: string }[];
}

/** 지금 화면에 보이는 판서(w × h)를 PNG 로 만든다 — 용지 · 붙인 그림 · 획 · 나눈 칸과 이름표까지 */
export async function boardToPng(b: BoardPicture, w: number, h: number): Promise<Blob> {
  const scale = 2;                                                 // 인쇄하거나 크게 봐도 깨지지 않게
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * scale); cv.height = Math.round(h * scale);
  const ctx = cv.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = b.bg;
  ctx.fillRect(0, 0, w, h);

  const { x: vx, y: vy } = b.viewport;
  ctx.save();
  ctx.translate(vx, vy);
  ctx.save();
  getPaper(b.paper).draw(ctx, { left: -vx, top: -vy, right: w - vx, bottom: h - vy, scale: 1 });
  ctx.restore();
  for (const m of b.images) {
    try {
      const img = await loadImage(m.src);
      ctx.save();
      ctx.translate(m.x + m.w / 2, m.y + m.h / 2);
      ctx.rotate(((m.rot ?? 0) * Math.PI) / 180);
      ctx.globalAlpha = m.opacity ?? 1;
      ctx.drawImage(img, -m.w / 2, -m.h / 2, m.w, m.h);
      ctx.restore();
    } catch { /* 못 읽는 그림은 건너뛴다 */ }
  }
  for (const s of b.strokes) {
    if (isUniformLine(s)) {
      const width = SIZES[s.size];
      ctx.strokeStyle = s.color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.setLineDash((dashArray(s.dash, width) ?? '').split(' ').filter(Boolean).map(Number));
      ctx.stroke(new Path2D(linePath(s)));
      ctx.setLineDash([]);
    } else {
      ctx.globalAlpha = strokeOpacity(s);
      ctx.fillStyle = s.color;
      ctx.fill(new Path2D(strokePath(s)));
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();

  const n = b.columns.length;
  if (n) {
    // 칸 사이의 선: 어떤 용지 · 바탕색 위에서도 보이게 흰 테두리를 두른 진한 실선
    for (const [color, width] of [['rgba(255,255,255,.9)', 7], ['#868E96', 3]] as const) {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      for (let i = 1; i < n; i += 1) { const x = (w * i) / n; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    }
    ctx.font = "700 20px 'Paperozi','Noto Sans KR','맑은 고딕',sans-serif";
    ctx.textBaseline = 'middle';
    b.columns.forEach(({ name, ink }, i) => {
      const { left, right } = columnRange(i, w, n);
      const tw = ctx.measureText(name).width;
      const cw = tw + 54; const ch = 44; const cx = (left + right) / 2 - cw / 2; const cy = 16;
      ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, ch / 2);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      ctx.strokeStyle = '#E6E6E6'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + 22, cy + ch / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = ink; ctx.fill();
      ctx.fillStyle = '#1A1A1A';
      ctx.fillText(name, cx + 36, cy + ch / 2 + 1);
    });
  }
  return new Promise((resolve, reject) => cv.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('그림으로 만들지 못했어요'))), 'image/png'));
}

/** 파일로 내려받는다 */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
