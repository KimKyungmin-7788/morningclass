// ============================================================
// 배경 용지 레지스트리
//
//   ★ 새 용지 추가 = 이 배열(PAPERS)에 항목 1개 추가  ★
//   각 용지 = { id, name, draw(ctx, opts) }.
//   draw 는 "보이는 월드 영역"(left/top/right/bottom)에 절차적으로
//   선·점을 그린다. 이미지 파일 불필요 — 같은 draw 를 작은 크기로
//   재사용해 선택 UI 썸네일도 그린다.
//
// 좌표/스케일 규약 (팬·줌 양쪽 대비):
//   - 간격·반지름·두께는 모두 "월드 px @scale1" 단위.
//   - 호출자는 월드→디바이스 변환(scale 배)을 ctx 에 적용한 뒤 부른다.
//     (BackgroundLayer 는 Konva Layer 가 viewport 오프셋만 적용하므로
//      현재 scale=1. 향후 줌이 생기면 layer.scale 과 opts.scale 만 맞추면 됨.)
//   - 선/점이 화면에서 일정 두께로 보이도록 width/radius 를 scale 로 나눈다
//     (scale=1 이면 그대로). 이 "/ scale" 자리가 줌 대비 자리.
//   - 패턴은 월드 원점(0,0) 기준으로 정렬 → 팬해도 어긋나지 않는다.
// ============================================================

export type PaperId =
  | 'blank'
  | 'lined'
  | 'grid'
  | 'dot'
  | 'gyeongpil'
  | 'english'
  | 'music'
  | 'lesson';

/** draw 에 넘기는 "보이는 월드 영역" + 스케일 */
export interface PaperDrawOpts {
  /** 보이는 월드 사각형 (월드 좌표) */
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** 월드→디바이스 스케일. 화면 일정 두께 유지를 위해 width/radius 를 이 값으로 나눔 */
  scale: number;
}

export interface PaperDef {
  id: PaperId;
  name: string;
  /** 보이는 월드 영역에 패턴을 그린다 (배경색은 호출자가 깔아둠) */
  draw: (ctx: CanvasRenderingContext2D, o: PaperDrawOpts) => void;
  /**
   * (선택) 커스텀 썸네일. 타일형 패턴은 생략하면 draw 를 작게 재사용한다.
   * 고정 템플릿(수업노트)처럼 한 장이 통째로 들어가야 하는 용지는 여기서
   * size×size 안에 전체 레이아웃을 맞춰 그린다.
   */
  thumb?: (ctx: CanvasRenderingContext2D, size: number) => void;
}

// ---------- 내부 헬퍼 ----------

/** top..bottom 구간을 period 간격으로 월드원점 정렬해 순회 (각 주기 시작 y) */
function eachPeriod(top: number, bottom: number, period: number, cb: (y: number) => void) {
  const start = Math.floor(top / period) * period;
  for (let y = start; y < bottom; y += period) cb(y);
}

/** 가로 실선/파선 한 벌 그리기 */
function hLines(
  ctx: CanvasRenderingContext2D,
  o: PaperDrawOpts,
  spacing: number,
  color: string,
  width: number,
  dash?: number[],
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width / o.scale;
  ctx.setLineDash(dash ? dash.map((d) => d / o.scale) : []);
  ctx.beginPath();
  eachPeriod(o.top, o.bottom, spacing, (y) => {
    ctx.moveTo(o.left, y);
    ctx.lineTo(o.right, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

/** 세로 실선/파선 한 벌 그리기 */
function vLines(
  ctx: CanvasRenderingContext2D,
  o: PaperDrawOpts,
  spacing: number,
  color: string,
  width: number,
  dash?: number[],
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width / o.scale;
  ctx.setLineDash(dash ? dash.map((d) => d / o.scale) : []);
  ctx.beginPath();
  eachPeriod(o.left, o.right, spacing, (x) => {
    ctx.moveTo(x, o.top);
    ctx.lineTo(x, o.bottom);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------- 용지 정의 ----------

export const PAPERS: PaperDef[] = [
  // 무지: 아무것도 그리지 않음 (기본)
  {
    id: 'blank',
    name: '무지',
    draw: () => {},
  },

  // 줄노트: 가로줄 간격 48
  {
    id: 'lined',
    name: '줄노트',
    draw: (ctx, o) => {
      hLines(ctx, o, 48, '#D9DCE1', 1);
    },
  },

  // 격자노트: 정사각 격자 32
  {
    id: 'grid',
    name: '격자',
    draw: (ctx, o) => {
      hLines(ctx, o, 32, '#E6E8EC', 1);
      vLines(ctx, o, 32, '#E6E8EC', 1);
    },
  },

  // 도트노트: 정사각 점격자 간격 32, 점 반지름 1.3
  {
    id: 'dot',
    name: '도트',
    draw: (ctx, o) => {
      const sp = 32;
      const r = 1.3 / o.scale;
      ctx.fillStyle = '#C7CBD1';
      const startX = Math.floor(o.left / sp) * sp;
      const startY = Math.floor(o.top / sp) * sp;
      for (let y = startY; y < o.bottom; y += sp) {
        for (let x = startX; x < o.right; x += sp) {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    },
  },

  // 경필노트: 96 칸 실선 + 각 칸 중앙(48) 가로·세로 점선
  {
    id: 'gyeongpil',
    name: '경필',
    draw: (ctx, o) => {
      // 칸 실선
      hLines(ctx, o, 96, '#BFC3C9', 1.2);
      vLines(ctx, o, 96, '#BFC3C9', 1.2);
      // 칸 중앙 점선 (96 격자에서 +48 오프셋 = 월드원점 기준 …,-48,48,144,…)
      const dash = [4, 4];
      hLinesOffset(ctx, o, 96, 48, '#DADDE2', 1, dash);
      vLinesOffset(ctx, o, 96, 48, '#DADDE2', 1, dash);
    },
  },

  // 영어노트: 4선 세트(간격 24) 반복 + 세트 사이 34
  //   세트 내: 1 실선·2 점선·3 빨강실선(기준선)·4 실선
  {
    id: 'english',
    name: '영어',
    draw: (ctx, o) => {
      const inner = 20; // 세트 내 선 간격 (살짝 좁힘)
      const gap = 44; // 세트 사이 (음악노트처럼 세트 구분이 분명하게)
      const period = inner * 3 + gap; // 세트 높이(60) + 44 = 104
      eachPeriod(o.top - period, o.bottom, period, (base) => {
        line(ctx, o, base + inner * 0, '#BFC3C9', 1); // 1 실선
        line(ctx, o, base + inner * 1, '#BFC3C9', 1, [3, 4]); // 2 점선
        line(ctx, o, base + inner * 2, '#E5484D', 1.2); // 3 기준선(빨강)
        line(ctx, o, base + inner * 3, '#BFC3C9', 1); // 4 실선
      });
    },
  },

  // 음악노트: 5선 보표(선 간격 12) 반복, 보표 사이 40
  {
    id: 'music',
    name: '음악',
    draw: (ctx, o) => {
      const inner = 12;
      const gap = 40;
      const period = inner * 4 + gap; // 보표 높이(48) + 40 = 88
      eachPeriod(o.top - period, o.bottom, period, (base) => {
        for (let i = 0; i < 5; i++) line(ctx, o, base + inner * i, '#C7CBD1', 1);
      });
    },
  },

  // 수업노트: 보이는 화면 영역에 가득 차는 템플릿(라벨칩 학습목표/활동 + 내용 박스 4줄).
  //   박스/글자/폰트는 서브앱 디자인(둥근 박스·Pretendard·차콜),
  //   배경색은 화이트보드 규칙(박스는 채우지 않음 → 선택한 배경색이 비침).
  //   화면(보이는 영역) 크기에 맞춰 동적으로 채워지고, 창 크기가 바뀌면 다시 맞춘다.
  {
    id: 'lesson',
    name: '수업노트',
    draw: (ctx, o) => {
      const sc = o.scale;
      const W = o.right - o.left;
      const H = o.bottom - o.top;
      const m = 16 / sc; // 페이지 테두리: 화면 가장자리 여백(스크린 16px)
      // 콘텐츠 안전영역 — UI(시계/도구독/서브앱 독)를 피해 안쪽으로 들임(스크린 px)
      const cl = 100 / sc; // 좌: 펜 옵션(도구 독)
      const ct = 76 / sc; // 상: 시계/실행취소 박스
      const cr = 24 / sc; // 우
      const cb = 108 / sc; // 하: 서브앱 독
      renderLessonNote(
        ctx,
        o.left + m,
        o.top + m,
        W - 2 * m,
        H - 2 * m,
        o.left + cl,
        o.top + ct,
        W - cl - cr,
        H - ct - cb,
        1.5 / sc,
        true,
      );
    },
    thumb: (ctx, size) => {
      const fx = 4;
      const fy = 6;
      const fw = size - 8;
      const fh = size - 12;
      // 썸네일도 같은 비율로 안쪽에 콘텐츠 배치
      const cl = size * 0.14;
      const ct = size * 0.12;
      const cr = size * 0.05;
      const cb = size * 0.14;
      renderLessonNote(
        ctx,
        fx,
        fy,
        fw,
        fh,
        fx + cl,
        fy + ct,
        fw - cl - cr,
        fh - ct - cb,
        1,
        false,
      );
    },
  },
];

// ---------- 수업노트 템플릿 ----------
// 보이는 화면 영역(page rect)을 받아 그 안을 비율로 채운다.
// 같은 함수를 캔버스(화면 가득)와 썸네일(작은 사각형)에 재사용 → 어떤 크기에도 맞춤.

const L_FRAME = '#C7CBD1'; // 페이지 테두리/내용 박스
const L_BOX = '#C7CBD1';
const L_CHIP = '#AEB4BE'; // 라벨칩(살짝 진하게)
const L_TEXT = '#2B2D42'; // 라벨 글자(서브앱 차콜)

/** 둥근 사각형 path */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  if (w <= 0 || h <= 0) return; // 음수/0 크기 방어 (arcTo 가 음수 반지름에 throw)
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * 수업노트 한 장 렌더.
 * - 페이지 테두리는 frame 사각형(fx,fy,fw,fh) = 화면에 가득.
 * - 칩/내용 박스는 content 사각형(cx,cy,cw,ch) = UI(시계/도구독/서브앱)를 피한 안전영역.
 * @param lineW 선 두께(디바이스 px 고정 — 줌/썸네일에서도 일정)
 * @param drawText 라벨 글자 그릴지 (썸네일은 너무 작아 생략)
 */
function renderLessonNote(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  cx: number,
  cy: number,
  cw: number,
  ch: number,
  lineW: number,
  drawText: boolean,
) {
  const stroke = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: string,
  ) => {
    roundRectPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineW;
    ctx.stroke();
  };

  // 페이지 테두리 (화면 가득)
  stroke(fx, fy, fw, fh, Math.min(fw, fh) * 0.02, L_FRAME);

  // 콘텐츠(안전영역) 안에 칩 + 박스 4줄
  const rows = 4;
  const rowGap = ch * 0.04;
  const rowH = (ch - rowGap * (rows - 1)) / rows;
  const rowY = (i: number) => cy + i * (rowH + rowGap);
  const chipX = cx;
  // 칩 폭: 큰 화면에선 최소 84px·최대 300px, 단 콘텐츠 폭의 42%를 넘지 않게
  // (썸네일처럼 좁을 때 내용 박스가 음수가 되는 것 방지)
  const chipW = Math.min(Math.max(cw * 0.18, 84), 300, cw * 0.42);
  const colGap = cw * 0.02;
  const boxX = chipX + chipW + colGap;
  const boxW = cx + cw - boxX;
  const boxR = Math.min(rowH, chipW) * 0.22;

  const labels = ['학습목표', '활동'];
  for (let i = 0; i < rows; i++) {
    const y = rowY(i);
    // 내용 박스
    stroke(boxX, y, boxW, rowH, boxR, L_BOX);
    // 라벨칩(처음 두 줄만)
    if (i < labels.length) {
      stroke(chipX, y, chipW, rowH, boxR, L_CHIP);
      if (drawText) {
        ctx.fillStyle = L_TEXT;
        const fs = Math.min(rowH * 0.34, chipW * 0.28);
        ctx.font = `700 ${fs}px Pretendard, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labels[i], chipX + chipW / 2, y + rowH / 2);
      }
    }
  }
}

// 오프셋(격자에서 +off 만큼 민) 가로/세로선 — 경필 중앙 점선용
function hLinesOffset(
  ctx: CanvasRenderingContext2D,
  o: PaperDrawOpts,
  spacing: number,
  off: number,
  color: string,
  width: number,
  dash?: number[],
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width / o.scale;
  ctx.setLineDash(dash ? dash.map((d) => d / o.scale) : []);
  ctx.beginPath();
  eachPeriod(o.top - off, o.bottom, spacing, (y0) => {
    const y = y0 + off;
    ctx.moveTo(o.left, y);
    ctx.lineTo(o.right, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function vLinesOffset(
  ctx: CanvasRenderingContext2D,
  o: PaperDrawOpts,
  spacing: number,
  off: number,
  color: string,
  width: number,
  dash?: number[],
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width / o.scale;
  ctx.setLineDash(dash ? dash.map((d) => d / o.scale) : []);
  ctx.beginPath();
  eachPeriod(o.left - off, o.right, spacing, (x0) => {
    const x = x0 + off;
    ctx.moveTo(x, o.top);
    ctx.lineTo(x, o.bottom);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

/** 단일 가로선 (영어·음악노트 세트 내부용) */
function line(
  ctx: CanvasRenderingContext2D,
  o: PaperDrawOpts,
  y: number,
  color: string,
  width: number,
  dash?: number[],
) {
  if (y < o.top || y > o.bottom) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width / o.scale;
  ctx.setLineDash(dash ? dash.map((d) => d / o.scale) : []);
  ctx.beginPath();
  ctx.moveTo(o.left, y);
  ctx.lineTo(o.right, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

const PAPER_MAP: Record<PaperId, PaperDef> = PAPERS.reduce(
  (acc, p) => {
    acc[p.id] = p;
    return acc;
  },
  {} as Record<PaperId, PaperDef>,
);

/** PaperId → 정의. 모르는 값이면 무지. */
export function getPaper(id: PaperId): PaperDef {
  return PAPER_MAP[id] ?? PAPERS[0];
}

export const DEFAULT_PAPER: PaperId = 'blank';

// ---------- 배경색 팔레트 ----------

export interface BgColor {
  name: string;
  hex: string;
}

export const BG_COLORS: BgColor[] = [
  { name: '흰색', hex: '#FFFFFF' },
  { name: '크림', hex: '#FFFDF5' },
  { name: '연회색', hex: '#F4F5F7' },
  { name: '연노랑', hex: '#FFFBEA' },
  { name: '연두', hex: '#EFF8E6' },
  { name: '연하늘', hex: '#F1F7FF' },
];

export const DEFAULT_BG_COLOR = '#FFFFFF';
