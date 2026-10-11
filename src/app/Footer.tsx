import { useCurrentClass } from '@/core/data/store';
import { progressOf, useDay } from '@/core/data/day';
import { usePlacement } from '@/features/layout/store';
import { DockCards } from '@/features/layout/Dock';

// 하단 줄: 왼쪽 절반은 바구니에 담긴 카드 이름(누르면 창으로 연다), 오른쪽 절반은 아침 준비 진행률.
// 진행률은 화면에 놓인 카드의 아침 준비 중 몇 가지를 했는지 (모두 놓여 있으면 7가지). 바구니가 비었으면 진행률이 줄 전체를 쓴다.
export function Footer() {
  const cls = useCurrentClass();
  const record = useDay((s) => s.record);
  const dateSet = useDay((s) => s.dateSet);
  const { slots } = usePlacement();
  const tasks = progressOf(record, cls, dateSet, Object.values(slots));
  const done = tasks.filter(Boolean).length;
  const all = done === tasks.length;
  return (
    <footer>
      <DockCards />
      <div className="progress-wrap"><div className="progress-bar" style={{ width: `${(done / tasks.length) * 100}%` }} /></div>
      <div className={`status${all ? ' done' : ''}`}>{all ? '🎉 오늘의 아침 준비 완료! 모두 화이팅!' : `아침 준비 ${done}/${tasks.length}`}</div>
    </footer>
  );
}
