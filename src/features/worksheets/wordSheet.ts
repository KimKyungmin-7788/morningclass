import type { WordEntry } from '@/features/word/model';

// 오늘의 낱말 학습지(A4): 고른 쪽만 이어 붙여 한 문서로 만든다 (화면과 무관한 계산 — 같은 낱말이면 늘 같은 문제가 나온다).
//  · trace  따라 쓰기: 낱말을 진한 글씨 → 흐린 글씨 → 빈칸으로, 문장도 줄을 나눠 따라 쓴다
//  · play   낱말 놀이: 글자 찾기 · 글자 수 세기 · 알맞은 낱말 고르기 · 뜻 잇기
//  · mine   그리고 써 보기: 그림으로 그리기 · 낱말을 넣어 내 문장 쓰기 · 오늘 낱말 스스로 평가
//  · cards  낱말 카드: 이번 주 낱말을 오려서 낱말 – 뜻 짝 맞추기
//  · week   이번 주 낱말 모아 쓰기

export const WORD_PARTS: [string, string][] = [
  ['trace', '① 따라 쓰기 (낱말 · 문장)'],
  ['play', '② 낱말 놀이 (글자 찾기 · 고르기 · 잇기)'],
  ['mine', '③ 그리고 써 보기 (그림 · 내 문장)'],
  ['cards', '④ 낱말 카드 (오려서 짝 맞추기)'],
  ['week', '⑤ 이번 주 낱말 모아 쓰기'],
];

export interface WordSheetInput {
  entry: WordEntry;
  /** 이번 주 월~금 낱말 (오늘 낱말 포함, 빈 날은 빠져 있다) */
  week: WordEntry[];
  date: Date;
  sel: Record<string, boolean>;
  /** 쓰기 칸 크기(mm) */
  size: number;
  /** 흐린 글씨(따라 쓰기)를 넣을지 — 끄면 그 줄은 빈칸 */
  dot: boolean;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** 낱말의 글자 (띄어쓰기 제외) */
export const lettersOf = (word: string) => [...word.replace(/\s/g, '')];

/** 같은 글이면 늘 같은 순서가 나오는 난수 (미리보기와 인쇄가 달라지지 않게) */
export function seeded(text: string): () => number {
  let h = 2166136261;
  for (const ch of text) { h ^= ch.codePointAt(0)!; h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}
function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

const FILLERS = [...'가나다라마바사아자차카타파하고노도로모보소오조구누두루무부수우주기니디리미비시이지거너더러머버서어저'];
/** 글자 찾기 판: 낱말의 글자가 각각 두 번씩 숨어 있고 나머지는 다른 글자 */
export function letterGrid(word: string, cells = 24): string[] {
  const rand = seeded(`grid:${word}`);
  const letters = [...new Set(lettersOf(word))];
  const targets = letters.flatMap((ch) => [ch, ch]).slice(0, Math.floor(cells / 2));
  const others = shuffle(FILLERS.filter((ch) => !letters.includes(ch)), rand).slice(0, cells - targets.length);
  return shuffle([...targets, ...others], rand);
}

const SPARE: WordEntry[] = [
  { word: '바다', meaning: '아주 넓고 짠 물이 있는 곳', sentence: '' },
  { word: '구름', meaning: '하늘에 떠 있는 하얀 것', sentence: '' },
  { word: '시계', meaning: '시간을 알려 주는 물건', sentence: '' },
  { word: '연필', meaning: '글씨를 쓰는 물건', sentence: '' },
];
/** 고르기 · 잇기에 쓸 다른 낱말: 이번 주 낱말에서 먼저, 모자라면 예비 낱말에서 */
export function otherWords(entry: WordEntry, week: WordEntry[], n: number): WordEntry[] {
  const seen = new Set([entry.word]);
  const out: WordEntry[] = [];
  for (const w of [...week, ...SPARE]) { if (w.word.trim() && !seen.has(w.word)) { seen.add(w.word); out.push(w); } if (out.length === n) break; }
  return out;
}

/** 문장을 한 줄에 max 칸씩, 띄어쓰기에서 줄을 바꾼다 (띄어쓰기도 한 칸) */
export function sentenceLines(sentence: string, max: number): string[] {
  const lines: string[] = [];
  for (const word of sentence.trim().split(/\s+/).filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && [...last].length + 1 + [...word].length <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

export function buildWordSheetHTML({ entry, week, date, sel, size, dot }: WordSheetInput): string {
  const dn = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];
  const dateStr = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${dn}요일`;
  const word = entry.word.trim();
  const letters = lettersOf(word);
  const dotMode = dot ? 'dot' : 'blank';
  const head = (title: string, sub: string) => `<div class="hd"><div><h1>${title}</h1><div class="sub">${dateStr} · ${sub}</div></div><div class="nm">이름 <span></span></div></div>`;
  const cells = (text: string, len: number, c: number, mode: string) => `<div class="cells" style="--c:${c.toFixed(1)}mm">${Array.from({ length: len }, (_, i) => {
    const ch = mode === 'blank' ? '' : ([...text][i] ?? '');
    return `<span class="cell ${mode}">${ch === ' ' ? '' : esc(ch)}</span>`;
  }).join('')}</div>`;
  const wordBox = `<div class="wbox"><div class="wbig">${esc(word)}</div><div class="wmean"><b>뜻</b>${esc(entry.meaning || '')}</div>${entry.sentence ? `<div class="wmean"><b>문장</b>${esc(entry.sentence)}</div>` : ''}</div>`;
  const pages: string[] = [];

  // ① 따라 쓰기
  if (sel.trace) {
    const c = Math.min(size + 3, 170 / Math.max(letters.length, 1));       // 낱말은 조금 더 크게, 긴 낱말도 한 줄에
    const wordRows = [cells(word.replace(/\s/g, ''), letters.length, c, 'bold'), cells(word.replace(/\s/g, ''), letters.length, c, dotMode), cells(word.replace(/\s/g, ''), letters.length, c, dotMode), cells('', letters.length, c, 'blank'), cells('', letters.length, c, 'blank')];
    let sentenceBlock = '';
    if (entry.sentence) {
      const sc = Math.min(size, 13);
      const perLine = Math.floor(176 / sc);
      const lines = sentenceLines(entry.sentence, perLine);
      const room = 265 - 46 - 5 * c - 24;                                   // 쪽 높이에서 머리 · 낱말 상자 · 낱말 줄을 뺀 나머지(mm)
      const rows = lines.length * 3 * sc + lines.length * 3 <= room ? ['bold', dotMode, 'blank'] : ['bold', dotMode];
      sentenceBlock = `<h2>✏️ 문장 따라 쓰기</h2>${lines.map((l) => `<div class="sline">${rows.map((m) => cells(l, [...l].length, sc, m)).join('')}</div>`).join('')}`;
    }
    pages.push(`<section class="page">${head('오늘의 낱말 따라 쓰기', '낱말을 읽고, 흐린 글씨를 따라 쓴 다음 혼자 써요.')}
      ${wordBox}
      <h2>✏️ 낱말 따라 쓰기</h2><div class="wrows">${wordRows.join('')}</div>
      ${sentenceBlock}</section>`);
  }

  // ② 낱말 놀이
  if (sel.play) {
    const rand = seeded(`play:${word}`);
    const grid = letterGrid(word);
    const others = otherWords(entry, week, 3);
    const choices = shuffle([entry, ...others.slice(0, 2)], rand);
    const cut = entry.sentence.indexOf(word);
    const blanked = cut >= 0 ? `${esc(entry.sentence.slice(0, cut))}<span class="hole" style="width:${Math.max(18, letters.length * 11)}mm"></span>${esc(entry.sentence.slice(cut + word.length))}` : '';
    const match = [entry, ...others.slice(0, 2)];
    const right = shuffle(match, rand);
    pages.push(`<section class="page">${head('오늘의 낱말 놀이', '낱말을 찾고, 세고, 골라 봐요.')}
      <div class="today">오늘의 낱말 <b>${esc(word)}</b></div>
      <h2>🔍 1. 낱말의 글자를 모두 찾아 ○ 하세요</h2>
      <div class="lgrid">${grid.map((ch) => `<span>${esc(ch)}</span>`).join('')}</div>
      <h2>🔢 2. 몇 글자일까요? 글자 수만큼 색칠하세요</h2>
      <div class="count"><b>${esc(word)}</b>${'<i></i>'.repeat(Math.max(6, letters.length + 2))}</div>
      ${blanked ? `<h2>✅ 3. 빈칸에 알맞은 낱말에 ○ 하고, 써 보세요</h2>
      <div class="fill">${blanked}</div>
      <div class="pick">${choices.map((w) => `<span>${esc(w.word)}</span>`).join('')}</div>` : ''}
      ${match.length >= 2 ? `<h2>🔗 ${blanked ? 4 : 3}. 낱말과 뜻을 줄로 이어 보세요</h2>
      <div class="link"><div>${match.map((w) => `<p><b>${esc(w.word)}</b><i></i></p>`).join('')}</div><div>${right.map((w) => `<p><i></i><span>${esc(w.meaning || w.word)}</span></p>`).join('')}</div></div>` : ''}
    </section>`);
  }

  // ③ 그리고 써 보기
  if (sel.mine) {
    pages.push(`<section class="page">${head('오늘의 낱말로 그리고 써 보기', '낱말을 그림으로 그리고, 내 문장을 써요.')}
      ${wordBox}
      <h2>🎨 낱말을 그림으로 그려 보세요</h2><div class="draw"></div>
      <h2>📝 낱말을 넣어 내 문장을 써 보세요</h2><div class="lines"><i></i><i></i><i></i></div>
      <h2>🌟 오늘 낱말을 얼마나 알게 되었나요? ○ 하세요</h2>
      <div class="rate"><span>😊<b>잘 알아요</b></span><span>🙂<b>조금 알아요</b></span><span>🤔<b>더 배울래요</b></span></div>
    </section>`);
  }

  // ④ 낱말 카드
  const set = [entry, ...week.filter((w) => w.word.trim() && w.word !== entry.word)].slice(0, 5);
  if (sel.cards) {
    pages.push(`<section class="page">${head('낱말 카드', '점선을 따라 오려서 낱말과 뜻의 짝을 맞춰요.')}
      <div class="cards">${set.map((w) => `<div class="cardw"><b>${esc(w.word)}</b></div><div class="cardm"><span>${esc(w.meaning || '')}</span></div>`).join('')}</div>
      <div class="foot">✂ 낱말 카드와 뜻 카드를 섞은 다음, 짝을 찾아 나란히 놓아 보세요.</div>
    </section>`);
  }

  // ⑤ 이번 주 낱말 모아 쓰기
  if (sel.week) {
    const c = Math.min(size, 13, 120 / Math.max(...set.map((w) => lettersOf(w.word).length), 1));
    pages.push(`<section class="page">${head('이번 주 낱말 모아 쓰기', '이번 주에 배운 낱말을 다시 읽고 써요.')}
      ${set.map((w, i) => { const t = w.word.replace(/\s/g, ''); const n = lettersOf(w.word).length; return `<div class="wk"><span class="tno">${i + 1}</span><div class="wkm"><b>${esc(w.word)}</b><span>${esc(w.meaning || '')}</span></div><div class="trows">${cells(t, n, c, dotMode)}${cells('', n, c, 'blank')}</div></div>`; }).join('')}
      ${set.length < 2 ? '<div class="foot">이번 주에 정해 둔 낱말이 더 있으면 함께 나와요.</div>' : ''}
    </section>`);
  }

  if (!pages.length) pages.push('<section class="page"><div class="empty">위에서 만들 학습지를 하나 이상 골라 주세요</div></section>');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@500;700;900&family=Noto+Serif+KR:wght@700&display=swap" rel="stylesheet">
<style>
@font-face{font-family:'LDotted';src:url('https://cdn.jsdelivr.net/gh/Project-Noonnu/2608211548@font-209/font-209/%E1%84%8B%E1%85%A6%E1%86%AF%E1%84%8C%E1%85%A5%E1%86%B7%E1%84%89%E1%85%A5%E1%86%AB%E1%84%8E%E1%85%A6.woff2') format('woff2');font-weight:400;font-display:block}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Noto Sans KR',sans-serif;background:#d9dee7;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;background:#fff;margin:6mm auto;padding:12mm 14mm;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.15)}
@media print{body{background:#fff}.page{margin:0;box-shadow:none;break-after:page}.page:last-child{break-after:auto}}
.hd{display:flex;align-items:flex-end;justify-content:space-between;gap:6mm;border-bottom:.7mm solid #111;padding-bottom:2.5mm;margin-bottom:5mm;flex:none}
.hd h1{font-size:20pt;font-weight:900;line-height:1.2}
.hd .sub{font-size:9.5pt;color:#555;margin-top:1mm;font-weight:500}
.hd .nm{font-size:12pt;font-weight:700;white-space:nowrap}
.hd .nm span{display:inline-block;width:32mm;border-bottom:.3mm solid #111;margin-left:2mm}
h2{font-size:13pt;font-weight:900;margin:5mm 0 3mm;flex:none}
.cells{display:flex;flex:none}
.cell{width:var(--c);height:var(--c);border:.25mm solid #555;margin-left:-.25mm;position:relative;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;font-weight:700;font-size:calc(var(--c) * .72);line-height:1}
.cell::before{content:'';position:absolute;left:50%;top:0;bottom:0;border-left:.2mm dashed #c9ced6}
.cell::after{content:'';position:absolute;top:50%;left:0;right:0;border-top:.2mm dashed #c9ced6}
.cell.dot{font-family:'LDotted',sans-serif;font-weight:400;color:#000;font-size:calc(var(--c) * .82)}
.wbox{flex:none;display:grid;grid-template-columns:auto 1fr;gap:1.5mm 6mm;align-items:center;border:.5mm solid #374151;border-radius:4mm;padding:4mm 6mm}
.wbig{grid-row:1/4;font-family:'Noto Serif KR',serif;font-size:34pt;font-weight:700;line-height:1.1;padding-right:6mm;border-right:.3mm solid #cbd5e1;white-space:nowrap}
.wmean{font-size:12.5pt;font-weight:500;line-height:1.45;word-break:keep-all}
.wmean b{display:inline-block;margin-right:2.5mm;padding:.3mm 2.5mm;border-radius:99px;background:#111;color:#fff;font-size:9pt;font-weight:700;vertical-align:1px}
.wrows{display:flex;flex-direction:column;gap:1.2mm;flex:none}
.sline{display:flex;flex-direction:column;gap:.8mm;margin-bottom:3mm;flex:none}
.today{flex:none;font-size:13pt;font-weight:700;padding:3mm 5mm;border-radius:3mm;background:#f1f5f9}
.today b{margin-left:3mm;font-family:'Noto Serif KR',serif;font-size:22pt}
.lgrid{flex:none;display:grid;grid-template-columns:repeat(8,1fr);gap:2mm}
.lgrid span{height:15mm;border:.3mm solid #9aa3b0;border-radius:2.5mm;display:flex;align-items:center;justify-content:center;font-family:'Noto Serif KR',serif;font-size:21pt;font-weight:700}
.count{flex:none;display:flex;align-items:center;gap:3mm}
.count b{font-family:'Noto Serif KR',serif;font-size:22pt;margin-right:4mm}
.count i{width:13mm;height:13mm;border-radius:50%;border:.5mm solid #374151}
.fill{flex:none;font-size:19pt;font-weight:700;line-height:1.9;word-break:keep-all}
.hole{display:inline-block;height:12mm;margin:0 2mm;border:.5mm solid #111;border-radius:2mm;vertical-align:middle}
.pick{flex:none;display:flex;gap:6mm;margin-top:3mm}
.pick span{flex:1;padding:3mm;border:.4mm dashed #374151;border-radius:99px;text-align:center;font-size:17pt;font-weight:700}
.link{flex:none;display:grid;grid-template-columns:auto 1fr;column-gap:30mm}
.link p{display:flex;align-items:center;gap:3mm;height:14mm;font-size:13pt;font-weight:500;line-height:1.3;word-break:keep-all}
.link b{font-family:'Noto Serif KR',serif;font-size:18pt;min-width:24mm}
.link i{flex:none;width:3.4mm;height:3.4mm;border-radius:50%;background:#111}
.draw{flex:1;min-height:60mm;border:.5mm solid #374151;border-radius:4mm}
.lines{flex:none;display:flex;flex-direction:column}
.lines i{height:14mm;border-bottom:.3mm solid #555}
.rate{flex:none;display:flex;gap:6mm}
.rate span{flex:1;display:flex;flex-direction:column;align-items:center;gap:1mm;padding:3mm;border:.4mm solid #9aa3b0;border-radius:4mm;font-size:22pt}
.rate b{font-size:11pt}
.cards{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:5mm 6mm}
.cardw,.cardm{height:42mm;border:.4mm dashed #444;border-radius:3mm;display:flex;align-items:center;justify-content:center;text-align:center;padding:4mm;position:relative}
.cardw::before{content:'✂';position:absolute;top:-3.4mm;left:3mm;font-size:9pt;background:#fff;line-height:1;padding:0 .5mm}
.cardw b{font-family:'Noto Serif KR',serif;font-size:30pt;line-height:1.15;word-break:keep-all}
.cardm span{font-size:14pt;font-weight:500;line-height:1.5;word-break:keep-all}
.wk{flex:none;display:flex;align-items:center;gap:4mm;padding:3.5mm 0;border-bottom:.2mm solid #e5e7eb}
.tno{width:7mm;height:7mm;border-radius:50%;background:#333;color:#fff;font-size:9pt;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none}
.wkm{flex:1;min-width:0;display:flex;flex-direction:column;gap:1mm}
.wkm b{font-family:'Noto Serif KR',serif;font-size:19pt}
.wkm span{font-size:10pt;color:#374151;line-height:1.35;word-break:keep-all}
.trows{display:flex;flex-direction:column;gap:1mm;flex:none}
.foot{font-size:9.5pt;color:#555;margin-top:4mm}
.empty{margin:auto;font-size:14pt;color:#888;font-weight:700}
</style></head><body>${pages.join('')}</body></html>`;
}
