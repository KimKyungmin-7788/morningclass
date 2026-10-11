import { useCurrentClass } from '@/core/data/store';
import { progressOf, useDay } from '@/core/data/day';
import { usePlacement } from '@/features/layout/store';

// 하단 진행률: 화면에 놓인 카드의 아침 준비 중 몇 가지를 했는지 (모두 놓여 있으면 7가지)
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
      <div className="progress-wrap"><div className="progress-bar" style={{ width: `${(done / tasks.length) * 100}%` }} /></div>
      <div className={`status${all ? ' done' : ''}`}>{all ? '🎉 오늘의 아침 준비 완료! 모두 화이팅!' : `아침 준비 ${done}/${tasks.length}`}</div>
    </footer>
  );
}
