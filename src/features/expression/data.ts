// 오늘의 생활표현 자료(DB): 주제(갈래) 10개 × 상황 10개 = 100개.
// 요일에 묶지 않는다 — 날마다 학급별로 하나씩 무작위로 뽑되, 100개가 한 바퀴 다 나온 뒤에야 다시 나온다 (model.ts drawToday).
// 상황마다 세 수준의 표현이 있다: 문장 · 낱말 · 그림 카드(AAC). 모든 학생이 자기 수준으로 함께 연습한다.
// 그림은 id 이름으로 public/img/expression/ 에 넣으면 저절로 나온다: 상황 그림 <id>.webp, 바르게 말하는 그림 <id>-say.webp
// 이 파일을 고치면 문서도 다시 만든다: node --experimental-strip-types scripts/expr-docs.mjs

export type ExprTo = 'teacher' | 'friend';
export const TO_LABEL: Record<ExprTo, string> = { teacher: '선생님께', friend: '친구에게' };

export interface ExprSituation {
  /** 그림 파일 이름: public/img/expression/<id>.webp (없으면 .png, 그것도 없으면 emoji) */
  id: string;
  emoji: string;
  /** 짧은 상황 이름 (카드) */
  title: string;
  /** 상황 문장 — 먼저 혼자 해 본 데까지 들어 있다 */
  scene: string;
  to: ExprTo;
  sentence: string;
  /** 낱말 수준의 말 — 문장 안에 그대로 들어 있다 */
  word: string;
  /** 그림 카드에 적힌 말 */
  card: string;
  /** 그림 카드 그림 — 없으면 주제의 그림 */
  cardEmoji?: string;
  /** 그림 카드 고르기의 다른 보기 (이 상황에 맞지 않는 카드) */
  wrong: { emoji: string; text: string };
  /** 이어서 할 말: 상대가 어떻게 하면(when) → 무엇이라고 말한다(say) */
  next: { when: string; say: string };
}

export interface ExprTopic {
  id: string;
  name: string;
  /** 그림 카드 그림 */
  cardEmoji: string;
  /** 그림 카드 수준에서 하는 행동 */
  cardAct: Record<ExprTo, string>;
  items: ExprSituation[];
}

export const EXPR_TOPICS: ExprTopic[] = [
  {
    id: 'help',
    name: '도움 요청하기',
    cardEmoji: '🙋',
    cardAct: { teacher: '그림 카드를 선생님께 건네요', friend: '그림 카드를 친구에게 건네요' },
    items: [
      {
        id: 'help-1-bottle', emoji: '🧴', title: '물병 뚜껑이 안 열려요', to: 'teacher',
        scene: '목이 말라요. 물병 뚜껑을 돌려 봤는데 꽉 닫혀서 안 열려요.',
        sentence: '선생님, 뚜껑 좀 열어 주세요.', word: '열어 주세요', card: '열어 주세요', cardEmoji: '🧴', wrong: { emoji: '👋', text: '안녕하세요' }, next: { when: '열어 주시면', say: '고맙습니다.' },
      },
      {
        id: 'help-2-spoon', emoji: '🥄', title: '숟가락이 없어요', to: 'teacher',
        scene: '급식 시간이에요. 식판을 받았는데 숟가락이 없어요.',
        sentence: '선생님, 숟가락이 없어요. 하나 주세요.', word: '숟가락', card: '숟가락 주세요', cardEmoji: '🥄', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '숟가락을 주시면', say: '고맙습니다.' },
      },
      {
        id: 'help-3-shelf', emoji: '🖍️', title: '손이 안 닿아요', to: 'teacher',
        scene: '높은 칸에 있는 색연필을 꺼내야 해요. 까치발을 했는데도 손이 안 닿아요.',
        sentence: '선생님, 손이 안 닿아요. 꺼내 주세요.', word: '꺼내 주세요', card: '꺼내 주세요', cardEmoji: '🖍️', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '꺼내 주시면', say: '고맙습니다.' },
      },
      {
        id: 'help-4-worksheet', emoji: '📝', title: '무엇을 하는지 모르겠어요', to: 'teacher',
        scene: '학습지를 받았어요. 읽어 봤는데 무엇을 해야 하는지 모르겠어요.',
        sentence: '선생님, 잘 모르겠어요. 다시 알려 주세요.', word: '알려 주세요', card: '알려 주세요', cardEmoji: '❓', wrong: { emoji: '🙅', text: '싫어요' }, next: { when: '알려 주시면', say: '이제 알겠어요. 고맙습니다.' },
      },
      {
        id: 'help-5-zipper', emoji: '🧥', title: '친구에게 도움 청하기', to: 'friend',
        scene: '겉옷 지퍼를 올려 봤는데 끝이 안 끼워져요. 선생님은 다른 친구를 돕고 계세요.',
        sentence: '지퍼가 안 잠겨. 좀 도와줘.', word: '도와줘', card: '도와줘', wrong: { emoji: '👋', text: '안녕' }, next: { when: '도와주면', say: '고마워.' },
      },
      {
        id: 'help-6-shoe', emoji: '👟', title: '신발 끈이 풀렸어요', to: 'teacher',
        scene: '체육 시간이에요. 신발 끈이 풀렸는데 혼자 묶기가 어려워요.',
        sentence: '선생님, 신발 끈 좀 묶어 주세요.', word: '묶어 주세요', card: '묶어 주세요', cardEmoji: '👟', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '묶어 주시면', say: '고맙습니다.' },
      },
      {
        id: 'help-7-box', emoji: '📦', title: '상자가 무거워요', to: 'friend',
        scene: '교실로 상자를 옮겨야 해요. 혼자 들기엔 너무 무거워요.',
        sentence: '상자가 무거워. 같이 들어 줄래?', word: '들어 줄래?', card: '도와줘', cardEmoji: '📦', wrong: { emoji: '👋', text: '안녕' }, next: { when: '같이 들어 주면', say: '고마워.' },
      },
      {
        id: 'help-8-pencilcase', emoji: '🔍', title: '필통이 없어졌어요', to: 'teacher',
        scene: '필통이 안 보여요. 가방이랑 책상 속을 다 찾아봤는데 없어요.',
        sentence: '선생님, 필통이 없어졌어요. 같이 찾아 주세요.', word: '찾아 주세요', card: '찾아 주세요', cardEmoji: '🔍', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '찾아 주시면', say: '고맙습니다.' },
      },
      {
        id: 'help-9-board', emoji: '👀', title: '칠판 글씨가 안 보여요', to: 'teacher',
        scene: '칠판 글씨가 작아서 잘 안 보여요. 눈을 찡그려 봐도 안 보여요.',
        sentence: '선생님, 글씨가 잘 안 보여요. 크게 써 주세요.', word: '안 보여요', card: '안 보여요', cardEmoji: '👀', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '크게 써 주시면', say: '고맙습니다.' },
      },
      {
        id: 'help-10-glue', emoji: '🧴', title: '풀 뚜껑이 안 열려요', to: 'friend',
        scene: '만들기 시간에 풀 뚜껑을 열어 봤는데 꽉 닫혀 있어요. 짝꿍이 옆에 있어요.',
        sentence: '풀 뚜껑이 안 열려. 열어 줄래?', word: '열어 줄래?', card: '도와줘', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '열어 주면', say: '고마워.' },
      },
    ],
  },
  {
    id: 'thanks',
    name: '고마움 말하기',
    cardEmoji: '🙏',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 보여 줘요' },
    items: [
      {
        id: 'thanks-1-eraser', emoji: '🧽', title: '지우개를 주워 줬어요', to: 'friend',
        scene: '지우개가 책상 밑으로 굴러갔어요. 짝꿍이 주워서 건네줬어요.',
        sentence: '지우개 주워 줘서 고마워.', word: '고마워', card: '고마워', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '이어서', say: '덕분에 찾았어.' },
      },
      {
        id: 'thanks-2-milk', emoji: '🥛', title: '우유를 열어 주셨어요', to: 'teacher',
        scene: '우유갑이 안 열려서 도움을 청했어요. 선생님이 열어 주셨어요.',
        sentence: '선생님, 열어 주셔서 감사합니다.', word: '감사합니다', card: '감사합니다', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '이어서', say: '잘 마실게요.' },
      },
      {
        id: 'thanks-3-crayon', emoji: '🖍️', title: '색연필을 빌려줬어요', to: 'friend',
        scene: '빨간 색연필이 없어요. 친구가 자기 색연필을 빌려줬어요.',
        sentence: '빌려줘서 고마워. 다 쓰고 돌려줄게.', word: '고마워', card: '고마워', wrong: { emoji: '👋', text: '안녕' }, next: { when: '다 쓰면', say: '여기 있어. 잘 썼어.' },
      },
      {
        id: 'thanks-4-door', emoji: '🚪', title: '문을 열어 줬어요', to: 'friend',
        scene: '두 손으로 짐을 들고 있어서 문을 못 열어요. 친구가 문을 열어 줬어요.',
        sentence: '문 열어 줘서 고마워.', word: '고마워', card: '고마워', wrong: { emoji: '🚻', text: '화장실 가고 싶어' }, next: { when: '이어서', say: '다음엔 내가 열어 줄게.' },
      },
      {
        id: 'thanks-5-praise', emoji: '🌟', title: '칭찬해 주셨어요', to: 'teacher',
        scene: '그림을 끝까지 그렸어요. 선생님이 정말 잘했다고 칭찬해 주셨어요.',
        sentence: '선생님, 칭찬해 주셔서 고맙습니다.', word: '고맙습니다', card: '고맙습니다', wrong: { emoji: '🙅', text: '싫어요' }, next: { when: '이어서', say: '다음에도 열심히 할게요.' },
      },
      {
        id: 'thanks-6-wait', emoji: '⏳', title: '친구가 기다려 줬어요', to: 'friend',
        scene: '신발을 늦게 갈아 신었어요. 친구가 먼저 가지 않고 기다려 줬어요.',
        sentence: '기다려 줘서 고마워.', word: '고마워', card: '고마워', wrong: { emoji: '😴', text: '졸려' }, next: { when: '이어서', say: '같이 가자.' },
      },
      {
        id: 'thanks-7-more', emoji: '🍱', title: '급식을 더 주셨어요', to: 'teacher',
        scene: '급식이 맛있어서 더 먹고 싶었어요. 선생님이 조금 더 주셨어요.',
        sentence: '선생님, 더 주셔서 감사합니다.', word: '감사합니다', card: '감사합니다', wrong: { emoji: '🙅', text: '싫어요' }, next: { when: '이어서', say: '맛있게 먹을게요.' },
      },
      {
        id: 'thanks-8-explain', emoji: '📝', title: '친구가 알려 줬어요', to: 'friend',
        scene: '학습지 문제를 몰라서 고민했어요. 짝꿍이 차근차근 알려 줬어요.',
        sentence: '알려 줘서 고마워. 이제 알겠어.', word: '고마워', card: '고마워', wrong: { emoji: '🚻', text: '화장실 가고 싶어' }, next: { when: '이어서', say: '나도 다음에 도와줄게.' },
      },
      {
        id: 'thanks-9-umbrella', emoji: '☂️', title: '우산을 같이 써 줬어요', to: 'friend',
        scene: '비가 오는데 우산이 없어요. 친구가 우산을 같이 쓰자고 했어요.',
        sentence: '우산 같이 써 줘서 고마워.', word: '고마워', card: '고마워', wrong: { emoji: '😴', text: '졸려' }, next: { when: '이어서', say: '덕분에 비 안 맞았어.' },
      },
      {
        id: 'thanks-10-sticker', emoji: '⭐', title: '스티커를 주셨어요', to: 'teacher',
        scene: '청소를 열심히 했어요. 선생님이 칭찬 스티커를 주셨어요.',
        sentence: '선생님, 스티커 주셔서 고맙습니다.', word: '고맙습니다', card: '고맙습니다', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '이어서', say: '내일도 열심히 할게요.' },
      },
    ],
  },
  {
    id: 'sorry',
    name: '사과하기',
    cardEmoji: '🙇',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드리고 고개를 숙여요', friend: '그림 카드를 친구에게 보여 주고 고개를 숙여요' },
    items: [
      {
        id: 'sorry-1-bump', emoji: '💥', title: '친구와 부딪쳤어요', to: 'friend',
        scene: '복도에서 뛰다가 친구와 부딪쳤어요. 친구가 팔을 문지르고 있어요.',
        sentence: '부딪쳐서 미안해. 괜찮아?', word: '미안해', card: '미안해', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '친구가 괜찮다고 하면', say: '다음엔 천천히 걸을게.' },
      },
      {
        id: 'sorry-2-spill', emoji: '💧', title: '물을 쏟았어요', to: 'friend',
        scene: '물을 마시다가 쏟았어요. 옆 친구의 학습지가 젖었어요.',
        sentence: '물 쏟아서 미안해. 내가 닦을게.', word: '미안해', card: '미안해', wrong: { emoji: '👋', text: '안녕' }, next: { when: '다 닦으면', say: '다음엔 조심할게.' },
      },
      {
        id: 'sorry-3-late', emoji: '⏰', title: '늦게 왔어요', to: 'teacher',
        scene: '교실에 늦게 들어왔어요. 수업이 벌써 시작했어요.',
        sentence: '선생님, 늦어서 죄송합니다.', word: '죄송합니다', card: '죄송합니다', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '이어서', say: '다음엔 일찍 올게요.' },
      },
      {
        id: 'sorry-4-pencil', emoji: '✏️', title: '연필이 부러졌어요', to: 'friend',
        scene: '친구 연필을 빌려 쓰다가 너무 세게 눌러서 심이 부러졌어요.',
        sentence: '연필심 부러뜨려서 미안해. 내가 깎아 줄게.', word: '미안해', card: '미안해', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '친구가 괜찮다고 하면', say: '고마워.' },
      },
      {
        id: 'sorry-5-push', emoji: '🚶', title: '줄 서다가 밀었어요', to: 'friend',
        scene: '줄을 서다가 앞 친구를 밀었어요. 친구가 넘어질 뻔했어요.',
        sentence: '밀어서 미안해. 다음엔 조심할게.', word: '미안해', card: '미안해', wrong: { emoji: '😴', text: '졸려' }, next: { when: '친구가 괜찮다고 하면', say: '고마워.' },
      },
      {
        id: 'sorry-6-step', emoji: '🦶', title: '친구 발을 밟았어요', to: 'friend',
        scene: '줄을 서서 걷다가 친구 발을 밟았어요. 친구가 아파해요.',
        sentence: '발 밟아서 미안해. 많이 아파?', word: '미안해', card: '미안해', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '친구가 괜찮다고 하면', say: '다음엔 조심할게.' },
      },
      {
        id: 'sorry-7-interrupt', emoji: '🗣️', title: '말씀 중에 끼어들었어요', to: 'teacher',
        scene: '선생님이 말씀하시는데 큰 소리로 끼어들었어요. 선생님이 말을 멈추셨어요.',
        sentence: '선생님, 끼어들어서 죄송합니다.', word: '죄송합니다', card: '죄송합니다', wrong: { emoji: '👋', text: '안녕하세요' }, next: { when: '이어서', say: '끝까지 듣고 말할게요.' },
      },
      {
        id: 'sorry-8-lost', emoji: '🧽', title: '빌린 지우개를 잃어버렸어요', to: 'friend',
        scene: '친구에게 빌린 지우개를 잃어버렸어요. 친구가 돌려 달라고 해요.',
        sentence: '네 지우개 잃어버렸어. 미안해.', word: '미안해', card: '미안해', wrong: { emoji: '😴', text: '졸려' }, next: { when: '이어서', say: '같이 찾아볼게.' },
      },
      {
        id: 'sorry-9-tease', emoji: '😔', title: '친구를 놀렸어요', to: 'friend',
        scene: '장난으로 친구 이름을 이상하게 불렀어요. 친구 얼굴이 슬퍼 보여요.',
        sentence: '놀려서 미안해. 다시는 안 그럴게.', word: '미안해', card: '미안해', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '친구가 괜찮다고 하면', say: '고마워.' },
      },
      {
        id: 'sorry-10-pot', emoji: '🪴', title: '화분을 넘어뜨렸어요', to: 'teacher',
        scene: '교실에서 뛰다가 창가 화분을 넘어뜨렸어요. 흙이 바닥에 쏟아졌어요.',
        sentence: '선생님, 화분을 넘어뜨렸어요. 죄송합니다.', word: '죄송합니다', card: '죄송합니다', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '이어서', say: '제가 치울게요.' },
      },
    ],
  },
  {
    id: 'ask',
    name: '허락 구하기',
    cardEmoji: '✋',
    cardAct: { teacher: '손을 들고 그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 보여 줘요' },
    items: [
      {
        id: 'ask-1-toilet', emoji: '🚻', title: '화장실에 가고 싶어요', to: 'teacher',
        scene: '수업 시간이에요. 화장실에 가고 싶어요.',
        sentence: '선생님, 화장실 가도 돼요?', word: '화장실', card: '화장실 가고 싶어요', cardEmoji: '🚻', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '허락해 주시면', say: '다녀오겠습니다.' },
      },
      {
        id: 'ask-2-water', emoji: '🚰', title: '물을 마시고 싶어요', to: 'teacher',
        scene: '체육을 하고 교실에 왔어요. 목이 너무 말라요.',
        sentence: '선생님, 물 마셔도 돼요?', word: '물', card: '물 마시고 싶어요', cardEmoji: '🚰', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '허락해 주시면', say: '고맙습니다.' },
      },
      {
        id: 'ask-3-scissors', emoji: '✂️', title: '가위를 빌리고 싶어요', to: 'friend',
        scene: '만들기 시간에 가위가 없어요. 짝꿍 책상 위에 가위가 있어요.',
        sentence: '가위 좀 빌려줄래?', word: '빌려줄래?', card: '빌려줘', wrong: { emoji: '🙇', text: '미안해' }, next: { when: '빌려주면', say: '고마워. 다 쓰고 줄게.' },
      },
      {
        id: 'ask-4-play', emoji: '⚽', title: '같이 놀고 싶어요', to: 'friend',
        scene: '쉬는 시간에 친구들이 공놀이를 해요. 나도 같이 하고 싶어요.',
        sentence: '나도 같이 하자. 끼워 줄래?', word: '같이 하자', card: '같이 놀자', cardEmoji: '⚽', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '좋다고 하면', say: '고마워!' },
      },
      {
        id: 'ask-5-book', emoji: '📚', title: '다 하고 책 읽기', to: 'teacher',
        scene: '학습지를 다 했어요. 친구들은 아직 하고 있어요. 책을 읽고 싶어요.',
        sentence: '선생님, 다 했어요. 책 읽어도 돼요?', word: '책', card: '다 했어요', cardEmoji: '✅', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '허락해 주시면', say: '조용히 읽을게요.' },
      },
      {
        id: 'ask-6-sharpen', emoji: '✏️', title: '연필을 깎고 싶어요', to: 'teacher',
        scene: '연필심이 다 닳았어요. 교실 뒤에 연필깎이가 있어요.',
        sentence: '선생님, 연필 깎아도 돼요?', word: '연필', card: '연필 깎고 싶어요', cardEmoji: '✏️', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '허락해 주시면', say: '고맙습니다.' },
      },
      {
        id: 'ask-7-window', emoji: '🪟', title: '창문을 열고 싶어요', to: 'teacher',
        scene: '교실이 너무 더워요. 땀이 나요.',
        sentence: '선생님, 더워요. 창문 열어도 돼요?', word: '창문', card: '더워요', cardEmoji: '🥵', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '허락해 주시면', say: '고맙습니다.' },
      },
      {
        id: 'ask-8-seat', emoji: '🪑', title: '옆에 앉고 싶어요', to: 'friend',
        scene: '급식실에서 자리를 찾고 있어요. 친구 옆자리가 비어 있어요.',
        sentence: '여기 앉아도 돼?', word: '앉아도 돼?', card: '앉아도 돼?', cardEmoji: '🪑', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '앉으라고 하면', say: '고마워.' },
      },
      {
        id: 'ask-9-book', emoji: '📖', title: '같이 보고 싶어요', to: 'friend',
        scene: '친구가 재미있는 그림책을 보고 있어요. 나도 보고 싶어요.',
        sentence: '나도 같이 봐도 돼?', word: '같이 봐도 돼?', card: '같이 보자', cardEmoji: '📖', wrong: { emoji: '😴', text: '졸려' }, next: { when: '좋다고 하면', say: '고마워!' },
      },
      {
        id: 'ask-10-tissue', emoji: '🧻', title: '휴지를 쓰고 싶어요', to: 'teacher',
        scene: '콧물이 나와요. 휴지는 선생님 책상 위에 있어요.',
        sentence: '선생님, 휴지 써도 돼요?', word: '휴지', card: '휴지 주세요', cardEmoji: '🧻', wrong: { emoji: '⚽', text: '같이 놀자' }, next: { when: '허락해 주시면', say: '고맙습니다.' },
      },
    ],
  },
  {
    id: 'no',
    name: '싫다고 말하기',
    cardEmoji: '🙅',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 똑바로 보여 줘요' },
    items: [
      {
        id: 'no-1-touch', emoji: '🖐️', title: '자꾸 만져요', to: 'friend',
        scene: '친구가 내 머리를 자꾸 만져요. 기분이 안 좋아요.',
        sentence: '만지지 마. 싫어.', word: '싫어', card: '싫어', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '그래도 계속하면', say: '선생님께 말할 거야.' },
      },
      {
        id: 'no-2-take', emoji: '🖍️', title: '말없이 가져가요', to: 'friend',
        scene: '친구가 내 색연필을 말없이 가져가려고 해요.',
        sentence: '안 돼. 내 거야. 가져가지 마.', word: '안 돼', card: '안 돼', wrong: { emoji: '👋', text: '안녕' }, next: { when: '빌려 달라고 하면', say: '다 쓰고 빌려줄게.' },
      },
      {
        id: 'no-3-noise', emoji: '📢', title: '귀 옆에서 소리 질러요', to: 'friend',
        scene: '쉬는 시간에 친구가 내 귀 옆에서 크게 소리를 질러요. 귀가 아파요.',
        sentence: '그만해. 소리 지르지 마. 귀가 아파.', word: '그만해', card: '그만해', wrong: { emoji: '⚽', text: '같이 놀자' }, next: { when: '그래도 계속하면', say: '선생님께 말할 거야.' },
      },
      {
        id: 'no-4-food', emoji: '🍽️', title: '못 먹는 음식이에요', to: 'teacher',
        scene: '급식에 못 먹는 음식이 나왔어요. 먹으면 배가 아파요.',
        sentence: '선생님, 이건 못 먹어요.', word: '못 먹어요', card: '못 먹어요', cardEmoji: '🍽️', wrong: { emoji: '🍚', text: '더 주세요' }, next: { when: '왜 그런지 물으시면', say: '먹으면 배가 아파요.' },
      },
      {
        id: 'no-5-myself', emoji: '💪', title: '혼자 할 수 있어요', to: 'friend',
        scene: '신발을 혼자 신을 수 있어요. 그런데 친구가 자꾸 대신 신겨 주려고 해요.',
        sentence: '괜찮아. 내가 할래.', word: '내가 할래', card: '내가 할래', wrong: { emoji: '😴', text: '졸려' }, next: { when: '어려우면', say: '그때 도와줘.' },
      },
      {
        id: 'no-6-danger', emoji: '⚠️', title: '위험한 놀이를 하재요', to: 'friend',
        scene: '친구가 높은 곳에서 뛰어내리는 놀이를 하자고 해요. 위험해 보여요.',
        sentence: '싫어. 그건 위험해.', word: '싫어', card: '싫어', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '계속 하자고 하면', say: '다른 놀이 하자.' },
      },
      {
        id: 'no-7-push', emoji: '🛑', title: '줄에서 자꾸 밀어요', to: 'friend',
        scene: '줄을 서 있는데 뒤에서 친구가 자꾸 밀어요.',
        sentence: '밀지 마. 차례대로 서자.', word: '밀지 마', card: '그만해', cardEmoji: '🛑', wrong: { emoji: '⚽', text: '같이 놀자' }, next: { when: '그래도 계속하면', say: '선생님께 말할 거야.' },
      },
      {
        id: 'no-8-snack', emoji: '🍪', title: '간식을 다 달래요', to: 'friend',
        scene: '쉬는 시간에 간식을 먹고 있어요. 친구가 다 달라고 해요.',
        sentence: '안 돼. 이건 내 간식이야.', word: '안 돼', card: '안 돼', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '조금만 달라고 하면', say: '하나 줄게.' },
      },
      {
        id: 'no-9-full', emoji: '🍚', title: '배가 불러요', to: 'teacher',
        scene: '급식을 다 먹어서 배가 불러요. 선생님이 조금 더 먹어 보라고 하세요.',
        sentence: '선생님, 배불러요. 그만 먹을게요.', word: '배불러요', card: '그만 먹을게요', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '이어서', say: '잘 먹었습니다.' },
      },
      {
        id: 'no-10-hug', emoji: '🫂', title: '꽉 껴안아요', to: 'friend',
        scene: '친구가 반갑다고 갑자기 꽉 껴안았어요. 숨이 답답해요.',
        sentence: '놔 줘. 꽉 안는 건 싫어.', word: '놔 줘', card: '싫어', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '놓아 주면', say: '손 흔들어 인사하자.' },
      },
    ],
  },
  {
    id: 'greet',
    name: '인사하기',
    cardEmoji: '👋',
    cardAct: { teacher: '그림 카드를 보여 드리고 고개 숙여 인사해요', friend: '그림 카드를 보여 주고 손을 흔들어요' },
    items: [
      {
        id: 'greet-1-morning', emoji: '🌅', title: '아침에 교실에 왔어요', to: 'teacher',
        scene: '아침에 교실에 들어왔어요. 선생님이 교실에 계세요.',
        sentence: '선생님, 안녕하세요!', word: '안녕하세요', card: '안녕하세요', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '선생님이 인사해 주시면', say: '오늘도 열심히 할게요.' },
      },
      {
        id: 'greet-2-friend', emoji: '🚶', title: '등굣길에 친구를 만났어요', to: 'friend',
        scene: '학교 가는 길에 같은 반 친구를 만났어요.',
        sentence: '안녕! 잘 잤어?', word: '안녕', card: '안녕', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '친구가 인사하면', say: '같이 가자.' },
      },
      {
        id: 'greet-3-bye', emoji: '🎒', title: '집에 가요', to: 'teacher',
        scene: '수업이 다 끝났어요. 가방을 메고 교실을 나가요.',
        sentence: '선생님, 안녕히 계세요.', word: '안녕히 계세요', card: '안녕히 계세요', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '선생님이 인사해 주시면', say: '내일 만나요.' },
      },
      {
        id: 'greet-4-seeyou', emoji: '👋', title: '친구와 헤어져요', to: 'friend',
        scene: '학교 앞에서 친구와 헤어져요. 친구는 다른 길로 가요.',
        sentence: '잘 가! 내일 만나.', word: '잘 가', card: '잘 가', wrong: { emoji: '😴', text: '졸려' }, next: { when: '친구가 손을 흔들면', say: '내일 봐!' },
      },
      {
        id: 'greet-5-new', emoji: '🧒', title: '새 친구가 왔어요', to: 'friend',
        scene: '우리 반에 새 친구가 전학 왔어요. 친구가 혼자 앉아 있어요.',
        sentence: '안녕, 만나서 반가워.', word: '반가워', card: '반가워', cardEmoji: '🤝', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '친구가 이름을 말해 주면', say: '같이 놀자.' },
      },
      {
        id: 'greet-6-principal', emoji: '🏫', title: '복도에서 교장 선생님을 만났어요', to: 'teacher',
        scene: '복도를 걷다가 교장 선생님을 만났어요.',
        sentence: '교장 선생님, 안녕하세요.', word: '안녕하세요', card: '안녕하세요', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '교장 선생님이 인사해 주시면', say: '좋은 하루 보내세요.' },
      },
      {
        id: 'greet-7-meal', emoji: '🍱', title: '밥을 먹으려고 해요', to: 'teacher',
        scene: '급식을 받아서 자리에 앉았어요. 이제 먹으려고 해요.',
        sentence: '선생님, 잘 먹겠습니다!', word: '잘 먹겠습니다', card: '잘 먹겠습니다', cardEmoji: '🍱', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '다 먹으면', say: '잘 먹었습니다.' },
      },
      {
        id: 'greet-8-back', emoji: '🌤️', title: '아팠던 친구가 왔어요', to: 'friend',
        scene: '어제 아파서 결석한 친구가 오늘 학교에 왔어요.',
        sentence: '다 나았어? 다시 보니까 반가워.', word: '반가워', card: '반가워', cardEmoji: '🤗', wrong: { emoji: '😴', text: '졸려' }, next: { when: '친구가 다 나았다고 하면', say: '다행이다.' },
      },
      {
        id: 'greet-9-birthday', emoji: '🎂', title: '친구 생일이에요', to: 'friend',
        scene: '오늘은 친구의 생일이에요. 친구가 교실에 들어와요.',
        sentence: '생일 축하해!', word: '축하해', card: '축하해', cardEmoji: '🎂', wrong: { emoji: '🙇', text: '미안해' }, next: { when: '친구가 고맙다고 하면', say: '즐거운 하루 보내.' },
      },
      {
        id: 'greet-10-weekend', emoji: '🗓️', title: '주말 잘 보냈냐고 물으세요', to: 'teacher',
        scene: '월요일 아침이에요. 선생님이 주말을 잘 보냈냐고 물어보세요.',
        sentence: '네, 잘 보냈어요. 선생님도요?', word: '잘 보냈어요', card: '좋았어요', cardEmoji: '😊', wrong: { emoji: '🙅', text: '싫어요' }, next: { when: '이어서', say: '가족이랑 공원에 갔어요.' },
      },
    ],
  },
  {
    id: 'feel',
    name: '기분 말하기',
    cardEmoji: '🙂',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 보여 줘요' },
    items: [
      {
        id: 'feel-1-happy', emoji: '🏅', title: '상을 받았어요', to: 'teacher',
        scene: '그리기 대회에서 상을 받았어요. 선생님이 기분이 어떠냐고 물어보세요.',
        sentence: '선생님, 정말 기뻐요!', word: '기뻐요', card: '기뻐요', cardEmoji: '😄', wrong: { emoji: '😢', text: '슬퍼요' }, next: { when: '이어서', say: '상 받아서 신나요.' },
      },
      {
        id: 'feel-2-sad', emoji: '🧸', title: '장난감이 부서졌어요', to: 'teacher',
        scene: '아끼던 장난감이 부서졌어요. 눈물이 나요.',
        sentence: '선생님, 장난감이 부서져서 슬퍼요.', word: '슬퍼요', card: '슬퍼요', cardEmoji: '😢', wrong: { emoji: '😄', text: '기뻐요' }, next: { when: '선생님이 위로해 주시면', say: '고맙습니다.' },
      },
      {
        id: 'feel-3-angry', emoji: '🖍️', title: '그림에 낙서를 했어요', to: 'friend',
        scene: '친구가 내 그림에 낙서를 했어요. 화가 나요.',
        sentence: '내 그림에 낙서해서 화났어.', word: '화났어', card: '화나요', cardEmoji: '😠', wrong: { emoji: '😄', text: '기뻐' }, next: { when: '친구가 사과하면', say: '알았어. 다음엔 하지 마.' },
      },
      {
        id: 'feel-4-scared', emoji: '⛈️', title: '천둥이 쳐요', to: 'teacher',
        scene: '천둥소리가 크게 났어요. 깜짝 놀라서 무서워요.',
        sentence: '선생님, 천둥소리가 무서워요.', word: '무서워요', card: '무서워요', cardEmoji: '😨', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '선생님이 괜찮다고 하시면', say: '옆에 있어도 돼요?' },
      },
      {
        id: 'feel-5-tired', emoji: '😮‍💨', title: '몸이 힘들어요', to: 'teacher',
        scene: '체육을 하고 와서 몸이 너무 힘들어요.',
        sentence: '선생님, 힘들어요. 조금 쉬고 싶어요.', word: '힘들어요', card: '쉬고 싶어요', cardEmoji: '😮‍💨', wrong: { emoji: '⚽', text: '같이 놀자' }, next: { when: '쉬어도 된다고 하시면', say: '고맙습니다.' },
      },
      {
        id: 'feel-6-nervous', emoji: '🎤', title: '발표가 떨려요', to: 'teacher',
        scene: '앞에 나가서 발표를 해야 해요. 가슴이 두근두근해요.',
        sentence: '선생님, 발표하기 너무 떨려요.', word: '떨려요', card: '떨려요', cardEmoji: '😰', wrong: { emoji: '😄', text: '기뻐요' }, next: { when: '선생님이 응원해 주시면', say: '해 볼게요.' },
      },
      {
        id: 'feel-7-bored', emoji: '🥱', title: '심심해요', to: 'friend',
        scene: '쉬는 시간에 혼자 앉아 있어요. 할 일이 없어서 심심해요.',
        sentence: '심심해. 같이 놀래?', word: '심심해', card: '심심해', cardEmoji: '🥱', wrong: { emoji: '🙇', text: '미안해' }, next: { when: '친구가 좋다고 하면', say: '뭐 하고 놀까?' },
      },
      {
        id: 'feel-8-proud', emoji: '🧱', title: '혼자 다 만들었어요', to: 'friend',
        scene: '혼자서 블록 탑을 끝까지 다 쌓았어요. 친구가 보고 있어요.',
        sentence: '내가 다 만들었어. 뿌듯해!', word: '뿌듯해', card: '뿌듯해', cardEmoji: '🏆', wrong: { emoji: '😢', text: '슬퍼' }, next: { when: '친구가 멋지다고 하면', say: '고마워!' },
      },
      {
        id: 'feel-9-upset', emoji: '😞', title: '같이 놀고 싶어요', to: 'teacher',
        scene: '친구들이 놀이에 끼워 주지 않아서 속상해요.',
        sentence: '선생님, 친구들이 안 끼워 줘서 속상해요.', word: '속상해요', card: '속상해요', cardEmoji: '😞', wrong: { emoji: '😄', text: '기뻐요' }, next: { when: '선생님이 도와주시면', say: '같이 놀고 싶어요.' },
      },
      {
        id: 'feel-10-excited', emoji: '🎒', title: '내일 소풍 가요', to: 'friend',
        scene: '내일은 소풍 가는 날이에요. 친구랑 소풍 이야기를 해요.',
        sentence: '내일 소풍이라 너무 신나!', word: '신나', card: '신나요', cardEmoji: '🤩', wrong: { emoji: '😨', text: '무서워' }, next: { when: '친구도 신난다고 하면', say: '같이 김밥 먹자.' },
      },
    ],
  },
  {
    id: 'cheer',
    name: '칭찬하고 응원하기',
    cardEmoji: '👍',
    cardAct: { teacher: '그림 카드를 보여 드리고 박수를 쳐요', friend: '그림 카드를 보여 주고 박수를 쳐요' },
    items: [
      {
        id: 'cheer-1-drawing', emoji: '🎨', title: '친구 그림이 멋져요', to: 'friend',
        scene: '친구가 그림을 다 그렸어요. 색이 정말 예뻐요.',
        sentence: '와, 그림 정말 멋지다!', word: '멋지다', card: '멋져', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '친구가 고맙다고 하면', say: '나도 그려 볼래.' },
      },
      {
        id: 'cheer-2-run', emoji: '🏃', title: '끝까지 달렸어요', to: 'friend',
        scene: '달리기 시합에서 친구가 넘어질 뻔했지만 끝까지 열심히 달렸어요.',
        sentence: '끝까지 달렸네! 대단해!', word: '대단해', card: '대단해', wrong: { emoji: '😴', text: '졸려' }, next: { when: '이어서', say: '다음에도 힘내!' },
      },
      {
        id: 'cheer-3-fighting', emoji: '💪', title: '친구가 발표하러 나가요', to: 'friend',
        scene: '친구가 발표하러 앞으로 나가요. 친구 손이 떨려요.',
        sentence: '할 수 있어! 힘내!', word: '힘내', card: '힘내', cardEmoji: '💪', wrong: { emoji: '🙇', text: '미안해' }, next: { when: '발표가 끝나면', say: '잘했어!' },
      },
      {
        id: 'cheer-4-tidy', emoji: '🗄️', title: '정리를 잘했어요', to: 'friend',
        scene: '친구가 사물함을 깨끗하게 정리했어요.',
        sentence: '사물함 정리 진짜 잘했다!', word: '잘했다', card: '잘했어', cardEmoji: '🌟', wrong: { emoji: '😢', text: '슬퍼' }, next: { when: '친구가 웃으면', say: '나도 정리해야겠다.' },
      },
      {
        id: 'cheer-5-class', emoji: '🔬', title: '수업이 재미있었어요', to: 'teacher',
        scene: '오늘 과학 실험이 정말 재미있었어요. 수업이 끝났어요.',
        sentence: '선생님, 오늘 수업 정말 재미있었어요.', word: '재미있었어요', card: '재미있어요', cardEmoji: '😄', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '선생님이 웃으시면', say: '또 하고 싶어요.' },
      },
      {
        id: 'cheer-6-goal', emoji: '⚽', title: '친구가 골을 넣었어요', to: 'friend',
        scene: '체육 시간에 친구가 공을 차서 골을 넣었어요.',
        sentence: '골 넣었다! 최고야!', word: '최고야', card: '최고', cardEmoji: '🥇', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '이어서', say: '하이파이브!' },
      },
      {
        id: 'cheer-7-okay', emoji: '🤗', title: '친구가 속상해해요', to: 'friend',
        scene: '친구가 받아쓰기에서 많이 틀려서 속상해해요.',
        sentence: '괜찮아. 다음에 잘하면 돼.', word: '괜찮아', card: '괜찮아', cardEmoji: '🤗', wrong: { emoji: '😄', text: '기뻐' }, next: { when: '친구가 고개를 끄덕이면', say: '같이 연습하자.' },
      },
      {
        id: 'cheer-8-clothes', emoji: '👕', title: '새 옷을 입고 왔어요', to: 'friend',
        scene: '친구가 새 옷을 입고 학교에 왔어요.',
        sentence: '옷 예쁘다! 잘 어울려.', word: '예쁘다', card: '예뻐', cardEmoji: '👕', wrong: { emoji: '😢', text: '슬퍼' }, next: { when: '친구가 고맙다고 하면', say: '어디서 샀어?' },
      },
      {
        id: 'cheer-9-kind', emoji: '🤝', title: '친구를 일으켜 줬어요', to: 'friend',
        scene: '친구가 넘어진 다른 친구를 일으켜 줬어요.',
        sentence: '친구 도와준 거 정말 멋있었어.', word: '멋있었어', card: '멋져', wrong: { emoji: '😴', text: '졸려' }, next: { when: '이어서', say: '나도 다음엔 도울게.' },
      },
      {
        id: 'cheer-10-song', emoji: '🎵', title: '노래를 잘 불러요', to: 'friend',
        scene: '음악 시간에 친구가 노래를 불렀어요. 목소리가 정말 좋아요.',
        sentence: '노래 진짜 잘한다!', word: '잘한다', card: '잘했어', cardEmoji: '🎵', wrong: { emoji: '🙇', text: '미안해' }, next: { when: '친구가 웃으면', say: '한 번 더 불러 줘.' },
      },
    ],
  },
  {
    id: 'turn',
    name: '차례 지키고 양보하기',
    cardEmoji: '🔄',
    cardAct: { teacher: '그림 카드를 보여 드리고 차례를 기다려요', friend: '그림 카드를 친구에게 보여 줘요' },
    items: [
      {
        id: 'turn-1-line', emoji: '🧍', title: '친구가 줄에 끼어들었어요', to: 'friend',
        scene: '급식 줄을 서 있어요. 친구가 내 앞으로 끼어들었어요.',
        sentence: '여기 줄 서 있어. 뒤에 서 줄래?', word: '뒤에 서 줄래?', card: '줄 서요', cardEmoji: '🧍', wrong: { emoji: '😄', text: '기뻐' }, next: { when: '친구가 뒤에 서면', say: '고마워.' },
      },
      {
        id: 'turn-2-swing', emoji: '🛝', title: '친구가 그네를 기다려요', to: 'friend',
        scene: '그네를 오래 탔어요. 친구가 옆에서 기다리고 있어요.',
        sentence: '이제 네 차례야. 타도 돼.', word: '네 차례야', card: '네 차례야', cardEmoji: '🛝', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '친구가 고맙다고 하면', say: '다음에 또 바꿔 타자.' },
      },
      {
        id: 'turn-3-slide', emoji: '⏳', title: '미끄럼틀 차례를 기다려요', to: 'friend',
        scene: '미끄럼틀을 타고 싶어요. 친구가 먼저 올라가고 있어요.',
        sentence: '먼저 타. 나는 다음에 탈게.', word: '먼저 타', card: '기다릴게', cardEmoji: '⏳', wrong: { emoji: '😠', text: '화나' }, next: { when: '친구가 다 타면', say: '이제 내 차례지?' },
      },
      {
        id: 'turn-4-blocks', emoji: '🧱', title: '블록이 하나뿐이에요', to: 'friend',
        scene: '블록 장난감이 한 상자뿐이에요. 친구도 하고 싶어 해요.',
        sentence: '같이 쓰자. 반씩 나눌까?', word: '같이 쓰자', card: '같이 쓰자', cardEmoji: '🧱', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '친구가 좋다고 하면', say: '뭐 만들까?' },
      },
      {
        id: 'turn-5-speak', emoji: '🙋', title: '나도 말하고 싶어요', to: 'teacher',
        scene: '발표 시간에 친구가 먼저 손을 들었어요. 나도 말하고 싶어요.',
        sentence: '선생님, 친구 다음에 제가 말해도 돼요?', word: '제가 말해도 돼요?', card: '기다릴게요', cardEmoji: '⏳', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '허락해 주시면', say: '기다릴게요.' },
      },
      {
        id: 'turn-6-seat', emoji: '🚌', title: '다리 아픈 친구가 서 있어요', to: 'friend',
        scene: '현장 체험 버스에 탔어요. 다리를 다친 친구가 서 있어요.',
        sentence: '여기 앉아. 나는 서 있을게.', word: '여기 앉아', card: '앉아', cardEmoji: '🪑', wrong: { emoji: '😠', text: '화나' }, next: { when: '친구가 고맙다고 하면', say: '천천히 가자.' },
      },
      {
        id: 'turn-7-order', emoji: '✊', title: '누가 먼저 할까요', to: 'friend',
        scene: '보드게임을 하려고 해요. 누가 먼저 할지 정해야 해요.',
        sentence: '가위바위보로 순서 정하자.', word: '순서 정하자', card: '가위바위보', cardEmoji: '✊', wrong: { emoji: '🙇', text: '미안해' }, next: { when: '순서가 정해지면', say: '잘해 보자!' },
      },
      {
        id: 'turn-8-lose', emoji: '🎲', title: '게임에서 졌어요', to: 'friend',
        scene: '보드게임에서 졌어요. 친구가 이겼어요.',
        sentence: '네가 이겼네. 축하해!', word: '축하해', card: '축하해', cardEmoji: '🎉', wrong: { emoji: '😠', text: '화나' }, next: { when: '이어서', say: '한 판 더 하자.' },
      },
      {
        id: 'turn-9-pass', emoji: '⚽', title: '친구가 공을 기다려요', to: 'friend',
        scene: '공놀이를 하는데 나만 계속 공을 가지고 있어요. 친구가 공을 기다려요.',
        sentence: '자, 받아! 네 차례야.', word: '받아', card: '네 차례야', cardEmoji: '⚽', wrong: { emoji: '😴', text: '졸려' }, next: { when: '친구가 공을 받으면', say: '잘했어!' },
      },
      {
        id: 'turn-10-share', emoji: '🍪', title: '간식을 나눠요', to: 'friend',
        scene: '간식이 두 개 있어요. 옆 친구는 간식이 없어요.',
        sentence: '하나 먹을래? 나눠 먹자.', word: '나눠 먹자', card: '나눠 먹자', cardEmoji: '🍪', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '친구가 고맙다고 하면', say: '맛있게 먹어.' },
      },
    ],
  },
  {
    id: 'body',
    name: '몸 상태 알리기',
    cardEmoji: '🤒',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 보여 줘요' },
    items: [
      {
        id: 'body-1-stomach', emoji: '🤢', title: '배가 아파요', to: 'teacher',
        scene: '갑자기 배가 아파요. 참아 봤는데 계속 아파요.',
        sentence: '선생님, 배가 아파요.', word: '배가 아파요', card: '아파요', wrong: { emoji: '😄', text: '기뻐요' }, next: { when: '어디가 아프냐고 물으시면', say: '여기가 아파요.' },
      },
      {
        id: 'body-2-head', emoji: '🤕', title: '머리가 아파요', to: 'teacher',
        scene: '머리가 지끈지끈 아파요. 공부에 집중이 안 돼요.',
        sentence: '선생님, 머리가 아파요. 보건실에 가도 돼요?', word: '머리가 아파요', card: '아파요', wrong: { emoji: '⚽', text: '같이 놀자' }, next: { when: '허락해 주시면', say: '다녀오겠습니다.' },
      },
      {
        id: 'body-3-knee', emoji: '🩹', title: '넘어져서 다쳤어요', to: 'teacher',
        scene: '운동장에서 넘어졌어요. 무릎에서 피가 나요.',
        sentence: '선생님, 넘어져서 무릎을 다쳤어요.', word: '다쳤어요', card: '다쳤어요', cardEmoji: '🩹', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '치료해 주시면', say: '고맙습니다.' },
      },
      {
        id: 'body-4-cold', emoji: '🥶', title: '추워요', to: 'teacher',
        scene: '교실이 추워서 몸이 덜덜 떨려요.',
        sentence: '선생님, 추워요. 겉옷 입어도 돼요?', word: '추워요', card: '추워요', cardEmoji: '🥶', wrong: { emoji: '🥵', text: '더워요' }, next: { when: '허락해 주시면', say: '고맙습니다.' },
      },
      {
        id: 'body-5-dizzy', emoji: '😵', title: '어지러워요', to: 'teacher',
        scene: '운동장에서 오래 서 있었더니 어지러워요.',
        sentence: '선생님, 어지러워요. 앉아도 돼요?', word: '어지러워요', card: '어지러워요', cardEmoji: '😵', wrong: { emoji: '😄', text: '기뻐요' }, next: { when: '앉으라고 하시면', say: '조금 쉴게요.' },
      },
      {
        id: 'body-6-tooth', emoji: '🦷', title: '이가 아파요', to: 'teacher',
        scene: '점심을 먹는데 흔들리는 이가 아파요.',
        sentence: '선생님, 이가 흔들려서 아파요.', word: '아파요', card: '아파요', cardEmoji: '🦷', wrong: { emoji: '🍚', text: '더 주세요' }, next: { when: '봐 주시면', say: '고맙습니다.' },
      },
      {
        id: 'body-7-friendhurt', emoji: '🚨', title: '친구가 다쳤어요', to: 'teacher',
        scene: '쉬는 시간에 친구가 넘어져서 울고 있어요.',
        sentence: '선생님, 친구가 넘어져서 다쳤어요!', word: '다쳤어요', card: '도와주세요', cardEmoji: '🚨', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '선생님이 오시면', say: '저기 있어요.' },
      },
      {
        id: 'body-8-itchy', emoji: '🦟', title: '팔이 가려워요', to: 'teacher',
        scene: '팔이 자꾸 가렵고 빨갛게 올라왔어요.',
        sentence: '선생님, 팔이 가려워요.', word: '가려워요', card: '가려워요', cardEmoji: '🦟', wrong: { emoji: '😄', text: '기뻐요' }, next: { when: '선생님이 보시면', say: '여기가 빨개요.' },
      },
      {
        id: 'body-9-nosebleed', emoji: '🤧', title: '코피가 나요', to: 'teacher',
        scene: '갑자기 코피가 났어요. 손에 피가 묻었어요.',
        sentence: '선생님, 코피가 나요!', word: '코피', card: '도와주세요', cardEmoji: '🚨', wrong: { emoji: '⚽', text: '같이 놀자' }, next: { when: '도와주시면', say: '고맙습니다.' },
      },
      {
        id: 'body-10-sleepy', emoji: '😴', title: '너무 졸려요', to: 'teacher',
        scene: '어젯밤에 잠을 잘 못 자서 수업 시간에 너무 졸려요.',
        sentence: '선생님, 너무 졸려요. 세수하고 와도 돼요?', word: '졸려요', card: '졸려요', cardEmoji: '😴', wrong: { emoji: '😄', text: '기뻐요' }, next: { when: '허락해 주시면', say: '다녀오겠습니다.' },
      },
    ],
  },
];
