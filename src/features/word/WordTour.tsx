import { useTour, type TourStep } from '@/core/ui/Tour';

// 어휘 창을 처음 열었을 때 한 번 보여 주는 안내 (오늘의 어휘가 있을 때).
// 낱말 · 뜻 · 문장 → 단계 → 활동 → 어휘 정하기 → 학습지(선택)

const STEPS: TourStep[] = [
  { target: '.wd-main', title: '오늘의 어휘', text: <>오늘의 낱말 · 뜻 · 문장이에요. 누르면 읽어 줘요.</> },
  { target: '.wd-levels', title: '단계', text: <>‘가 · 나 · 다’로 어휘 단계를 골라요. 가는 6~7세, 나는 초1~2, 다는 초3~4 수준이에요.</> },
  { target: '.wd-modes', title: '활동', text: <>‘읽기’는 글자를 짚으며 읽고, ‘쓰기’는 손으로 따라 쓰고, ‘말하기’는 녹음해 들어요.</> },
  { target: '#popup-extra .wd-setup-btn:last-child', title: '어휘 정하기', text: <>‘어휘 정하기’에서 요일별 어휘를 바꾸거나 직접 넣어요.</> },
  { target: '#popup-extra .wd-setup-btn:first-child', title: '학습지 (선택)', skip: () => document.querySelectorAll('#popup-extra .wd-setup-btn').length < 2,
    text: <>‘학습지’로 이번 주 어휘 학습지를 만들어요. 필요할 때만 써요.</> },
];

export function WordTour() {
  useTour('word', STEPS, () => !!document.querySelector('.wd-main'));
  return null;
}
