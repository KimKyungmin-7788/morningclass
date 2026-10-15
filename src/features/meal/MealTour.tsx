import { useTour, type TourStep } from '@/core/ui/Tour';

// 급식 창을 처음 열었을 때 한 번 보여 주는 안내 (메뉴를 다 불러온 뒤에 띄운다).
// 메뉴 → 고치기 · 그림 · 숨기기 → 보기 방식 → 알레르기 → 다시 불러오기 → 학습지(선택)

const STEPS: TourStep[] = [
  { target: '.mm-body', title: '오늘 급식', text: <>오늘 급식 메뉴예요. 설정에 학교를 등록해 두면 저절로 불러와요.</> },
  { target: '.ml-row', title: '메뉴 고치기', skip: () => !document.querySelector('.ml-row'),
    text: <>메뉴 이름을 누르면 고칠 수 있어요. 그림은 ‘바꾸기’로 바꾸고, 안 보일 메뉴는 눈 모양 단추로 숨겨요.</> },
  { target: '.mv-toggle', title: '보기 방식', text: <>‘그림 + 글자’와 ‘글자만’ 중 보기 편한 방식을 골라요.</> },
  { target: '.mm-tools button:nth-child(2)', title: '알레르기', text: <>‘알레르기 설정’에 학생 알레르기를 넣으면, 그 음식이 나온 메뉴에 ⚠️ 학생 이름이 떠요.</> },
  { target: '.mm-tools button:first-child', title: '다시 불러오기', text: <>메뉴가 안 맞거나 비어 있으면 ‘다시 불러오기’를 눌러요.</> },
  { target: '.mm-tools button:nth-child(3)', title: '학습지 (선택)', text: <>‘학습지 제작’으로 오늘 급식 학습지를 만들어요. 필요할 때만 써요.</> },
];

export function MealTour() {
  useTour('meal', STEPS, () => !document.querySelector('.meal-loading'));
  return null;
}
