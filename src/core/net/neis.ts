// NEIS(교육부) 오픈API 요청. 배포 환경에서는 서버 함수(/api/neis)가 키를 붙여 전달한다 — 키는 브라우저로 오지 않는다.
// 개인 키를 학급 설정에 넣어 둔 경우에만 직접 호출로 대신한다.

type Params = Record<string, string | number>;

export async function neisRequest<T = unknown>(endpoint: 'schoolInfo' | 'mealServiceDietInfo', params: Params, personalKey?: string): Promise<T> {
  const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), Type: 'json' }).toString();
  try {
    const r = await fetch(`/api/neis?endpoint=${encodeURIComponent(endpoint)}&${qs}`);
    if (r.ok) {
      const data = await r.json();
      if (data && !data.error) return data as T;
    }
  } catch {
    /* 서버 함수가 없는 환경(로컬) — 아래에서 개인 키로 시도 */
  }
  if (personalKey) {
    const r = await fetch(`https://open.neis.go.kr/hub/${endpoint}?KEY=${encodeURIComponent(personalKey)}&${qs}`);
    if (r.ok) return (await r.json()) as T;
  }
  throw new Error('neis_unavailable');
}

export interface SchoolRow { SCHUL_NM: string; ORG_RDNMA?: string; ATPT_OFCDC_SC_CODE: string; SD_SCHUL_CODE: string }

export async function searchSchools(name: string, personalKey?: string): Promise<SchoolRow[]> {
  const data = await neisRequest<{ schoolInfo?: [unknown, { row?: SchoolRow[] }] }>('schoolInfo', { pIndex: 1, pSize: 20, SCHUL_NM: name }, personalKey);
  return data.schoolInfo?.[1]?.row ?? [];
}

export interface MealRow { MMEAL_SC_CODE?: string | number; DDISH_NM?: string; CAL_INFO?: string; NTR_INFO?: string }

/** 그날의 급식 줄들. 급식이 없는 날은 빈 배열 */
export async function fetchMealRows(atptCode: string, schoolCode: string, dateKey: string, personalKey?: string): Promise<MealRow[]> {
  const data = await neisRequest<{ mealServiceDietInfo?: [unknown, { row?: MealRow[] }] }>('mealServiceDietInfo',
    { pIndex: 1, pSize: 5, ATPT_OFCDC_SC_CODE: atptCode, SD_SCHUL_CODE: schoolCode, MLSV_YMD: dateKey }, personalKey);
  return data.mealServiceDietInfo?.[1]?.row ?? [];
}

/** 조식·중식·석식이 있는 학교에서도 점심을 '오늘의 급식'으로 — 중식(코드 2)이 없으면 첫 끼니 */
export const pickLunch = (rows: MealRow[]): MealRow | undefined => rows.find((r) => String(r.MMEAL_SC_CODE) === '2') ?? rows[0];
