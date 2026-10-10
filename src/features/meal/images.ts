import { getMealImages, setMealImage } from '@/core/data/mealImages';
import { dishKey } from './model';

// 메뉴 그림 찾기: 이미지 검색 서버(/api/image — 카카오·네이버, 키는 서버 환경변수) → 안 되면 위키미디어 공용(키 불필요)

export interface ImageHit { thumb: string; link?: string }
export interface SearchResult { src: 'api' | 'commons' | 'none'; items: ImageHit[] }

export async function searchImages(q: string): Promise<SearchResult> {
  try {
    const r = await fetch(`/api/image?q=${encodeURIComponent(q)}`);
    if (r.ok) { const d = await r.json(); if (Array.isArray(d.items) && d.items.length) return { src: 'api', items: d.items }; }
  } catch {
    /* 서버 함수가 없으면 아래 공용 그림으로 */
  }
  try {
    const u = `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=12&gsrsearch=${encodeURIComponent(`${q} filetype:bitmap`)}&prop=imageinfo&iiprop=url&iiurlwidth=320`;
    const d = await (await fetch(u)).json();
    const pages = Object.values((d?.query?.pages ?? {}) as Record<string, { index: number; imageinfo?: { thumburl?: string }[] }>);
    const items = pages.sort((a, b) => a.index - b.index).map((p) => p.imageinfo?.[0]?.thumburl).filter((t): t is string => !!t).slice(0, 6).map((thumb) => ({ thumb }));
    return { src: 'commons', items };
  } catch {
    return { src: 'none', items: [] };
  }
}

let busy = false;
let apiOff = false;   // 이미지 검색 키가 없으면 이번 접속 동안은 다시 시도하지 않는다

/** 저장된 그림이 없는 메뉴에 첫 번째 검색 결과를 자동으로 넣는다 (검색 키가 연결돼 있을 때만 — 공용 그림 결과는 부정확) */
export async function autoMealImages(names: string[]): Promise<void> {
  if (busy || apiOff) return;
  const saved = await getMealImages();
  const todo = names.filter((n) => !saved[dishKey(n)]);
  if (!todo.length) return;
  busy = true;
  try {
    for (const n of todo) {
      const res = await fetch(`/api/image?q=${encodeURIComponent(n)}`).catch(() => null);
      if (!res?.ok) { apiOff = true; break; }
      const hit = ((await res.json()) as { items?: ImageHit[] }).items?.[0];
      if (hit) setMealImage(dishKey(n), { src: hit.thumb, ...(hit.link ? { full: hit.link } : {}), auto: true });
    }
  } catch {
    apiOff = true;
  } finally {
    busy = false;
  }
}

/** 올린 그림 파일을 최대 400px JPEG 로 줄여 data URL 로 만든다 (저장 공간 절약) */
export function shrinkImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const rd = new FileReader();
    rd.onerror = () => reject(rd.error);
    rd.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('그림 파일을 읽을 수 없어요'));
      img.onload = () => {
        const sc = Math.min(1, 400 / Math.max(img.width, img.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
        cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
        resolve(cv.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(rd.result);
    };
    rd.readAsDataURL(file);
  });
}
