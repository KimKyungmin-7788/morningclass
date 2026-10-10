// 날씨·미세먼지의 선택지와 판정 규칙 (화면과 무관한 계산)

export interface WeatherKind { emoji: string; label: string; cls: string }
export interface Feel { k: string; rng: string; emoji: string; label: string; max: number; say: string }
export interface DustLevel { emoji: string; label: string; hint: string; level: number }

/** 하루 기록에 저장하는 날씨 값 */
export interface WeatherValue extends WeatherKind {
  temp?: number;
  /** 기온 숫자 없이 직접 고른 체감 단계 */
  feel?: string;
  /** GPS 정답 확인을 했을 때 학생이 골랐던 답 */
  guess?: { label: string; feel: string | null; wOk: boolean; fOk: boolean | null };
}

export const WEATHER: WeatherKind[] = [
  { emoji: '☀️', label: '맑음', cls: 'w-sunny' }, { emoji: '⛅', label: '구름조금', cls: 'w-cloud' },
  { emoji: '☁️', label: '흐림', cls: 'w-cloud' }, { emoji: '🌧️', label: '비', cls: 'w-rain' },
  { emoji: '⛈️', label: '천둥번개', cls: 'w-rain' }, { emoji: '❄️', label: '눈', cls: 'w-snow' },
];

/** 기온 → 체감 (등교 기준). max: 이 온도 이하 */
export const FEEL: Feel[] = [
  { k: 'cold', rng: '8° 이하', emoji: '🥶', label: '추워요', max: 8, say: '따뜻하게 입어요' },
  { k: 'cool', rng: '9~16°', emoji: '🧥', label: '쌀쌀해요', max: 16, say: '겉옷을 챙겨요' },
  { k: 'good', rng: '17~24°', emoji: '🍃', label: '적당해요', max: 24, say: '가벼운 옷이면 돼요' },
  { k: 'warm', rng: '25~27°', emoji: '😅', label: '살짝 더워요', max: 27, say: '가볍게 입어요' },
  { k: 'hot', rng: '28° 이상', emoji: '🥵', label: '더워요', max: 99, say: '시원하게 입고 물을 자주 마셔요' },
];

export const DUST: DustLevel[] = [
  { emoji: '😁', label: '좋음', hint: '마스크 안 써도 돼요', level: 0 },
  { emoji: '🌿', label: '보통', hint: '평소처럼 활동해요', level: 1 },
  { emoji: '😷', label: '나쁨', hint: '마스크를 써요', level: 2 },
  { emoji: '⚠️', label: '매우나쁨', hint: '실외활동 주의해요', level: 3 },
];

/** 날씨별 컨셉: 장면 종류·아이콘·한마디 */
export const WX_THEME: Record<string, { k: string; ph: string; title: string; say: string }> = {
  맑음: { k: 'sunny', ph: 'ph-sun', title: '햇살 가득한 날', say: '햇볕이 쨍쨍 비춰요' },
  구름조금: { k: 'partly', ph: 'ph-cloud-sun', title: '산책하기 좋은 날', say: '해님이 구름이랑 숨바꼭질해요' },
  흐림: { k: 'cloudy', ph: 'ph-cloud', title: '포근한 구름 이불', say: '구름이 하늘을 포근하게 덮었어요' },
  비: { k: 'rain', ph: 'ph-cloud-rain', title: '빗방울 톡톡', say: '톡톡! 비가 와요. 우산을 챙겨요' },
  천둥번개: { k: 'storm', ph: 'ph-cloud-lightning', title: '번쩍 우르릉', say: '천둥이 쳐요. 교실에서 안전하게 지내요' },
  눈: { k: 'snow', ph: 'ph-cloud-snow', title: '하얀 눈나라', say: '펑펑 눈이 와요! 미끄러지지 않게 조심해요' },
};
export const wxTheme = (w: { label?: string } | null | undefined) => WX_THEME[w?.label ?? ''] ?? WX_THEME['맑음'];

export const feelFromTemp = (t: number | null | undefined): Feel | null =>
  (t == null || Number.isNaN(t) ? null : FEEL.find((f) => Math.round(t) <= f.max) ?? null);

/** 기온 숫자가 있으면 그것으로, 없으면 직접 고른 체감 단계로 */
export const wxFeel = (w: WeatherValue | null | undefined): Feel | null =>
  (w?.temp != null ? feelFromTemp(w.temp) : FEEL.find((f) => f.k === w?.feel) ?? null);

/** WMO 날씨 코드 → 날씨 선택지 */
export function weatherFromCode(code: number | null | undefined): WeatherKind | null {
  if (code == null) return null;
  let label = '흐림';
  if (code === 0) label = '맑음';
  else if (code === 1 || code === 2) label = '구름조금';
  else if (code === 3 || code === 45 || code === 48) label = '흐림';
  else if ((code >= 71 && code <= 77) || code === 85 || code === 86) label = '눈';
  else if (code >= 95) label = '천둥번개';
  else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) label = '비';
  return WEATHER.find((w) => w.label === label) ?? null;
}

/** PM10(㎍/㎥) → 미세먼지 등급 (한국 기준) */
export function dustFromPm10(v: number | null | undefined): DustLevel | null {
  if (v == null || Number.isNaN(v)) return null;
  const level = v <= 30 ? 0 : v <= 80 ? 1 : v <= 150 ? 2 : 3;
  return DUST[level];
}

/** 학생이 고른 답을 GPS 정답과 비교 */
export function judgeWeather(guessLabel: string, guessFeel: string | null, answer: WeatherValue) {
  const af = wxFeel(answer);
  const wOk = guessLabel === answer.label;
  const fOk = guessFeel && af ? guessFeel === af.k : null; // 기온을 고르지 않았거나 GPS 에 기온이 없으면 판정 안 함
  return { wOk, fOk, allOk: wOk && fOk !== false };
}
