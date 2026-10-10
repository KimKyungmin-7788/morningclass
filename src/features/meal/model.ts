import type { ClassRoom, Dish, Loose, Student } from '@/core/data/types';
import type { MealRow } from '@/core/net/neis';

// 급식 규칙 (화면과 무관한 계산)

/** NEIS 알레르기 번호 1~19 */
export const ALLERGENS = ['', '난류', '우유', '메밀', '땅콩', '대두', '밀', '고등어', '게', '새우', '돼지고기', '복숭아', '토마토', '아황산류', '호두', '닭고기', '쇠고기', '오징어', '조개류', '잣'];

/** "쇠고기미역국 (5.6.16)" / "배추김치9.13." → 이름과 알레르기 번호 */
export function parseDish(x: string): Dish {
  const am = x.match(/\(?\s*(\d+(?:\.\d+)*)\.?\s*\)?\s*$/);
  const codes = am ? [...new Set(am[1].split('.').map(Number).filter((n) => n >= 1 && n <= 19))] : [];
  const name = x.replace(/\s*\(\d+(\.\d+)*\.?\)/g, '').replace(/\s*\d+(\.\d+)*\.?\s*$/g, '').trim();
  return { name, codes };
}

export interface Nutri { kcal: number | null; carb?: number; prot?: number; fat?: number; vitA?: number; thia?: number; ribo?: number; vitC?: number; ca?: number; fe?: number }

/** NEIS 영양 정보 → 숫자 (학교 영양사가 입력한 공식 값) */
export function parseNutri(row: MealRow | undefined): Nutri | null {
  if (!row) return null;
  const MAP: Record<string, keyof Nutri> = { 탄수화물: 'carb', 단백질: 'prot', 지방: 'fat', 비타민A: 'vitA', 티아민: 'thia', 리보플라빈: 'ribo', 비타민C: 'vitC', 칼슘: 'ca', 철분: 'fe' };
  const out: Nutri = { kcal: parseFloat(row.CAL_INFO ?? '') || null };
  for (const line of String(row.NTR_INFO ?? '').split(/<br\s*\/?>/i)) {
    const m = line.match(/^\s*([^(:]+)\s*(?:\([^)]*\))?\s*:\s*([\d.]+)/);
    const key = m && MAP[m[1].trim()];
    if (m && key) (out[key] as number) = parseFloat(m[2]);
  }
  return out.kcal || out.carb ? out : null;
}

/** 급식 한 줄(NEIS) → 메뉴 목록과 영양 정보 */
export function parseMealRow(row: MealRow): { dishes: Dish[]; nutri: Nutri | null } {
  return { dishes: (row.DDISH_NM ?? '').split(/<br\s*\/?>/i).map(parseDish).filter((d) => d.name), nutri: parseNutri(row) };
}

/** 메뉴 그림을 저장하는 열쇠: 띄어쓰기·기호를 뺀 이름 */
export const dishKey = (name: string) => String(name).replace(/[\s*·]/g, '');

/** 숨긴 메뉴를 뺀 목록 (화면·음성·학습지용). 알레르기 경고는 숨겨도 그대로 알려 준다 */
export const shownDishes = (dishes: Dish[], hidden: string[] = []) => dishes.filter((d) => !hidden.includes(d.name.trim()));

/** 메뉴 하나에 대해 주의해야 할 학생과 겹치는 알레르기 번호 */
export function dishAlerts(dish: Dish, cls: ClassRoom | undefined): { student: Student; hits: number[] }[] {
  if (!dish.codes.length || !cls) return [];
  return cls.students.filter((s) => !s.archived).map((student) => ({ student, hits: (cls.allergies[student.id] ?? []).filter((c) => dish.codes.includes(c)) })).filter((x) => x.hits.length);
}

/** 오늘 급식 전체에서 주의할 학생 이름 */
export function mealAlertNames(dishes: Dish[], cls: ClassRoom | undefined): string[] {
  return [...new Set(dishes.flatMap((d) => dishAlerts(d, cls).map((a) => a.student.name)))];
}

/** 메뉴 이름 고치기. "우유 (2)"처럼 적으면 알레르기 번호도 바꾼다. 바뀐 것이 없으면 null */
export function renameDish(dishes: Dish[], index: number, raw: string): Dish[] | null {
  const p = parseDish(raw);
  const old = dishes[index];
  if (!p.name || !old || (p.name === old.name && !p.codes.length)) return null;
  return dishes.map((d, i) => (i === index ? { name: p.name, codes: p.codes.length ? p.codes : d.codes } : d));
}

/** 메뉴 이름을 단순하게 줄인 검색어 후보 (최대 3개). 예: 코코넛대왕새우튀김 → 새우튀김, 새우, 튀김 */
export function simplifyDishQueries(name: string): string[] {
  const base = String(name ?? '').replace(/\([^)]*\)|[0-9.\s]+/g, '').trim();
  const MOD = ['코코넛', '대왕', '쇠고기', '소고기', '돼지', '닭', '매콤', '매운', '얼큰', '해물', '치즈', '수제', '특별', '한입', '옛날', '순살', '바삭', '사천', '춘천', '부산', '전주', '안동', '양념', '간장', '마늘', '고추'];
  const END = ['샌드위치', '커틀릿', '샐러드', '스테이크', '떡볶이', '맛탕', '튀김', '볶음', '조림', '구이', '무침', '찌개', '국수', '볶음밥', '비빔밥', '덮밥', '김치', '나물', '까스', '국', '탕', '찜', '전', '죽', '면', '밥', '빵', '떡', '포크', '스프', '수프'];
  let core = base;
  for (let again = true; again;) {
    again = false;
    for (const m of MOD) if (core.startsWith(m) && core.length > m.length + 1) { core = core.slice(m.length); again = true; break; }
  }
  const end = END.find((e) => base.endsWith(e));
  const out = [core];
  if (end) {
    const P = base.slice(0, base.length - end.length);
    const I = P.length <= 3 ? P : P.slice(-2);                    // 재료 이름이 세 글자 이하면 통째로 (고구마)
    out.push(I + end, I, end);
  } else {
    if (base.length >= 4) out.push(base.slice(-3));
    if (base.length >= 5) out.push(base.slice(-2));
  }
  return [...new Set(out.filter((q) => q && q.length >= 2 && q !== base))].slice(0, 3);
}

export type MealValue = { dishes: Dish[]; nutri: Loose | null; loadedAt: string | null };
