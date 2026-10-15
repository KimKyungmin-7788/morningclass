// 생활표현 문서 세 개를 src/features/expression/data.ts 에서 다시 만든다.
//   node --experimental-strip-types scripts/expr-docs.mjs
// - docs/생활표현-문구.md        : 문구 전체
// - docs/생활표현-그림-목록.md   : 그림 파일 이름 (상황 그림 · 말하기 그림)
// - docs/생활표현-그림-프롬프트.md : <!-- 자동: … --> 칸 안의 그림 목록만 바꾼다 (나머지 지침은 손으로 쓴 그대로)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const { EXPR_TOPICS, TO_LABEL } = await import(`${root}src/features/expression/data.ts`);
const all = EXPR_TOPICS.flatMap((t) => t.items.map((s) => ({ t, s })));
/** 주인공: 상황 차례대로 남 · 여를 번갈아 */
const main = (i) => (i % 2 === 0 ? '남 · Boy' : '여 · Girl');
const partner = (s) => (s.to === 'teacher' ? 'Teacher' : 'Friend');
const ex = all[0];

// ── 문구 ──
let out = `# 오늘의 생활표현 · 문구 모음

앱에 들어 있는 문구를 그대로 옮긴 것이에요 (\`src/features/expression/data.ts\`, 이 문서는 \`scripts/expr-docs.mjs\`로 만들어요).
고치고 싶은 곳을 이 문서에 표시해 주시면 앱에 반영해요.

- 상황은 **${EXPR_TOPICS.length}개 주제 × 10개 = ${all.length}개**예요. 요일에 묶이지 않아요.
- 날마다 학급마다 **무작위로 하나**가 나와요. 한 번 나온 상황은 **${all.length}개가 모두 한 번씩 나온 뒤에야** 다시 나와요. 같은 날은 다시 열어도 같은 상황이에요.
- 상황마다 세 수준으로 연습해요: **문장** · **낱말** · **그림 카드**(두 장 중 맞는 카드 고르기).
- **이어서**는 연습 화면 위쪽에 작게 보이는 다음 말이에요.

`;
EXPR_TOPICS.forEach((t, n) => {
  out += `## ${n + 1}. ${t.name} (\`${t.id}\`)\n\n그림 카드 그림 ${t.cardEmoji} · 맞게 골랐을 때: 선생님께 "${t.cardAct.teacher}" / 친구에게 "${t.cardAct.friend}"\n\n`;
  out += `| # | 상황 | 누구에게 | 문장 | 낱말 | 그림 카드 (다른 보기) | 이어서 |\n|---|---|---|---|---|---|---|\n`;
  t.items.forEach((s, i) => {
    out += `| ${i + 1} | ${s.emoji} **${s.title}**<br>${s.scene} | ${TO_LABEL[s.to]} | ${s.sentence} | ${s.word} | ${s.cardEmoji ?? t.cardEmoji} ${s.card} (${s.wrong.emoji} ${s.wrong.text}) | ${s.next.when} → ${s.next.say} |\n`;
  });
  out += '\n';
});
writeFileSync(`${root}docs/생활표현-문구.md`, out);

// ── 그림 목록 ──
out = `# 오늘의 생활표현 · 그림 목록

그림은 파일 이름만 맞춰 \`public/img/expression/\` 폴더에 넣으면 저절로 나와요 (이 문서는 \`scripts/expr-docs.mjs\`로 만들어요).
그림이 없는 상황은 이모지가 대신 나와요. 일부만 넣어도 돼요.

## 파일 규칙

- 폴더: \`public/img/expression/\`
- 상황마다 **두 장**
  - 상황 그림 \`<파일 이름>.webp\` — 곤란한(고마운 · 미안한 · 싫은) 순간. 첫 화면에 크게 나와요.
  - 말하기 그림 \`<파일 이름>-say.webp\` — 바르게 말하는 모습. 연습 화면 위쪽에 나와요. 없으면 상황 그림이 대신 나와요.
- 크기: 가로 4 : 세로 3, 가로 1024~1600px, 한 장 300KB 이하 webp
- 그림 안에 글자는 넣지 않아요.
- 주인공은 남학생 · 여학생을 번갈아 쓰고(아래 표의 '주인공'), 친구 · 선생님은 늘 같은 사람. 모두 12살 정도(5~6학년)로 보이게.
- 만드는 법 · 프롬프트: [생활표현-그림-프롬프트.md](생활표현-그림-프롬프트.md)

`;
let k = 0;
EXPR_TOPICS.forEach((t, n) => {
  out += `## ${n + 1}. ${t.name}\n\n| 상황 그림 | 말하기 그림 | 주인공 | 상대 | 장면 |\n|---|---|---|---|---|\n`;
  t.items.forEach((s) => { out += `| \`${s.id}.webp\` | \`${s.id}-say.webp\` | ${main(k++).split(' ')[0]} | ${s.to === 'teacher' ? '선생님' : '친구'} | ${s.scene} |\n`; });
  out += '\n';
});
writeFileSync(`${root}docs/생활표현-그림-목록.md`, out);

// ── 프롬프트 문서의 자동 칸 ──
const pPath = `${root}docs/생활표현-그림-프롬프트.md`;
const prompt = readFileSync(pPath, 'utf8');
const BEGIN = '<!-- 자동: 그림 목록 (scripts/expr-docs.mjs 가 data.ts 에서 만든다. 손으로 고치지 않는다) -->';
const END = '<!-- /자동 -->';
let gen = `## 5. 그림 목록 (${all.length}상황 × 2장)

장면은 한국어로 적어도 그림 AI가 잘 알아들어요. 아래 칸을 4번 장면 블록에 그대로 옮겨요.

- **상황 그림**: \`[MAIN]\` + \`[SCENE]\`(상황) + \`[PARTNER]\`(상대가 보이게)
- **말하기 그림**: 상황 그림을 참고 그림으로 올리고 \`Same scene and characters as the reference image.\` + \`[MAIN]\` + 아래처럼

\`\`\`text
[SAY] The main child faces the <Teacher/Friend> and politely says (Korean): "<문장>"
Mouth open mid-sentence, calm body language. The partner listens kindly. Do NOT write any words in the image.
\`\`\`

- '싫다고 말하기'의 말하기 그림은 화난 얼굴이 아니라 **차분하고 단호한** 얼굴 · 손바닥을 펴 '멈춰' 몸짓으로.

**예시 — 한 상황에 두 번 만들어요** (\`${ex.s.id}\`, 3번 고정 블록 [STYLE] [CAST] [RULES]를 맨 앞에 붙여요)

① 상황 그림 → \`${ex.s.id}.webp\` (참고 그림: 인물 설정 그림)

\`\`\`text
[MAIN] ${main(0).split(' · ')[1]}
[SCENE] ${ex.s.scene}
[PARTNER] The ${partner(ex.s)} is clearly visible in the scene.
\`\`\`

② 말하기 그림 → \`${ex.s.id}-say.webp\` (참고 그림: 방금 만든 ① 상황 그림)

\`\`\`text
Same scene and characters as the reference image.
[MAIN] ${main(0).split(' · ')[1]}
[SAY] The main child faces the ${partner(ex.s)} and politely says (Korean): "${ex.s.sentence}"
Mouth open mid-sentence, calm body language. The partner listens kindly. Do NOT write any words in the image.
\`\`\`

`;
k = 0;
EXPR_TOPICS.forEach((t, n) => {
  gen += `### 5-${n + 1}. ${t.name}\n\n| 파일 (상황 · 말하기) | [MAIN] | [SCENE] | [PARTNER] | [SAY] 문장 |\n|---|---|---|---|---|\n`;
  t.items.forEach((s) => { gen += `| \`${s.id}.webp\`<br>\`${s.id}-say.webp\` | ${main(k++)} | ${s.scene} | ${partner(s)} | ${s.sentence} |\n`; });
  gen += '\n';
});
const a = prompt.indexOf(BEGIN); const b = prompt.indexOf(END);
if (a < 0 || b < 0) throw new Error('프롬프트 문서에 자동 칸 표시가 없어요');
writeFileSync(pPath, `${prompt.slice(0, a + BEGIN.length)}\n${gen}${prompt.slice(b)}`);
console.log(`문서 3개를 만들었어요 (상황 ${all.length}개)`);
