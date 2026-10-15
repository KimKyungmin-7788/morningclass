import { dragDemo, useTour, type TourStep } from '@/core/ui/Tour';

// 시간표 맞추기 창을 처음 열었을 때 한 번 보여 주는 안내.
// 과목 카드 끌어 놓기(시범) → 정답 ✓ · 옮기기 · 비우기 → 교과 편집 → 정답 보기 · 완료 → 활동지(선택)

/** first: 1교시 정답 과목 — 시범은 그 카드를 1교시 칸으로 옮긴다 (정답이 없으면 보관함 첫 카드) */
export function TimetableTour({ first }: { first: string }) {
  const from = first ? `.tt-bank-grid .subject-chip[data-subj="${CSS.escape(first)}"]` : '.tt-bank-grid .subject-chip[data-subj]';
  const steps: TourStep[] = [
    { target: '.tt-slots, .tt-bank', title: '끌어 놓기', onEnter: () => dragDemo(from, '.tt-slot[data-slot="0"] .drop-zone'),
      text: <>오른쪽 과목 카드를 <b>끌어서</b> 왼쪽 교시 칸에 놓아요. </> },
    { target: '.tt-slots', title: '맞았는지 보기', text: <>설정에 넣은 시간표와 같으면 ✓가 떠요. 다르면 칸이 흔들려요. 설정에 시간표가 없으면 자유롭게 놓아요.</> },
    { target: '.tt-slot', title: '옮기기 · 비우기', text: <>놓은 카드는 다른 칸으로 끌어 옮기거나, ✕ 로 비워요.</> },
    { target: '.sj-edit', title: '교과 편집', text: <>‘교과 편집’으로 과목 카드 순서를 바꾸거나 빼요. 없는 과목은 보관함 맨 아래 ‘직접입력’으로 넣어요.</> },
    { target: '.tt-popup-actions', title: '완료', text: <>막히면 ‘정답 보기’, 다 놓았으면 ‘완료’를 눌러요. 완료하면 카드에서 교시마다 메모를 달 수 있어요.</> },
    { target: '#popup-extra .wd-setup-btn', title: '활동지 (선택)', text: <>‘활동지’로 시간표 활동지를 만들어요. 필요할 때만 써요.</> },
  ];
  useTour('timetable', steps, () => true);
  return null;
}
