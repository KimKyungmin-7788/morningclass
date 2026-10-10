// 공휴일 계산 (기존 holidaysOfYear 그대로). 날짜 열쇠는 'YYYY-MM-DD'.

/** 매년 고정 공휴일 (양력) */
const FIXED: Record<string, string> = {
  '01-01': '신정', '03-01': '삼일절', '05-05': '어린이날', '06-06': '현충일',
  '08-15': '광복절', '10-03': '개천절', '10-09': '한글날', '12-25': '성탄절',
};
/** 음력 공휴일의 양력 날짜 (설날·추석 당일, 부처님오신날) — 새 학년도가 오면 한 줄만 추가 */
const LUNAR: Record<number, { seol: string; chuseok: string; buddha: string }> = {
  2025: { seol: '01-29', chuseok: '10-06', buddha: '05-05' },
  2026: { seol: '02-17', chuseok: '09-25', buddha: '05-24' },
  2027: { seol: '02-07', chuseok: '09-15', buddha: '05-13' },
  2028: { seol: '01-27', chuseok: '10-03', buddha: '05-02' },
};
/** 선거일·임시공휴일 (정부가 따로 정하는 날) */
const SPECIAL: Record<string, string> = {
  '2025-01-27': '임시공휴일', '2025-06-03': '대통령선거일', '2026-06-03': '지방선거일', '2028-04-12': '국회의원선거일',
};
// 대체공휴일은 표로 적지 않고 규정(관공서의 공휴일에 관한 규정 제3조)대로 계산한다
//  · 설날·추석 연휴: 일요일 또는 다른 공휴일과 겹칠 때만 (토요일은 해당 없음) → 연휴 다음 첫 평일
//  · 삼일절·어린이날·부처님오신날·광복절·개천절·한글날·성탄절: 토·일요일 또는 다른 공휴일과 겹칠 때 → 다음 첫 평일
//  · 신정·현충일·선거일: 대체공휴일 없음
const SUB_WEEKEND = ['삼일절', '어린이날', '광복절', '개천절', '한글날', '성탄절'];

interface Hol { name: string; sub: 'weekend' | 'sunday' | null; group?: Date; d: Date }

const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const at = (ymd: string) => new Date(`${ymd}T00:00:00`);
const cache = new Map<number, Record<string, string>>();

export function holidaysOfYear(y: number): Record<string, string> {
  const hit = cache.get(y);
  if (hit) return hit;
  const on: Record<string, Hol[]> = {};
  const add = (d: Date, name: string, sub: Hol['sub'], group?: Date) => { (on[key(d)] ??= []).push({ name, sub, group, d }); };

  for (const [md, name] of Object.entries(FIXED)) add(at(`${y}-${md}`), name, SUB_WEEKEND.includes(name) ? 'weekend' : null);
  const lunar = LUNAR[y];
  if (lunar) {
    for (const [k, name] of [['seol', '설날'], ['chuseok', '추석']] as const) {
      const mid = at(`${y}-${lunar[k]}`);
      const end = new Date(mid); end.setDate(end.getDate() + 1);
      for (let i = -1; i <= 1; i += 1) { const d = new Date(mid); d.setDate(d.getDate() + i); add(d, name, 'sunday', end); }
    }
    add(at(`${y}-${lunar.buddha}`), '부처님오신날', 'weekend');
  }
  for (const [ymd, name] of Object.entries(SPECIAL)) if (ymd.startsWith(`${y}-`)) add(at(ymd), name, null);

  const out: Record<string, string> = {};
  for (const [k, list] of Object.entries(on)) out[k] = [...new Set(list.map((h) => h.name))].join('·');
  // 겹친 날마다 필요한 대체공휴일 수 계산 → 다음 첫 평일(휴일·이미 정한 대체일 제외)에 배정
  const isOff = (d: Date) => d.getDay() === 0 || d.getDay() === 6 || !!out[key(d)];
  for (const k of Object.keys(on).sort()) {
    const list = on[k];
    const dow = list[0].d.getDay();
    const eligible = list.filter((h) => (h.sub === 'weekend' ? dow === 0 || dow === 6 : h.sub === 'sunday' ? dow === 0 : false));
    const overlap = list.some((h) => h.sub) && list.length > 1;
    let need = dow === 0 || dow === 6 ? eligible.length : 0;
    if (overlap && need === 0) need = list.length - 1; // 평일에 공휴일끼리 겹침 (예: 어린이날=부처님오신날)
    if (!need) continue;
    const from = list.reduce((m, h) => (h.group && h.group > m ? h.group : m), list[0].d); // 설·추석은 연휴가 끝난 뒤부터
    const d = new Date(from);
    while (need > 0) { d.setDate(d.getDate() + 1); if (!isOff(d)) { out[key(d)] = '대체공휴일'; need -= 1; } }
  }
  cache.set(y, out);
  return out;
}

export function holidayName(d: Date): string {
  return holidaysOfYear(d.getFullYear())[key(d)] ?? '';
}
