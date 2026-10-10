import { dustFromPm10, weatherFromCode, type DustLevel, type WeatherValue } from './model';

// 위치 기반 조회 (Open-Meteo, API 키 불필요).
// 정확한 위치 대신 약 1km 단위로 흐린 좌표만 날씨 서비스에 보낸다.

export class GeoError extends Error {
  constructor(public kind: 'no_geo' | 'denied' | 'failed') { super(kind); }
}

function getPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new GeoError('no_geo')); return; }
    const blur = (v: number) => Math.round(v * 100) / 100;
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: blur(p.coords.latitude), lon: blur(p.coords.longitude) }),
      (e) => reject(new GeoError(e.code === 1 ? 'denied' : 'failed')),
      { timeout: 8000, maximumAge: 600000, enableHighAccuracy: false },
    );
  });
}

async function fetchJson(url: string): Promise<{ current?: Record<string, number> }> {
  try {
    return await (await fetch(url)).json();
  } catch {
    throw new GeoError('failed');
  }
}

export async function geoWeather(): Promise<WeatherValue> {
  const { lat, lon } = await getPosition();
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,temperature_2m`);
  const base = weatherFromCode(data.current?.weather_code);
  if (!base) throw new GeoError('failed');
  const temp = data.current?.temperature_2m;
  return temp != null && !Number.isNaN(temp) ? { ...base, temp: Math.round(temp * 10) / 10 } : { ...base };
}

export async function geoDust(): Promise<{ d: DustLevel; pm10: number }> {
  const { lat, lon } = await getPosition();
  const data = await fetchJson(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10`);
  const pm10 = data.current?.pm10;
  const d = dustFromPm10(pm10);
  if (!d || pm10 == null) throw new GeoError('failed');
  return { d, pm10 };
}

/** 위치 조회가 안 됐을 때 보여 줄 말 */
export function geoErrorText(e: unknown, fallback: string): string {
  const kind = e instanceof GeoError ? e.kind : 'failed';
  return kind === 'no_geo' ? '이 기기는 위치를 지원하지 않아요' : kind === 'denied' ? `위치 권한이 꺼져 있어요 — ${fallback}` : `GPS 조회 실패 — ${fallback}`;
}
