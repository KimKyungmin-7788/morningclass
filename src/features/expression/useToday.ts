import { useEffect } from 'react';
import { dateKeyOf } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { dayId, emptyExprBook, exprById, normalizeExprBook, settleDay, type ExprBook, type ExprPick } from './model';

// 학급의 생활표현 설정(학생 수준 · 뽑기 기록)과 그날의 상황.
// 그날 상황: 선생님이 정해 둔 것이 먼저, 없으면 저장소를 다 읽은 뒤에 한 번 무작위로 뽑아 저장한다 (카드와 창이 같은 상황을 본다).
export function useExprToday(classId: string | undefined, date: Date): { pick: ExprPick | undefined; book: ExprBook; setBook: (b: ExprBook) => void } {
  const [saved, setBook, loaded] = useKv(`expr:${classId ?? ''}`, emptyExprBook());
  const book = normalizeExprBook(saved);
  const key = dateKeyOf(date);
  const id = dayId(book, key);
  const pick = exprById(id);
  // 그날 것을 뽑기 기록에 확정한다 (선생님이 정한 것이 있으면 그것, 없으면 무작위)
  const settled = book.bag.days[key] === id;
  useEffect(() => {
    if (!classId || !loaded || (pick && settled)) return;
    const bag = settleDay(book, key);
    if (bag) setBook({ ...book, bag });
    // book 은 매번 새로 만들어진다 — 뽑을지는 pick 이 정한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, loaded, key, id, settled]);
  return { pick, book, setBook };
}
