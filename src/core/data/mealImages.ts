import { useEffect, useState } from 'react';
import * as db from '@/core/storage/db';
import { toast } from '@/core/ui/toast';
import type { MealImage } from './types';

// 급식 메뉴 그림: 메뉴 이름별로 저장해 두고, 다음에 같은 메뉴가 나오면 자동으로 보여 준다 (학급 공용)

let cache: Record<string, MealImage> | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());

export function resetMealImageCache(): void { cache = null; loading = null; emit(); }

function ensureLoaded(): Promise<void> {
  loading ??= db.getMealImages().then((all) => { cache = all; emit(); });
  return loading;
}

export async function getMealImages(): Promise<Record<string, MealImage>> {
  await ensureLoaded();
  return cache ?? {};
}

export function setMealImage(key: string, img: MealImage): void {
  cache = { ...cache, [key]: img };
  emit();
  db.putMealImage(key, img).catch(() => toast('그림을 저장하지 못했어요', 'error'));
}

export function useMealImages(): Record<string, MealImage> {
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump((n) => n + 1);
    listeners.add(fn);
    void ensureLoaded();
    return () => { listeners.delete(fn); };
  }, []);
  return cache ?? {};
}
