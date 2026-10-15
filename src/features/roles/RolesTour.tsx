import { useTour, type TourStep } from '@/core/ui/Tour';

// 1인 1역할 안내 두 가지 (각각 처음 한 번)
//  · 역할 정하기 창: 역할 고르기 → 맡을 친구 → 골고루 나누기 · 돌리기 → 상태 줄 → 저장
//  · 역할판(창으로 열었을 때): 역할판 → 했어요 → 역할 정하기

const SETUP: TourStep[] = [
  { target: '.rl-presets', title: '역할 고르기', text: <>우리 반에 필요한 역할을 눌러 골라요. 없는 역할은 ‘직접 만들기’로 만들어요.</> },
  // 역할을 아직 고르지 않았으면 '역할을 먼저 골라 주세요' 자리를 짚는다
  { target: () => (document.querySelector('.rl-edit .rl-chips') ? '.rl-edit .rl-chips' : '.rl-empty'), title: '맡을 친구',
    text: <>역할을 고르면 여기에 역할 카드가 생겨요. 역할마다 맡을 친구 이름을 눌러요. 한 역할을 여러 명이 맡아도 돼요.</> },
  { target: '.rl-tools', title: '한꺼번에 나누기', text: <>‘골고루 나누기’는 모두에게 하나씩, ‘한 칸씩 돌리기’는 맡은 친구를 다음 역할로 옮겨요. 바꾼 뒤에는 ‘되돌리기’로 한 번 되돌릴 수 있어요.</> },
  { target: '.rl-sum', title: '빠진 친구', text: <>위 줄에서 아직 역할이 없는 친구와 맡은 친구가 없는 역할을 알려 줘요.</> },
  { target: '.popup-actions .btn-save', title: '저장', text: <>다 정했으면 ‘저장’을 눌러요. 역할은 바꿀 때까지 그대로 가요.</> },
];

const TODAY: TourStep[] = [
  { target: '.popup-overlay .rl-board', title: '역할판', text: <>역할마다 맡은 친구가 보여요. 역할 그림을 누르면 읽어 줘요.</> },
  { target: '.popup-overlay .rl-m', title: '오늘 했어요', text: <>일을 마친 친구는 자기 이름을 눌러 ‘오늘 했어요’를 남겨요. 결석한 친구는 흐리게 보여요. 칭찬판 설정에서 켜 두면 스티커도 하나 붙어요.</> },
  { target: '#popup-extra .wd-setup-btn, .popup-overlay .tl-side button', title: '역할 정하기', text: <>역할이나 맡은 친구를 바꾸려면 ‘역할 정하기’를 눌러요.</> },
];

export function RolesSetupTour() {
  useTour('roles-setup', SETUP, () => true);
  return null;
}

/** 역할판은 대시보드 카드에도 그려지므로, 창 안에 있을 때만 띄운다 */
export function RolesTodayTour() {
  useTour('roles', TODAY, () => !!document.querySelector('.popup-overlay .rl-board'));
  return null;
}
