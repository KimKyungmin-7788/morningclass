import { useCallback, useEffect, useSyncExternalStore } from 'react';
import * as db from '@/core/storage/db';
import { toast } from '@/core/ui/toast';

// 낱개 자료(D-DAY 목록, 영상 이력 등)를 화면에서 읽고 쓰는 훅.
// 처음 쓸 때 저장소에서 읽어 메모리에 두고, 바꾸면 바로 저장한다.

const cache = new Map<string, unknown>();
const loading = new Set<string>();
/** 저장소에 값이 없다는 것을 확인한 열쇠 (다시 읽지 않는다) */
const missing = new Set<string>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** 저장소 내용이 통째로 바뀌었을 때(백업 가져오기) 메모리 사본을 버린다 */
export function resetKvCache(): void {
  cache.clear();
  missing.clear();
  emit();
}

export function useKv<T>(key: string, fallback: T): [T, (next: T) => void] {
  const value = useSyncExternalStore(subscribe, () => (cache.has(key) ? (cache.get(key) as T) : fallback));
  useEffect(() => {
    if (cache.has(key) || loading.has(key) || missing.has(key)) return;
    loading.add(key);
    void db.kvGet<T>(key).then((v) => { if (v == null) missing.add(key); else cache.set(key, v); loading.delete(key); emit(); });
    // fallback 은 매번 새 값이 올 수 있어 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);
  const set = useCallback((next: T) => {
    if (next === undefined) { cache.delete(key); missing.add(key); } else cache.set(key, next);
    emit();
    // undefined 를 넣으면 그 값을 지운다 (다음에 읽을 때 기본값으로 돌아간다)
    (next === undefined ? db.kvDelete(key) : db.kvSet(key, next)).catch(() => toast('저장하지 못했어요. 설정에서 백업을 받아 주세요', 'error'));
  }, [key]);
  return [value, set];
}
