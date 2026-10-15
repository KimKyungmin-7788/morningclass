// 오늘의 생활표현 자료. 주제 하나 = 한 주, 상황 다섯 = 월~금. 주제는 EXPR_TOPICS 차례로 돌아간다 (2026-10-12 주가 첫 주제).
// 상황마다 세 수준의 표현이 있다: 문장 · 낱말 · 그림 카드(AAC). 모든 학생이 자기 수준으로 함께 연습한다.
// 상황 그림은 id 이름으로 public/img/expression/ 에 넣으면 저절로 나온다 (목록: docs/생활표현-그림-목록.md).

export type ExprTo = 'teacher' | 'friend';
export const TO_LABEL: Record<ExprTo, string> = { teacher: '선생님께', friend: '친구에게' };

export interface ExprSituation {
  /** 상황 그림 파일 이름: public/img/expression/<id>.webp (없으면 .png, 그것도 없으면 emoji) */
  id: string;
  emoji: string;
  /** 짧은 상황 이름 (카드) */
  title: string;
  /** 상황 문장 — 먼저 혼자 해 본 데까지 들어 있다 */
  scene: string;
  to: ExprTo;
  sentence: string;
  word: string;
  /** 그림 카드에 적힌 말 */
  card: string;
  /** 그림 카드 그림 — 없으면 주제의 그림 (상황마다 카드 말이 다른 주제에서 쓴다) */
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
  days: ExprSituation[];
}

export const EXPR_TOPICS: ExprTopic[] = [
  {
    id: 'help',
    name: '도움 요청하기',
    cardEmoji: '🙋',
    cardAct: { teacher: '그림 카드를 선생님께 건네요', friend: '그림 카드를 친구에게 건네요' },
    days: [
      {
        id: 'help-1-bottle', emoji: '🧴', title: '물병 뚜껑이 안 열려요', to: 'teacher',
        scene: '목이 말라요. 물병 뚜껑을 돌려 봤는데 꽉 닫혀서 안 열려요.',
        sentence: '선생님, 뚜껑이 안 열려요. 도와주세요.', word: '도와주세요', card: '도와주세요', wrong: { emoji: '👋', text: '안녕하세요' }, next: { when: '도와주면', say: '고맙습니다.' },
      },
      {
        id: 'help-2-milk', emoji: '🥛', title: '우유갑이 안 열려요', to: 'teacher',
        scene: '급식 시간이에요. 우유갑을 열어 봤는데 입구가 안 벌어져요.',
        sentence: '선생님, 우유가 안 열려요. 도와주세요.', word: '도와주세요', card: '도와주세요', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '도와주면', say: '고맙습니다.' },
      },
      {
        id: 'help-3-shelf', emoji: '🖍️', title: '손이 안 닿아요', to: 'teacher',
        scene: '높은 칸에 있는 색연필을 꺼내야 해요. 까치발을 했는데도 손이 안 닿아요.',
        sentence: '선생님, 손이 안 닿아요. 도와주세요.', word: '도와주세요', card: '도와주세요', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '도와주면', say: '고맙습니다.' },
      },
      {
        id: 'help-4-worksheet', emoji: '📝', title: '무엇을 하는지 모르겠어요', to: 'teacher',
        scene: '학습지를 받았어요. 읽어 봤는데 무엇을 해야 하는지 모르겠어요.',
        sentence: '선생님, 이거 모르겠어요. 도와주세요.', word: '도와주세요', card: '도와주세요', wrong: { emoji: '🙅', text: '싫어요' }, next: { when: '도와주면', say: '고맙습니다.' },
      },
      {
        id: 'help-5-zipper', emoji: '🧥', title: '친구에게 도움 청하기', to: 'friend',
        scene: '겉옷 지퍼를 올려 봤는데 끝이 안 끼워져요. 선생님은 다른 친구를 돕고 계세요.',
        sentence: '지퍼가 안 돼. 도와줘.', word: '도와줘', card: '도와줘', wrong: { emoji: '👋', text: '안녕' }, next: { when: '도와주면', say: '고마워.' },
      },
    ],
  },
  {
    id: 'thanks',
    name: '고마움 말하기',
    cardEmoji: '🙏',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 보여 줘요' },
    days: [
      {
        id: 'thanks-1-eraser', emoji: '🧽', title: '지우개를 주워 줬어요', to: 'friend',
        scene: '지우개가 책상 밑으로 굴러갔어요. 짝꿍이 주워서 건네줬어요.',
        sentence: '지우개 주워 줘서 고마워.', word: '고마워', card: '고마워', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '이어서', say: '덕분에 찾았어.' },
      },
      {
        id: 'thanks-2-milk', emoji: '🥛', title: '우유를 열어 주셨어요', to: 'teacher',
        scene: '우유갑이 안 열려서 도움을 청했어요. 선생님이 열어 주셨어요.',
        sentence: '선생님, 열어 주셔서 고맙습니다.', word: '고맙습니다', card: '고맙습니다', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '이어서', say: '잘 마실게요.' },
      },
      {
        id: 'thanks-3-crayon', emoji: '🖍️', title: '색연필을 빌려줬어요', to: 'friend',
        scene: '빨간 색연필이 없어요. 친구가 자기 색연필을 빌려줬어요.',
        sentence: '색연필 빌려줘서 고마워.', word: '고마워', card: '고마워', wrong: { emoji: '👋', text: '안녕' }, next: { when: '다 쓰면', say: '돌려줄게. 고마워.' },
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
    ],
  },
  {
    id: 'sorry',
    name: '사과하기',
    cardEmoji: '🙇',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드리고 고개를 숙여요', friend: '그림 카드를 친구에게 보여 주고 고개를 숙여요' },
    days: [
      {
        id: 'sorry-1-bump', emoji: '💥', title: '친구와 부딪쳤어요', to: 'friend',
        scene: '복도에서 뛰다가 친구와 부딪쳤어요. 친구가 팔을 문지르고 있어요.',
        sentence: '부딪쳐서 미안해. 괜찮아?', word: '미안해', card: '미안해', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '친구가 괜찮다고 하면', say: '다음엔 천천히 걸을게.' },
      },
      {
        id: 'sorry-2-spill', emoji: '💧', title: '물을 쏟았어요', to: 'friend',
        scene: '물을 마시다가 쏟았어요. 옆 친구의 학습지가 젖었어요.',
        sentence: '물 쏟아서 미안해.', word: '미안해', card: '미안해', wrong: { emoji: '👋', text: '안녕' }, next: { when: '이어서', say: '같이 닦을게.' },
      },
      {
        id: 'sorry-3-late', emoji: '⏰', title: '늦게 왔어요', to: 'teacher',
        scene: '교실에 늦게 들어왔어요. 수업이 벌써 시작했어요.',
        sentence: '선생님, 늦어서 죄송합니다.', word: '죄송합니다', card: '죄송합니다', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '이어서', say: '다음엔 일찍 올게요.' },
      },
      {
        id: 'sorry-4-pencil', emoji: '✏️', title: '연필이 부러졌어요', to: 'friend',
        scene: '친구 연필을 빌려 쓰다가 너무 세게 눌러서 심이 부러졌어요.',
        sentence: '연필 부러뜨려서 미안해.', word: '미안해', card: '미안해', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '이어서', say: '내 연필 빌려줄게.' },
      },
      {
        id: 'sorry-5-push', emoji: '🚶', title: '줄 서다가 밀었어요', to: 'friend',
        scene: '줄을 서다가 앞 친구를 밀었어요. 친구가 넘어질 뻔했어요.',
        sentence: '밀어서 미안해. 괜찮아?', word: '미안해', card: '미안해', wrong: { emoji: '😴', text: '졸려' }, next: { when: '이어서', say: '다음엔 조심할게.' },
      },
    ],
  },
  {
    id: 'ask',
    name: '허락 구하기',
    cardEmoji: '✋',
    cardAct: { teacher: '손을 들고 그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 보여 줘요' },
    days: [
      {
        id: 'ask-1-toilet', emoji: '🚻', title: '화장실에 가고 싶어요', to: 'teacher',
        scene: '수업 시간이에요. 화장실에 가고 싶어요.',
        sentence: '선생님, 화장실 다녀와도 돼요?', word: '화장실', card: '화장실 가고 싶어요', cardEmoji: '🚻', wrong: { emoji: '🍚', text: '배고파요' }, next: { when: '허락해 주시면', say: '다녀오겠습니다.' },
      },
      {
        id: 'ask-2-water', emoji: '🚰', title: '물을 마시고 싶어요', to: 'teacher',
        scene: '체육을 하고 교실에 왔어요. 목이 너무 말라요.',
        sentence: '선생님, 물 마셔도 돼요?', word: '물', card: '물 마시고 싶어요', cardEmoji: '🚰', wrong: { emoji: '😴', text: '졸려요' }, next: { when: '허락해 주시면', say: '고맙습니다.' },
      },
      {
        id: 'ask-3-scissors', emoji: '✂️', title: '가위를 빌리고 싶어요', to: 'friend',
        scene: '만들기 시간에 가위가 없어요. 짝꿍 책상 위에 가위가 있어요.',
        sentence: '가위 좀 빌려줄래?', word: '빌려줘', card: '빌려줘', wrong: { emoji: '🙇', text: '미안해' }, next: { when: '빌려주면', say: '고마워. 다 쓰고 줄게.' },
      },
      {
        id: 'ask-4-play', emoji: '⚽', title: '같이 놀고 싶어요', to: 'friend',
        scene: '쉬는 시간에 친구들이 공놀이를 해요. 나도 같이 하고 싶어요.',
        sentence: '나도 같이 해도 돼?', word: '같이 해', card: '같이 놀자', cardEmoji: '⚽', wrong: { emoji: '🙅', text: '싫어' }, next: { when: '좋다고 하면', say: '고마워!' },
      },
      {
        id: 'ask-5-book', emoji: '📚', title: '다 하고 책 읽기', to: 'teacher',
        scene: '학습지를 다 했어요. 친구들은 아직 하고 있어요. 책을 읽고 싶어요.',
        sentence: '선생님, 다 했어요. 책 읽어도 돼요?', word: '다 했어요', card: '다 했어요', cardEmoji: '✅', wrong: { emoji: '🚻', text: '화장실 가고 싶어요' }, next: { when: '허락해 주시면', say: '조용히 읽을게요.' },
      },
    ],
  },
  {
    id: 'no',
    name: '싫다고 말하기',
    cardEmoji: '🙅',
    cardAct: { teacher: '그림 카드를 선생님께 보여 드려요', friend: '그림 카드를 친구에게 똑바로 보여 줘요' },
    days: [
      {
        id: 'no-1-touch', emoji: '🖐️', title: '자꾸 만져요', to: 'friend',
        scene: '친구가 내 머리를 자꾸 만져요. 기분이 안 좋아요.',
        sentence: '만지지 마. 싫어.', word: '싫어', card: '싫어', wrong: { emoji: '🙏', text: '고마워' }, next: { when: '그래도 계속하면', say: '선생님께 말할 거야.' },
      },
      {
        id: 'no-2-take', emoji: '🖍️', title: '말없이 가져가요', to: 'friend',
        scene: '친구가 내 색연필을 말없이 가져가려고 해요.',
        sentence: '내 거야. 가져가지 마.', word: '안 돼', card: '안 돼', wrong: { emoji: '👋', text: '안녕' }, next: { when: '빌려 달라고 하면', say: '다 쓰고 빌려줄게.' },
      },
      {
        id: 'no-3-noise', emoji: '📢', title: '귀 옆에서 소리 질러요', to: 'friend',
        scene: '쉬는 시간에 친구가 내 귀 옆에서 크게 소리를 질러요. 귀가 아파요.',
        sentence: '소리 지르지 마. 귀가 아파.', word: '그만해', card: '그만해', wrong: { emoji: '⚽', text: '같이 놀자' }, next: { when: '그래도 계속하면', say: '선생님께 말할 거야.' },
      },
      {
        id: 'no-4-food', emoji: '🍽️', title: '못 먹는 음식이에요', to: 'teacher',
        scene: '급식에 못 먹는 음식이 나왔어요. 먹으면 배가 아파요.',
        sentence: '선생님, 이건 못 먹어요.', word: '못 먹어요', card: '못 먹어요', cardEmoji: '🍽️', wrong: { emoji: '🍚', text: '더 주세요' }, next: { when: '왜 그런지 물으시면', say: '먹으면 배가 아파요.' },
      },
      {
        id: 'no-5-myself', emoji: '💪', title: '혼자 할 수 있어요', to: 'friend',
        scene: '신발을 혼자 신을 수 있어요. 그런데 친구가 자꾸 대신 신겨 주려고 해요.',
        sentence: '괜찮아. 내가 할 수 있어.', word: '내가 할래', card: '내가 할래', wrong: { emoji: '😴', text: '졸려' }, next: { when: '어려우면', say: '그때 도와줘.' },
      },
    ],
  },
];
