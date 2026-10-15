import { dragDemo, useTour, type TourStep } from '@/core/ui/Tour';

// 생활표현 창을 처음 열었을 때 한 번 보여 주는 안내.
// 상황 그림 → '말해 보기'(안내가 연습 화면으로 바꿔 준다) → 수준별 연습 · 녹음 → 학생 배치(끌어 놓기 시범) → ✓ → 그림 카드 인쇄(선택)

/** 배치 중이면 이름 줄과 수준 칸을 함께, 배치를 마친 학급이면 '학생 배치하기' 단추를 밝힌다 */
const assignTarget = () => (document.querySelector('.ex-tray') ? '.ex-levels, .ex-tray' : '.ex-assign-btn');

/** showScene · showPractice: 안내가 상황 그림 화면과 연습 화면을 직접 바꿔 보여 준다 (누르지 않아도 넘어가게) */
export function ExprTour({ showScene, showPractice }: { showScene: () => void; showPractice: () => void }) {
  const steps: TourStep[] = [
    { target: '.ex-scene-big', title: '오늘의 상황', onEnter: showScene, text: <>그림을 보고 이럴 땐 뭐라고 말할지 생각해요. 글을 누르면 읽어 줘요.</> },
    { target: '.ex-days', title: '요일', onEnter: showScene, text: <>요일마다 상황이 바뀌어요. 다른 요일도 눌러 볼 수 있어요.</> },
    { target: '.ex-nav .next', title: '말해 보기', onEnter: showScene, text: <>‘말해 보기’를 누르면 연습 화면으로 넘어가요.</> },
    { target: '.ex-levels', title: '수준별 연습', onEnter: showPractice, text: <>학생 수준에 맞는 칸에서 연습해요. 문장 · 낱말은 듣고 따라 말하고, 그림 카드는 맞는 카드를 골라요.</> },
    { target: '.ex-level.lv-sentence .ex-acts', title: '녹음', onEnter: showPractice, text: <>‘녹음’으로 말해 보고 ‘내 목소리’로 들어 봐요. 마이크를 물으면 ‘허용’을 눌러요. 녹음은 저장하지 않아요.</> },
    { target: assignTarget, title: '학생 배치', onEnter: () => { showPractice(); return dragDemo('.ex-tray .ex-name', '.ex-level.lv-sentence .ex-names'); },
      text: <>학생 이름을 <b>끌어서</b> 수준에 맞는 칸(문장 · 낱말 · 그림 카드)에 놓아요. 모두 놓으면 배치가 저절로 끝나요. 다시 옮길 땐 ‘학생 배치하기’를 눌러요.</> },
    { target: '.ex-levels', title: '따라 말하기 ✓', onEnter: showPractice, text: <>따라 말한 학생은 칸에 있는 이름을 누르면 ✓가 돼요. 모두 ✓면 카드에도 ✓가 떠요.</> },
    { target: '#popup-extra .wd-setup-btn:last-child', title: '그림 카드 인쇄 (선택)', onEnter: showPractice, text: <>‘그림 카드 인쇄’로 그림 카드와 문장 띠를 뽑을 수 있어요. 필요할 때만 써요.</> },
  ];
  useTour('expression', steps, () => true);
  return null;
}
