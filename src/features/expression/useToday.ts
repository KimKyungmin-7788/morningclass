import { useEffect } from 'react';
import { dateKeyOf } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { drawToday, emptyExprBook, exprById, normalizeExprBook, type ExprBook, type ExprPick } from './model';

// 학급의 생활표현 설정(학생 수준 · 뽑기 기록)과 그날의 상황.
// 그날 상황을 아직 안 뽑았으면 저장소를 다 읽은 뒤에 한 번 뽑아 저장한다 (카드와 창이 같은 상황을 본다).
export function useExprToday(classId: string | undefined, date: Date): { pick: ExprPick | undefined; book: ExprBook; setBook: (b: ExprBook) => void } {
  const [saved, setBook, loaded] = useKv(`expr:${classId ?? ''}`, emptyExprBook());
  const book = normalizeExprBook(saved);
  const key = dateKeyOf(date);
  const pick = exprById(book.bag.days[key]);
  useEffect(() => {
    if (!classId || !loaded || pick) return;
    setBook({ ...book, bag: drawToday(book.bag, key).bag });
    // book 은 매번 새로 만들어진다 — 뽑을지는 pick 이 정한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, loaded, key, pick]);
  return { pick, book, setBook };
}
