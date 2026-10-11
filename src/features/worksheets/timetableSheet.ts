import { cells, esc, head, josa, seeded, sheetDoc, shuffle } from './sheetKit';

// 시간표 활동지(A4): 오늘 하루의 차례를 미리 알고, 스스로 준비하고, 지나간 시간을 확인하게 돕는다.
//  · write  오늘의 시간표 쓰기: 교시마다 과목 이름을 보고 따라 쓴다
//  · cut    오려 붙이기: 과목 카드를 오려서 교시 순서대로 붙인다 (화면의 시간표 맞추기를 손으로)
//  · quiz   시간표 읽기: 몇 교시에 무엇을 하는지, 다음 시간은 무엇인지 찾아본다
//  · check  하루 체크표: 끝난 시간에 표시하고, 그 시간이 어땠는지 고른다
//  · week   이번 주 시간표: 월~금 표를 보고 과목이 몇 번 있는지 센다

export const TT_PARTS: [string, string][] = [
  ['write', '① 시간표 쓰기'],
  ['cut', '② 오려 붙이기'],
  ['quiz', '③ 시간표 읽기'],
  ['check', '④ 하루 체크표'],
  ['week', '⑤ 이번 주 시간표'],
];

export interface TimetableSheetInput {
  /** 오늘 시간표 (1교시부터, 빈 교시는 '') */
  periods: string[];
  /** 월~금 시간표 (없으면 null) */
  week: (string[] | null | undefined)[] | null;
  /** 학급의 다른 과목들 (고르기 문제의 보기로 쓴다) */
  bank: string[];
  icon: (name: string) => string;
  date: Date;
  sel: Record<string, boolean>;
  /** 흐린 글씨(따라 쓰기)를 넣을지 */
  dot: boolean;
}

interface Slot { no: number; name: string }
/** 수업이 있는 교시만 */
export const slotsOf = (periods: string[]): Slot[] => periods.map((name, i) => ({ no: i + 1, name: name.trim() })).filter((s) => s.name);

/** 고르기 문제의 보기 세 개: 정답 + 오늘의 다른 과목 · 학급의 다른 과목에서 둘 (같은 문제면 늘 같은 순서) */
export function choices(answer: string, today: string[], bank: string[], key: string): string[] {
  const rand = seeded(`tt:${key}:${answer}`);
  const others = [...new Set([...shuffle(today, rand), ...shuffle(bank, rand)])].filter((n) => n && n !== answer).slice(0, 2);
  return shuffle([answer, ...others], rand);
}

export interface Quiz { q: string; pick: string[]; answer: string }
/** 시간표 읽기 문제: 첫 시간 · 어느 교시 · 다음 시간 · 마지막 시간 (과목이 한 번만 나오는 것으로 물어 헷갈리지 않게) */
export function quizzes(slots: Slot[], bank: string[], key: string): Quiz[] {
  if (slots.length < 2) return [];
  const names = slots.map((s) => s.name);
  const once = (n: string) => names.filter((x) => x === n).length === 1;
  const out: Quiz[] = [];
  const ask = (q: string, answer: string) => out.push({ q, answer, pick: choices(answer, names, bank, `${key}:${q}`) });
  ask(`${slots[0].no}교시에는 무엇을 하나요?`, slots[0].name);
  const mid = slots[Math.floor(slots.length / 2)];
  if (mid !== slots[0]) ask(`${mid.no}교시에는 무엇을 하나요?`, mid.name);
  const at = slots.findIndex((s, i) => i < slots.length - 1 && once(s.name) && slots[i + 1].name !== s.name);
  if (at >= 0) ask(`${slots[at].name} 시간이 끝나면 무엇을 하나요?`, slots[at + 1].name);
  const last = slots[slots.length - 1];
  if (once(last.name)) out.push({ q: `${josa(last.name, '은', '는')} 몇 교시인가요?`, answer: `${last.no}교시`, pick: Array.from({ length: Math.max(last.no, 4) }, (_, i) => `${i + 1}교시`).slice(-4) });
  return out;
}

const DAYS = ['월', '화', '수', '목', '금'];

export function buildTimetableSheetHTML({ periods, week, bank, icon, date, sel, dot }: TimetableSheetInput): string {
  const slots = slotsOf(periods);
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const pages: string[] = [];
  const none = '<div class="empty">오늘 시간표가 아직 없어요.<br>⚙️ 설정에서 시간표를 넣거나, 시간표 맞추기를 먼저 해 주세요.</div>';
  const subj = (n: string) => `<span class="ic">${esc(icon(n))}</span><b>${esc(n)}</b>`;
  // 수업이 적은 날은 줄을 키워, 따라 쓴 다음 혼자 한 번 더 쓰게 한다
  const rowH = Math.min(40, 208 / Math.max(slots.length, 1));
  const twice = rowH >= 34;

  // ① 시간표 쓰기
  if (sel.write) {
    const longest = Math.max(...slots.map((s) => [...s.name.replace(/\s/g, '')].length), 2);
    const c = Math.min(twice ? (rowH - 7) / 2 : rowH - 6, 15, 84 / longest);
    const letters = (n: string) => [...n.replace(/\s/g, '')];
    pages.push(`<section class="page">${head('오늘의 시간표 쓰기', '오늘 무엇을 하는지 읽고, 과목 이름을 써요.', date)}
      ${slots.length ? `<div class="tt">${slots.map((s) => `<div class="tr" style="height:${rowH.toFixed(1)}mm"><span class="no">${s.no}<small>교시</small></span><span class="sj">${subj(s.name)}</span><span class="wr">${cells(letters(s.name).join(''), letters(s.name).length, c, dot ? 'dot' : 'blank')}${twice ? cells('', letters(s.name).length, c, 'blank') : ''}</span></div>`).join('')}</div>
      <div class="tip">👆 손가락으로 1교시부터 차례로 짚으며 읽어 보세요. 오늘은 모두 <b>${slots.length}시간</b> 수업을 해요.</div>` : none}
    </section>`);
  }

  // ② 오려 붙이기
  if (sel.cut) {
    const h = Math.min(19, 118 / Math.max(slots.length, 1));
    const cards = shuffle(slots.map((s) => s.name), seeded(`cut:${key}`));
    pages.push(`<section class="page">${head('시간표 오려 붙이기', '아래 과목 카드를 오려서 차례대로 붙여요.', date)}
      ${slots.length ? `<div class="tt paste">${slots.map((s) => `<div class="tr" style="height:${h.toFixed(1)}mm"><span class="no">${s.no}<small>교시</small></span><span class="hole">여기에 붙여요</span></div>`).join('')}</div>
      <h2>✂ 과목 카드 <small>점선을 따라 오려요</small></h2>
      <div class="cutcards" style="--h:${Math.max(h - 2, 14).toFixed(1)}mm">${cards.map((n) => `<span>${subj(n)}</span>`).join('')}</div>
      <div class="foot">다 붙였으면 화면의 시간표나 선생님과 함께 맞는지 확인해요.</div>` : none}
    </section>`);
  }

  // ③ 시간표 읽기
  if (sel.quiz) {
    const qs = quizzes(slots, bank, key);
    pages.push(`<section class="page">${head('시간표 읽기', '시간표를 보고 알맞은 것에 ○ 해요.', date)}
      ${qs.length ? `<div class="strip">${slots.map((s) => `<span><i>${s.no}</i>${subj(s.name)}</span>`).join('')}</div>
      ${qs.map((q, i) => `<h2>${i + 1}. ${esc(q.q)}</h2><div class="pick">${q.pick.map((p) => `<span>${p.endsWith('교시') ? esc(p) : subj(p)}</span>`).join('')}</div>`).join('')}
      <h2>${qs.length + 1}. 오늘 가장 기다려지는 시간은 무엇인가요? 까닭도 써 보세요.</h2><div class="lines"><i></i><i></i></div>` : slots.length ? '<div class="empty">수업이 두 시간 이상 있는 날에 만들 수 있어요.</div>' : none}
    </section>`);
  }

  // ④ 하루 체크표
  if (sel.check) {
    const h = Math.min(24, 176 / Math.max(slots.length, 1));
    pages.push(`<section class="page">${head('오늘 하루 체크표', '한 시간이 끝날 때마다 표시해요.', date)}
      ${slots.length ? `<div class="chk"><div class="ch"><span>교시</span><span>무엇을 하나요</span><span>끝났어요</span><span>어땠나요? ○ 하세요</span></div>
      ${slots.map((s) => `<div class="cr" style="height:${h.toFixed(1)}mm"><span class="no">${s.no}</span><span class="sj">${subj(s.name)}</span><span><i class="box"></i></span><span class="faces"><em>😊<small>좋았어요</small></em><em>🙂<small>괜찮았어요</small></em><em>😢<small>힘들었어요</small></em></span></div>`).join('')}</div>
      <h2>🌟 오늘 가장 좋았던 시간은 무엇인가요?</h2><div class="lines"><i></i></div>
      <div class="foot">책상 위에 두고, 한 시간이 끝나면 네모에 ✓ 하세요. 지금 몇 교시인지, 다음에 무엇을 하는지 알 수 있어요.</div>` : none}
    </section>`);
  }

  // ⑤ 이번 주 시간표
  if (sel.week) {
    const cols = DAYS.map((_, d) => (week?.[d] ?? []).map((n) => (n ?? '').trim()));
    const rows = Math.max(...cols.map((col) => { let n = col.length; while (n && !col[n - 1]) n -= 1; return n; }), 0);
    const today = date.getDay() - 1;
    const all = cols.flatMap((col) => col.slice(0, rows)).filter(Boolean);
    const counts = [...new Set(all)].map((n) => ({ n, c: all.filter((x) => x === n).length })).sort((a, b) => b.c - a.c || a.n.localeCompare(b.n));
    const asked = counts.filter((x) => x.c >= 2 && x.c <= 7).slice(0, 2);
    pages.push(`<section class="page">${head('이번 주 시간표', '이번 주에 무엇을 하는지 살펴봐요.', date)}
      ${rows ? `<div class="wk" style="--r:${Math.min(24, 150 / rows).toFixed(1)}mm"><div class="wh"><span></span>${DAYS.map((d, i) => `<span class="${i === today ? 'on' : ''}">${d}</span>`).join('')}</div>
      ${Array.from({ length: rows }, (_, r) => `<div class="wr2"><span class="no">${r + 1}</span>${cols.map((col, i) => `<span class="${i === today ? 'on' : ''}">${col[r] ? `<span class="ic">${esc(icon(col[r]))}</span><b>${esc(col[r])}</b>` : ''}</span>`).join('')}</div>`).join('')}</div>
      ${asked.map((x, i) => `<h2>${i + 1}. 이번 주에 ${subj(x.n)} 시간은 몇 번 있나요? 표에서 찾아 ○ 하고, 수를 써 보세요.</h2><div class="num"><i></i><span>번</span></div>`).join('')}
      <div class="foot">${today >= 0 && today < 5 ? '색이 칠해진 줄이 오늘이에요.' : ''} 좋아하는 과목에 색칠해도 좋아요.</div>` : '<div class="empty">이번 주 시간표가 아직 없어요.<br>⚙️ 설정에서 요일별 시간표를 넣어 주세요.</div>'}
    </section>`);
  }

  return sheetDoc(pages, CSS);
}

const CSS = `
.ic{font-size:1.15em;line-height:1;margin-right:1.5mm}
.tt{flex:none;display:flex;flex-direction:column;border:.5mm solid #111;border-radius:4mm;overflow:hidden}
.tr{display:grid;grid-template-columns:22mm 62mm 1fr;align-items:center;border-top:.3mm solid #9aa3b0}
.tr:first-child{border-top:0}
.no{align-self:stretch;display:flex;align-items:center;justify-content:center;gap:.5mm;background:#eef2ff;font-size:19pt;font-weight:900}
.no small{font-size:10pt;font-weight:700}
.sj{display:flex;align-items:center;padding:0 4mm;font-size:17pt;word-break:keep-all;line-height:1.2}
.sj b{font-weight:900}
.wr{display:flex;flex-direction:column;justify-content:center;gap:1.5mm;padding:0 3mm;border-left:.3mm dashed #9aa3b0;align-self:stretch}
.tt.paste .tr{grid-template-columns:22mm 1fr}
.hole{align-self:stretch;margin:1.5mm 3mm;display:flex;align-items:center;justify-content:center;border:.4mm dashed #9aa3b0;border-radius:3mm;font-size:10pt;color:#b6bcc6}
.cutcards{flex:none;display:grid;grid-template-columns:repeat(3,1fr);gap:4mm 5mm}
.cutcards>span{height:var(--h);display:flex;align-items:center;justify-content:center;border:.4mm dashed #444;border-radius:3mm;font-size:16pt;word-break:keep-all;text-align:center;padding:0 2mm}
.strip{flex:none;display:flex;flex-wrap:wrap;gap:2mm;padding:3mm;border-radius:4mm;background:#f1f5f9}
.strip>span{display:flex;align-items:center;padding:1.5mm 3mm 1.5mm 1.5mm;border-radius:99px;background:#fff;border:.3mm solid #9aa3b0;font-size:12.5pt}
.strip i{width:7mm;height:7mm;border-radius:50%;background:#111;color:#fff;font-style:normal;font-size:10pt;font-weight:700;display:flex;align-items:center;justify-content:center;margin-right:2mm}
.pick .ic{font-size:1.1em}
.chk{flex:none;border:.5mm solid #111;border-radius:4mm;overflow:hidden}
.ch,.cr{display:grid;grid-template-columns:16mm 1fr 24mm 78mm;align-items:center}
.ch{background:#111;color:#fff;font-size:10.5pt;font-weight:700;height:9mm;text-align:center}
.cr{border-top:.3mm solid #9aa3b0}
.cr>span{display:flex;align-items:center;justify-content:center}
.cr .sj{justify-content:flex-start;font-size:16pt}
.box{width:12mm;height:12mm;border:.6mm solid #111;border-radius:2.5mm}
.faces{gap:3mm}
.faces em{font-style:normal;display:flex;flex-direction:column;align-items:center;gap:.5mm;font-size:19pt;line-height:1.1;width:23mm}
.faces small{font-size:9pt;font-weight:700;color:#333}
.wk{flex:none;border:.5mm solid #111;border-radius:4mm;overflow:hidden}
.wh,.wr2{display:grid;grid-template-columns:12mm repeat(5,1fr)}
.wh span{height:10mm;display:flex;align-items:center;justify-content:center;background:#111;color:#fff;font-size:13pt;font-weight:900}
.wh span.on{background:#4f46e5}
.wr2{border-top:.3mm solid #9aa3b0}
.wr2>span{height:var(--r);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5mm;border-left:.3mm solid #c9ced6;font-size:11.5pt;text-align:center;line-height:1.15;word-break:keep-all;padding:0 1mm}
.wr2>span.on{background:#eef2ff}
.wr2>span.no{border-left:0;background:#f1f5f9;font-size:14pt;font-weight:900}
.wr2 .ic{margin:0;font-size:15pt}
.num{flex:none;display:flex;align-items:flex-end;gap:2mm;font-size:15pt;font-weight:700}
.num i{width:22mm;height:15mm;border:.5mm solid #111;border-radius:3mm}
h2 .ic{font-size:1em;margin:0 .5mm 0 0}
`;
