import { seeded } from './wordSheet';

// 활동지(A4) 공통: 글자 다듬기 · 섞기 · 쪽 머리 · 문서 틀 (시간표 · 감정 활동지가 함께 쓴다)

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export { seeded };
export function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
/** 받침에 맞는 조사: josa('음악', '은', '는') → '음악은', josa('체육', '이', '가') → '체육이' (한글이 아니면 둘 다 적는다) */
export function josa(word: string, withFinal: string, without: string): string {
  const c = word.trim().charCodeAt(word.trim().length - 1) - 0xac00;
  if (c < 0 || c >= 11172) return `${word}${withFinal}(${without})`;
  return `${word}${c % 28 ? withFinal : without}`;
}
export const dateText = (date: Date) => `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][date.getDay()]}요일`;
/** 쪽 머리: 제목 · 날짜와 한 줄 안내 · 이름 칸 */
export const head = (title: string, sub: string, date: Date) => `<div class="hd"><div><h1>${title}</h1><div class="sub">${dateText(date)} · ${sub}</div></div><div class="nm">이름 <span></span></div></div>`;
/** 따라 쓰는 글자 칸 (한 글자씩). mode: bold 진한 본보기 · dot 흐린 글씨 · blank 빈칸 */
export const cells = (text: string, len: number, c: number, mode: 'bold' | 'dot' | 'blank') => `<div class="cells" style="--c:${c.toFixed(1)}mm">${Array.from({ length: len }, (_, i) => {
  const ch = mode === 'blank' ? '' : ([...text][i] ?? '');
  return `<span class="cell ${mode}">${ch === ' ' ? '' : esc(ch)}</span>`;
}).join('')}</div>`;

const BASE = `
@font-face{font-family:'LDotted';src:url('https://cdn.jsdelivr.net/gh/Project-Noonnu/2608211548@font-209/font-209/%E1%84%8B%E1%85%A6%E1%86%AF%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8E%E1%85%A6.woff2') format('woff2');font-weight:400;font-display:block}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#d9dee7;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;background:#fff;margin:6mm auto;padding:12mm 14mm;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.15)}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;break-after:page}.page:last-child{break-after:auto}}
.hd{display:flex;align-items:flex-end;justify-content:space-between;gap:6mm;border-bottom:.7mm solid #111;padding-bottom:2.5mm;margin-bottom:4mm;flex:none}
.hd h1{font-size:20pt;font-weight:900;line-height:1.2}
.hd .sub{font-size:9.5pt;color:#555;margin-top:1mm;font-weight:500}
.hd .nm{font-size:12pt;font-weight:700;white-space:nowrap}
.hd .nm span{display:inline-block;width:32mm;border-bottom:.3mm solid #111;margin-left:2mm}
h2{font-size:13pt;font-weight:900;margin:5mm 0 3mm;flex:none;line-height:1.35;word-break:keep-all}
h2 small{font-size:10pt;font-weight:500;color:#555;margin-left:2mm}
.cells{display:flex;flex:none}
.cell{width:var(--c);height:var(--c);border:.25mm solid #555;margin-left:-.25mm;position:relative;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;font-weight:700;font-size:calc(var(--c) * .72);line-height:1}
.cell::before{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:.2mm dashed #c9ced6}
.cell::after{content:'';position:absolute;top:50%;left:0;right:0;border-top:.2mm dashed #c9ced6}
.cell.dot{font-family:'LDotted',sans-serif;font-weight:400;color:#000;font-size:calc(var(--c) * .82)}
.lines{flex:none;display:flex;flex-direction:column}
.lines i{height:13mm;border-bottom:.3mm solid #555}
.pick{flex:none;display:flex;flex-wrap:wrap;gap:4mm}
.pick>span{flex:1;min-width:30mm;display:flex;align-items:center;justify-content:center;gap:2mm;padding:2.5mm 3mm;border:.4mm dashed #374151;border-radius:99px;text-align:center;font-size:15pt;font-weight:700;word-break:keep-all}
.foot{font-size:9.5pt;color:#555;margin-top:4mm;flex:none}
.tip{flex:none;margin-top:3mm;padding:2.5mm 4mm;border-radius:3mm;background:#f1f5f9;font-size:10.5pt;font-weight:500;line-height:1.5;word-break:keep-all}
.empty{margin:auto;font-size:14pt;color:#888;font-weight:700;text-align:center;line-height:1.7}
`;

/** 쪽들을 한 문서로 묶는다. 쪽이 없으면 고르라는 안내 한 쪽 */
export function sheetDoc(pages: string[], css: string): string {
  const body = pages.length ? pages.join('') : '<section class="page"><div class="empty">위에서 만들 활동지를 하나 이상 골라 주세요</div></section>';
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;900&family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet">
<style>${BASE}${css}</style></head><body>${body}</body></html>`;
}
