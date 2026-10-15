import { dragDemo, useTour, type TourStep } from '@/core/ui/Tour';

// 마음 일기 창을 처음 열었을 때 한 번 보여 주는 안내.
// 감정 친구 → 사람 몸에 넣기(시범) → 가장 큰 감정 · 빼기 → 넣는 방식 → 완료

/** mode: 넣는 방식 (끌어서 / 눌러서) — 안내를 시작할 때의 방식으로 설명한다 */
export function EmotionTour({ mode }: { mode: 'drag' | 'tap' }) {
  const steps: TourStep[] = [
    { target: '.emo-palette', title: '감정 친구들', text: <>오늘 내 마음과 닮은 감정 친구를 찾아요. 여러 개 넣어도 괜찮아요.</> },
    mode === 'drag'
      ? { target: '.emo-palette, .emo-fig-box', title: '마음에 넣기', onEnter: () => dragDemo('.emo-pal-item', '.emo-fig-wrap'),
          text: <>감정 친구를 <b>끌어서</b> 사람 몸에 넣어요.</> }
      : { target: '.emo-palette, .emo-fig-box', title: '마음에 넣기',
          text: <>감정 친구를 <b>누르고</b>, 사람 몸을 눌러 넣어요.</> },
    { target: '.emo-fig-box', title: '가장 큰 감정', text: <>가장 큰 감정은 가운데 동그라미로 옮겨요. 넣은 감정을 누르거나 몸 밖으로 끌어내면 빠져요.</> },
    { target: '.emo-mode', title: '넣는 방식', text: <>끌기가 어려우면 ‘눌러서 넣기’로 바꿔요. 한 번 바꾸면 이 학급은 계속 그 방식이에요.</> },
    { target: '.emo-actions', title: '완료', text: <>‘완료하기’를 누르면 저장되고, 카드에 이 학생의 감정이 보여요.</> },
  ];
  useTour('emotions', steps, () => true);
  return null;
}
