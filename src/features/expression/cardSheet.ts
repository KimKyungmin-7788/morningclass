import { esc, sheetDoc } from '@/features/worksheets/sheetKit';
import { TO_LABEL } from './data';
import type { ExprPick } from './model';

// 생활표현 인쇄물(A4): 오려서 쓰는 그림 카드와 이번 주 문장 띠. 학생 이름은 싣지 않는다.
//  · cards  오늘의 그림 카드 — 그림 카드(AAC) 수준 학생이 건네며 표현한다
//  · strip  최근 문장 띠 — 최근에 나온 상황(최대 5개)의 문장 · 낱말을 함께 적는다

export const EXPR_PARTS: [string, string][] = [
  ['cards', '① 그림 카드'],
  ['strip', '② 최근 문장 띠'],
];

const CSS = `
.cards{flex:1;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(3,1fr)}
.cd{border:.4mm dashed #9ca3af;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4mm;padding:4mm}
.cd .em{font-size:44mm;line-height:1}
.cd b{font-size:26pt;font-weight:900;letter-spacing:.5mm}
.strips{flex:1;display:flex;flex-direction:column}
.st{flex:1;border-bottom:.4mm dashed #9ca3af;display:flex;align-items:center;gap:5mm;padding:0 4mm}
.st:first-child{border-top:.4mm dashed #9ca3af}
.st .em{font-size:18mm;line-height:1;flex:none}
.st b{display:block;font-size:20pt;font-weight:900;line-height:1.35;word-break:keep-all}
.st small{display:block;font-size:11pt;font-weight:700;color:#555}
.cap{flex:none;font-size:10pt;color:#555;font-weight:500;margin-bottom:3mm}
`;

export function buildExprCardsHTML(today: ExprPick, recent: ExprPick[], sel: Record<string, boolean>): string {
  const pages: string[] = [];
  const { topic, situation: t } = today;
  if (sel.cards) {
    const emoji = t.cardEmoji ?? topic.cardEmoji;
    pages.push(`<section class="page"><div class="cap">${esc(topic.name)} · 그림 카드 "${esc(t.card)}" — 점선을 따라 오려요. 코팅하면 오래 써요.</div><div class="cards">${
      Array.from({ length: 6 }, () => `<div class="cd"><span class="em">${emoji}</span><b>${esc(t.card)}</b></div>`).join('')}</div></section>`);
  }
  if (sel.strip) {
    const list = recent.length ? recent : [today];
    pages.push(`<section class="page"><div class="cap">최근 생활표현 문장 띠 (최근 ${list.length}개) — 오려서 책상이나 칠판에 붙여요.</div><div class="strips">${list.map(({ topic: tp, situation: s }) => (
      `<div class="st"><span class="em">${s.emoji}</span><div><small>${esc(tp.name)} · ${esc(s.title)} · ${TO_LABEL[s.to]}</small><b>${esc(s.sentence)}</b><small>낱말: ${esc(s.word)} · ${esc(s.next.when)} → ${esc(s.next.say)}</small></div></div>`
    )).join('')}</div></section>`);
  }
  return sheetDoc(pages, CSS);
}
