import { useTour, type TourStep } from '@/core/ui/Tour';

// 칭찬판 창을 처음 열었을 때 한 번 보여 주는 안내.
// 학생 고르기 → 칭찬판 → 칭찬 주기(선생님 확인) → 맞춤 → 칭찬판 설정

const STEPS: TourStep[] = [
  { target: '.pr-strip', title: '학생 고르기', text: <>학생을 누르면 아래에 그 학생의 칭찬판이 크게 나와요.</> },
  { target: '.pr-stage', title: '칭찬판', text: <>스티커를 다 채우면 보상을 고르고, 칭찬 인증서를 받아요.</> },
  { target: () => (document.querySelector('.pr-give') ? '.pr-give' : '.pr-stage-side'), title: '칭찬 주기',
    text: <>칭찬할 일을 누르면 스티커가 하나 붙어요. 선생님 확인 문제(곱셈)를 맞혀야 줄 수 있어요. 잘못 주면 ‘방금 준 것 취소’로 되돌려요.</> },
  { target: '.pr-tailor', title: '맞춤 칭찬', text: <>‘맞춤 정하기’로 이 학생에게만 주는 칭찬 이유와 보상을 정해요.</> },
  { target: '#popup-extra .wd-setup-btn', title: '칭찬판 설정', text: <>‘칭찬판 설정’에서 판 모양 · 칸 수 · 칭찬 이유 · 보상을 바꿔요.</> },
];

export function PraiseTour() {
  useTour('praise', STEPS, () => true);
  return null;
}
