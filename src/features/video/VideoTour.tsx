import { useTour, type TourStep } from '@/core/ui/Tour';

// 영상 재생 창을 처음 열었을 때 한 번 보여 주는 안내.
// 링크 넣기 → 재생 화면 → 영상 목록 → 카드의 기본 영상도 이 창에서

const STEPS: TourStep[] = [
  { target: '.vw-url', title: '링크 넣기', text: <>유튜브 영상 링크를 붙여 넣으면 바로 재생돼요.</> },
  { target: '.vw-player', title: '재생 화면', text: <>영상은 여기서 재생돼요. 창을 처음 열면 멈춘 채로 보여요. 유튜브 영상이라 광고가 나올 수 있어요.</> },
  { target: '.vw-header .vw-btn:not(.close)', title: '영상 목록', text: <>‘영상 목록’에서 전에 튼 영상을 다시 골라요.</> },
  { target: '.vw-save-row', title: '기본 영상', text: <>카드에 걸어 둘 기본 영상은 ‘저장 · 기본 영상 지정’으로 바꿔요. 저장한 영상은 창을 닫아도 남아요.</> },
];

export function VideoTour() {
  useTour('video', STEPS, () => true);
  return null;
}
