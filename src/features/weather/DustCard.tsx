import { useDay } from '@/core/data/day';
import type { DustLevel } from './model';

// 오늘의 미세먼지: 날씨 창에서 날씨와 함께 고르거나 GPS 로 불러온다.
// 날씨 카드 아래쪽에는 고른 결과만 한 줄로 보여 준다 (따로 누르는 단추는 없다 — 카드를 누르면 날씨 창이 열린다).
export function DustChip() {
  const d = useDay((s) => s.record.dust) as DustLevel | null;
  if (!d) return null;
  return (
    <div className="dust-wrap">
      <div className={`dust-chip on dust-${d.level}`}>
        <i className="ph-fill ph-wind" /><span>미세먼지</span>
        <b><em role="img" aria-label={d.label}>{d.emoji}</em> {d.label}</b>
      </div>
    </div>
  );
}
