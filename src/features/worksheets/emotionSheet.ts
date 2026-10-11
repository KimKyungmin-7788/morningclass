import { cells, esc, head, seeded, sheetDoc, shuffle } from './sheetKit';

// 감정 활동지(A4): 내 마음을 알아차리고, 이름 붙이고, 말로 전하고, 스스로 돌보게 돕는다 (화면의 마음 일기를 종이로).
//  · today  오늘 내 마음: 감정 고르기 · 몸의 어디에서 느끼는지 표시하기 · 문장으로 말하기
//  · words  감정 낱말: 표정과 낱말 잇기 · 낱말 따라 쓰기
//  · when   이럴 땐 어떤 마음?: 상황을 읽고 내 마음 고르기 (정답은 없다)
//  · care   마음 돌보기: 힘든 마음이 들 때 할 수 있는 일 고르기
//  · cards  감정 카드: 오려서 내 마음을 보여 줄 때 쓴다
// 학생 이름이나 그날 고른 감정은 싣지 않는다 — 누구에게나 나눠 줄 수 있는 빈 활동지다.

export const EMO_PARTS: [string, string][] = [
  ['today', '① 오늘 내 마음'],
  ['words', '② 감정 낱말'],
  ['when', '③ 이럴 땐 어떤 마음?'],
  ['care', '④ 마음 돌보기'],
  ['cards', '⑤ 감정 카드'],
];

export interface EmoInfo { k: string; l: string; say: string }
export interface EmotionSheetInput {
  emotions: EmoInfo[];
  date: Date;
  sel: Record<string, boolean>;
  /** 흐린 글씨(따라 쓰기)를 넣을지 */
  dot: boolean;
}

/** 상황과, 그때 들 법한 마음 (보기에는 꼭 넣되 정답으로 삼지는 않는다) */
export const SITUATIONS: { text: string; likely: string[] }[] = [
  { text: '친구가 "같이 놀자!" 하고 말했어요.', likely: ['joy', 'excited'] },
  { text: '아끼는 물건을 잃어버렸어요.', likely: ['sad', 'anxious'] },
  { text: '친구가 내 것을 말없이 가져갔어요.', likely: ['angry', 'sad'] },
  { text: '어젯밤에 잠을 조금밖에 못 잤어요.', likely: ['tired', 'meh'] },
  { text: '내일 처음 가 보는 곳에 가요.', likely: ['anxious', 'excited'] },
  { text: '선생님이 "참 잘했어요!" 하고 칭찬했어요.', likely: ['joy', 'excited'] },
  { text: '배가 아파서 밥을 못 먹었어요.', likely: ['sick', 'sad'] },
  { text: '하고 싶은 놀이를 못 하게 되었어요.', likely: ['angry', 'sad'] },
  { text: '좋아하는 급식이 나왔어요.', likely: ['joy', 'excited'] },
  { text: '많은 사람 앞에서 발표를 해야 해요.', likely: ['anxious', 'excited'] },
];
/** 그날의 상황 네 가지 (날짜가 같으면 같은 문제) */
export const situationsOn = (key: string) => shuffle(SITUATIONS, seeded(`emo:${key}`)).slice(0, 4);
/** 상황 하나의 보기 네 개: 들 법한 마음 둘 + 다른 마음 둘 */
export function facesFor(likely: string[], all: string[], key: string): string[] {
  const rand = seeded(`face:${key}`);
  return shuffle([...likely, ...shuffle(all.filter((k) => !likely.includes(k)), rand).slice(0, 4 - likely.length)], rand);
}

const CARE = [['🌬️', '숨을 크게 쉬어요'], ['🔢', '열까지 천천히 세요'], ['💧', '물을 마셔요'], ['🙋', '선생님께 말해요'], ['🪑', '조용한 곳에서 쉬어요'], ['🤸', '몸을 쭉 펴요'], ['💭', '좋아하는 것을 떠올려요'], ['🧸', '좋아하는 것을 안아요']];
const img = (k: string) => `<img src="/img/emotion/${esc(k)}.webp" alt="">`;

export function buildEmotionSheetHTML({ emotions, date, sel, dot }: EmotionSheetInput): string {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  const of = (k: string) => emotions.find((e) => e.k === k)!;
  const face = (e: EmoInfo) => `<span class="fc">${img(e.k)}<b>${esc(e.l)}</b></span>`;
  const pages: string[] = [];

  // ① 오늘 내 마음
  if (sel.today) {
    pages.push(`<section class="page">${head('오늘 내 마음', '지금 내 마음을 살펴봐요. 어떤 마음이든 괜찮아요.', date)}
      <h2>1. 지금 내 마음에 ○ 하세요 <small>여러 개를 골라도 좋아요</small></h2>
      <div class="faces8">${emotions.map(face).join('')}</div>
      <div class="two">
        <div><h2>2. 그 마음이 몸의 어디에서 느껴지나요? <small>색칠하거나 ○ 하세요</small></h2><div class="body"><img src="/img/emotion/person.webp" alt=""></div></div>
        <div><h2>3. 내 마음을 말해 보세요</h2>
          <div class="say"><p>나는 지금</p><i></i><p>왜냐하면</p><i></i><i></i></div>
          <div class="bank"><small>이렇게 말할 수 있어요</small>${emotions.map((e) => `<span>${esc(e.say)}</span>`).join('')}</div>
        </div>
      </div>
      <div class="tip">💬 다 했으면 짝이나 선생님에게 내 마음을 말해 보세요. "나는 지금 ○○○. 왜냐하면 ○○○."</div>
    </section>`);
  }

  // ② 감정 낱말
  if (sel.words) {
    const rand = seeded(`words:${key}`);
    const four = shuffle(emotions, rand).slice(0, 4);
    const right = shuffle(four, rand);
    const c = 12;
    pages.push(`<section class="page">${head('감정 낱말', '마음에는 이름이 있어요. 표정을 보고 이름을 알아봐요.', date)}
      <h2>1. 표정과 알맞은 낱말을 줄로 이어 보세요</h2>
      <div class="link"><div>${four.map((e) => `<p>${img(e.k)}<i></i></p>`).join('')}</div><div>${right.map((e) => `<p><i></i><b>${esc(e.l)}</b><span>${esc(e.say)}</span></p>`).join('')}</div></div>
      <h2>2. 감정 낱말을 ${dot ? '따라 써' : '보고 써'} 보세요</h2>
      <div class="trace">${emotions.map((e) => `<div>${img(e.k)}<b>${esc(e.l)}</b>${cells(e.l, 2, c, dot ? 'dot' : 'blank')}${cells('', 2, c, 'blank')}</div>`).join('')}</div>
      <h2>3. 지금 내 마음과 가장 가까운 낱말을 골라 쓰고, 그 표정을 그려 보세요</h2>
      <div class="mine">${cells('', 2, 20, 'blank')}<div class="circle"></div><p>낱말을 쓴 다음, 동그라미 안에<br>내 표정을 그려요.</p></div>
    </section>`);
  }

  // ③ 이럴 땐 어떤 마음?
  if (sel.when) {
    const all = emotions.map((e) => e.k);
    pages.push(`<section class="page">${head('이럴 땐 어떤 마음?', '글을 읽고, 나라면 어떤 마음일지 ○ 해요.', date)}
      <div class="tip" style="margin:0 0 1mm">정답은 없어요. 같은 일에도 사람마다 마음이 달라요. 내 마음을 골라 보세요.</div>
      ${situationsOn(key).map((s, i) => `<div class="sit"><h2>${i + 1}. ${esc(s.text)}</h2><div class="faces4">${facesFor(s.likely.filter((k) => all.includes(k)), all, `${key}:${i}`).map((k) => face(of(k))).join('')}</div></div>`).join('')}
      <div class="sit"><h2>5. 요즘 나에게 있었던 일을 하나 쓰고, 그때 내 마음에 ○ 하세요.</h2><div class="lines"><i></i></div><div class="faces8 small">${emotions.map(face).join('')}</div></div>
      <div class="tip">💬 친구는 어떤 마음을 골랐나요? 나와 같은 것, 다른 것을 이야기해 보세요.</div>
    </section>`);
  }

  // ④ 마음 돌보기
  if (sel.care) {
    const hard = ['angry', 'sad', 'anxious'].map(of).filter(Boolean);
    pages.push(`<section class="page">${head('마음 돌보기', '힘든 마음이 들 때 나를 도와주는 방법을 찾아요.', date)}
      <div class="hard">${hard.map(face).join('')}<p>화가 나거나, 슬프거나, 불안한 마음이 들 때가 있어요.<br><b>그런 마음이 드는 것은 잘못이 아니에요.</b> 이럴 때 내가 할 수 있는 일을 골라 봐요.</p></div>
      <h2>1. 내가 해 보고 싶은 방법에 ✓ 하세요</h2>
      <div class="care">${CARE.map(([e, t]) => `<span><i></i><em>${e}</em><b>${t}</b></span>`).join('')}</div>
      <h2>2. 내가 고른 방법을 써 보세요</h2><div class="lines"><i></i></div>
      <h2>3. 기분이 좋아지려면 나는 무엇을 하나요? 그리거나 써 보세요</h2><div class="draw"></div>
    </section>`);
  }

  // ⑤ 감정 카드
  if (sel.cards) {
    pages.push(`<section class="page">${head('감정 카드', '점선을 따라 오려요. 내 마음을 보여 줄 때 써요.', date)}
      <div class="ecards">${emotions.map((e) => `<div>${img(e.k)}<b>${esc(e.l)}</b><span>${esc(e.say)}</span></div>`).join('')}</div>
      <div class="foot">✂ 말로 하기 어려울 때 카드를 들어 내 마음을 알려 주세요. 책상 위에 지금 마음 카드를 올려 두어도 좋아요.</div>
    </section>`);
  }

  return sheetDoc(pages, CSS);
}

const CSS = `
.fc{display:flex;flex-direction:column;align-items:center;gap:1mm}
.fc img{width:100%;aspect-ratio:1;object-fit:contain}
.fc b{font-size:13pt;font-weight:900}
.faces8{flex:none;display:grid;grid-template-columns:repeat(8,1fr);gap:2.5mm}
.faces8 .fc{padding:2mm 1mm;border:.3mm solid #c9ced6;border-radius:3mm}
.two{flex:1;min-height:0;display:grid;grid-template-columns:78mm 1fr;gap:6mm}
.two>div{display:flex;flex-direction:column;min-height:0}
.body{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;border:.4mm solid #9aa3b0;border-radius:4mm;padding:3mm}
.body img{max-width:100%;max-height:100%;object-fit:contain;filter:grayscale(1) brightness(1.25) contrast(.8)}
.say{flex:none;display:flex;flex-direction:column}
.say p{font-size:15pt;font-weight:900;margin-top:3mm}
.say i{height:13mm;border-bottom:.3mm solid #555}
.bank{flex:none;margin-top:5mm;display:flex;flex-wrap:wrap;gap:2mm;padding:3mm;border-radius:3mm;background:#f1f5f9}
.bank small{width:100%;font-size:9.5pt;color:#555;font-weight:500}
.bank span{padding:1mm 3mm;border-radius:99px;background:#fff;border:.3mm solid #9aa3b0;font-size:11.5pt;font-weight:700}
.link{flex:none;display:grid;grid-template-columns:auto 1fr;column-gap:38mm}
.link p{display:flex;align-items:center;gap:4mm;height:24mm}
.link img{width:21mm;height:21mm;object-fit:contain}
.link i{flex:none;width:3.6mm;height:3.6mm;border-radius:50%;background:#111}
.link b{font-family:'Noto Serif KR',serif;font-size:21pt;min-width:22mm}
.link span{font-size:12pt;color:#444;font-weight:500}
.trace{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm}
.trace>div{display:flex;align-items:center;gap:3mm}
.trace img{width:13mm;height:13mm;object-fit:contain}
.trace b{font-family:'Noto Serif KR',serif;font-size:17pt;width:17mm}
.trace .cells+.cells{margin-left:2mm}
.mine{flex:none;display:flex;align-items:center;gap:8mm}
.mine .circle{width:38mm;height:38mm;border:.6mm solid #111;border-radius:50%}
.mine p{font-size:11pt;font-weight:500;color:#444;line-height:1.6}
.faces8.small{margin-top:3mm;gap:2mm}
.faces8.small .fc b{font-size:10.5pt}
.sit{flex:none}
.sit h2{margin:4.5mm 0 2mm;font-size:14pt}
.faces4{display:grid;grid-template-columns:repeat(4,1fr);gap:5mm;padding:0 6mm}
.faces4 .fc{flex-direction:row;justify-content:center;gap:3mm;padding:1.5mm;border:.3mm solid #c9ced6;border-radius:99px}
.faces4 .fc img{width:17mm}
.hard{flex:none;display:flex;align-items:center;gap:3mm;padding:3mm 4mm;border-radius:4mm;background:#f1f5f9}
.hard .fc{width:19mm;flex:none}
.hard .fc b{font-size:10pt}
.hard p{margin-left:3mm;font-size:12pt;font-weight:500;line-height:1.6;word-break:keep-all}
.care{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:3mm 6mm}
.care span{display:flex;align-items:center;gap:3mm;height:15mm;padding:0 4mm;border:.3mm solid #9aa3b0;border-radius:3mm}
.care i{flex:none;width:8mm;height:8mm;border:.5mm solid #111;border-radius:2mm}
.care em{font-style:normal;font-size:17pt}
.care b{font-size:13pt;font-weight:700;word-break:keep-all}
.draw{flex:1;min-height:40mm;border:.5mm solid #374151;border-radius:4mm}
.ecards{flex:none;display:grid;grid-template-columns:repeat(4,1fr);gap:5mm 4mm;margin-top:2mm}
.ecards>div{position:relative;height:108mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2mm;border:.4mm dashed #444;border-radius:4mm;padding:3mm}
.ecards img{width:100%;aspect-ratio:1;object-fit:contain}
.ecards b{font-family:'Noto Serif KR',serif;font-size:24pt;line-height:1.1}
.ecards span{font-size:12pt;font-weight:500;color:#333}
`;
