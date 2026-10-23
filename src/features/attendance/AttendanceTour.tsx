import { useTour, type TourStep } from '@/core/ui/Tour';

// 출석 창을 처음 열었을 때 한 번 보여 주는 안내.
// 출결 고르기 → 결석 사유 · 전원 출석 · 완료 → 지난 출결은 설정의 출결 대시보드

const STEPS: TourStep[] = [
  { target: '.att-row:first-child', title: '출결 고르기', text: <>학생마다 출석 · 지각 · 조퇴 · 결석 중 <b>하나</b>를 눌러요.</> },
  { target: '.att-row:first-child button:nth-of-type(4)', title: '결석 사유 (선택)', text: <>‘결석’을 고르면 질병 · 인정 · 기타 · 미인정 중 사유도 고를 수 있어요. 고르지 않아도 돼요.</> },
  { target: '.popup-actions .btn-tool:first-of-type', title: '전원 출석', text: <>모두 왔으면 ‘전원 출석’을 누르고, 다른 학생만 바꿔요.</> },
  { target: '.popup-actions .btn-save', title: '완료', text: <>‘완료’를 눌러야 저장돼요. 카드에 출석 · 지각 · 결석 수가 보여요.</> },
  { target: 'header button[aria-label="관리 열기"]', title: '출결 대시보드', text: <>한 달 · 한 해 출결은 ‘관리’의 ‘출결 대시보드’에서 보고, 엑셀로 저장하거나 인쇄해요.</> },
];

export function AttendanceTour() {
  useTour('attendance', STEPS, () => true);
  return null;
}
