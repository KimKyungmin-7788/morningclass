// D-DAY 계산 (화면과 무관)

export interface DdayItem { id: string; name: string; date: string /* YYYY-MM-DD */ }

/** 기준 날짜에서 목표 날짜까지 남은 날 수 (지났으면 음수) */
export function ddayDiff(dateStr: string, base: Date): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const from = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  return Math.round((new Date(y, m - 1, d).getTime() - from.getTime()) / 86400000);
}

export const ddayLabel = (diff: number) => (diff === 0 ? 'D-DAY' : diff > 0 ? `D-${diff}` : `D+${Math.abs(diff)}`);

/** 다가오는 것 먼저(가까운 미래 → 오늘 포함), 지난 것은 뒤로(최근에 지난 것부터) */
export function ddaySorted(list: DdayItem[], base: Date): DdayItem[] {
  return [...list].sort((a, b) => {
    const da = ddayDiff(a.date, base);
    const db = ddayDiff(b.date, base);
    const ra = da < 0 ? 1 : 0;
    const rb = db < 0 ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return da < 0 ? db - da : da - db;
  });
}

export function fmtDdayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${y}. ${m}. ${d}.`;
}
