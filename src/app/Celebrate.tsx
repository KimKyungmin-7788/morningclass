import { useEffect, useState } from 'react';
import { chime, fireworks } from '@/core/ui/fireworks';
import { speak } from '@/core/tts';
import { toast } from '@/core/ui/toast';
import { useCurrentClass } from '@/core/data/store';
import { progressOf, useDay } from '@/core/data/day';
import { useLayoutEdit, usePlacement } from '@/features/layout/store';

// 아침 준비 7가지를 모두 마치면 하루에 한 번 축하한다: 메시지 + 딩동댕동 + 폭죽 + 음성

export function Celebrate() {
  const cls = useCurrentClass();
  const record = useDay((s) => s.record);
  const dateSet = useDay((s) => s.dateSet);
  const update = useDay((s) => s.update);
  const [show, setShow] = useState(false);
  const { slots } = usePlacement();
  const editing = useLayoutEdit((s) => s.editing);
  // 화면을 꾸미는 중에는 축하하지 않는다 (카드를 빼서 남은 준비가 모두 끝난 것처럼 보일 수 있다)
  const allDone = !editing && progressOf(record, cls, dateSet, Object.values(slots)).every(Boolean);

  useEffect(() => {
    if (!allDone || record.celebrated) return;
    update((r) => { r.celebrated = true; });                      // 그날 한 번만
    setShow(true);
    const t = setTimeout(() => setShow(false), 2200);
    chime(); fireworks();
    speak('오늘 하루도 파이팅이에요! 좋은 하루 보내세요!', { rate: 1.0, pitch: 1.1 });
    toast('자동 저장됐어요 ✅', 'success');
    return () => clearTimeout(t);
    // record.celebrated 가 바뀌어 다시 불려도 위 조건에서 걸러진다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone]);

  return <div className={`celebrate-overlay${show ? ' active' : ''}`}><div className="celebrate-msg">🌟 오늘 하루도 파이팅이에요!</div></div>;
}
