import { useDay } from '@/core/data/day';
import { useTour, type TourStep } from '@/core/ui/Tour';

// 첫 접속 안내: 환영 창이 닫히고 화면이 한가해지면 아침교실 화면을 한 번 짚어 준다.
// 날짜를 아직 입력하지 않았으면 날짜부터 입력하게 하고, 입력하면 카드 화면으로 넘어간다.
// 수업교실은 아직 만드는 중이라 넣지 않는다.

const dateSet = () => useDay.getState().dateSet;
/** 날짜 고르는 창(달력)이 열려 있는지 */
const picking = () => !!document.querySelector('.dp-modes');
/** 달력에서 평일(공휴일 아님)을 골랐는지 — 주말 · 공휴일은 급식 등을 받아 올 수 없다 */
const weekdayPicked = () => !!document.querySelector('.cal-day.selected:not(.sun):not(.sat):not(.holiday)');

const STEPS: TourStep[] = [
  { target: 'header .date-card', title: '날짜', text: <>날짜를 바꾸면 그날의 기록을 볼 수 있어요. 날짜를 먼저 입력해요. 반짝이는 날짜 카드를 눌러 보세요.</>,
    skip: dateSet, until: () => dateSet() || picking() },
  { target: '.cal-grid', title: '날짜 고르기', text: <>이번 달 <b>평일</b> 하루를 눌러요. 주말 · 공휴일은 급식이 나오지 않아요.</>,
    skip: dateSet, until: () => dateSet() || weekdayPicked(), back: () => !picking() },
  { target: '.popup-actions .btn-save', title: '입력', text: <>‘입력’을 누르면 카드 화면이 열려요.</>,
    skip: dateSet, until: dateSet, back: () => !picking() || !weekdayPicked() },
  { target: 'main', title: '카드 화면', text: <>이곳은 아침에 할 일이 모여 있어요. 카드를 누르면 크게 열려요.</> },
  { target: 'header .school', title: '학급', text: <>학교 · 학급 이름을 누르면 다른 학급으로 바꿔요.</> },
  { target: 'main', title: '배치', text: <>카드를 <b>꾹 누르면</b> 화면 배치를 바꿀 수 있어요. ‘관리 → 학급설정 → 화면 배치 편집’에서도 시작할 수 있어요.</> },
  { target: 'footer', title: '바구니와 진행률', text: <>뺀 카드는 왼쪽 바구니에 이름으로 남아요. 아침 준비를 마칠수록 오른쪽 막대가 차요.</> },
  { target: 'header button[aria-label="관리 열기"]', title: '관리', text: <>학급과 학생, 출결 통계와 백업은 ‘관리’에서 확인해요. 시간표는 시간표 카드에서 고쳐요.</> },
];

export function MainTour() {
  useTour('main', STEPS);
  return null;
}
