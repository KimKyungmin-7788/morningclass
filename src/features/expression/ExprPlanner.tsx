import { useState } from 'react';
import { PopupActions } from '@/core/ui/Popup';
import { playSound } from '@/core/sound';
import { DAY_NAMES, dateKeyOf } from '@/core/data/day';
import { EXPR_TOPICS } from './data';
import { exprById, prunePlan, weekDays, type ExprBook } from './model';

// 이번 주 정하기: 선생님이 월~금에 나올 상황을 고른다. 고르지 않은 날은 무작위.
// 위 = 월~금 다섯 칸 (빈 칸 하나가 '고를 자리'), 아래 = 주제 칩 + 그 주제의 상황 10개. 상황을 누르면 고를 자리에 들어가고, 다시 누르면 빠진다.

export function ExprPlanner({ book, date, onSave, onBack }: { book: ExprBook; date: Date; onSave: (plan: Record<string, string>) => void; onBack: () => void }) {
  const [plan, setPlan] = useState<Record<string, string>>(() => ({ ...book.plan }));
  const [offset, setOffset] = useState(0);
  const [cat, setCat] = useState(0);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = weekDays(date, offset);
  const keys = days.map(dateKeyOf);
  /** 지난 날은 이미 나왔으니 바꾸지 않는다 */
  const past = (i: number) => days[i].getTime() < today;
  const shown = (i: number) => plan[keys[i]] ?? (past(i) ? book.bag.days[keys[i]] : undefined);
  const firstEmpty = keys.findIndex((k, i) => !past(i) && !plan[k]);
  const [target, setTarget] = useState<number | null>(null);
  const slot = target != null && !past(target) ? target : firstEmpty;
  const inWeek = new Set(keys.map((k) => plan[k]).filter(Boolean));
  const used = new Set(book.bag.used);

  const put = (id: string) => {
    const at = keys.findIndex((k) => plan[k] === id);
    if (at >= 0 && past(at)) return;                                 // 지난 날에 나온 것은 그대로
    if (at >= 0) {                                      // 이미 고른 상황 → 뺀다
      const next = { ...plan }; delete next[keys[at]]; setPlan(next); setTarget(at); playSound('select'); return;
    }
    if (slot < 0) return;
    setPlan({ ...plan, [keys[slot]]: id });
    setTarget(null);
    playSound('check');
  };
  const clearDay = (i: number) => { const next = { ...plan }; delete next[keys[i]]; setPlan(next); setTarget(i); playSound('select'); };
  const range = `${days[0].getMonth() + 1}월 ${days[0].getDate()}일 ~ ${days[4].getMonth() + 1}월 ${days[4].getDate()}일`;
  const topic = EXPR_TOPICS[cat];

  return (
    <div className="xp">
      <div className="xp-week">
        <button className="xp-step" disabled={offset === 0} aria-label="이전 주" onClick={() => { setOffset(offset - 1); setTarget(null); }}>‹</button>
        <b>{range}</b><small>{offset === 0 ? '이번 주' : offset === 1 ? '다음 주' : `${offset}주 뒤`}</small>
        <button className="xp-step" disabled={offset >= 3} aria-label="다음 주" onClick={() => { setOffset(offset + 1); setTarget(null); }}>›</button>
      </div>

      <div className="xp-days">
        {days.map((d, i) => {
          const p = exprById(shown(i));
          const on = i === slot;
          return (
            <div key={keys[i]} role="button" tabIndex={past(i) ? -1 : 0} aria-label={`${DAY_NAMES[d.getDay()]}요일 ${p ? p.situation.title : '무작위'}`}
              className={`xp-day${p ? ' set' : ''}${on ? ' target' : ''}${past(i) ? ' past' : ''}`}
              onClick={() => { if (!past(i)) { setTarget(i); playSound('select'); } }}>
              <span className="xp-dow">{DAY_NAMES[d.getDay()]} <small>{d.getDate()}일</small></span>
              {p ? <>
                <span className="xp-em" aria-hidden="true">{p.situation.emoji}</span>
                <span className="xp-tt">{p.situation.title}</span>
                {!past(i) && plan[keys[i]] && <button className="xp-x" aria-label="빼기" onClick={(e) => { e.stopPropagation(); clearDay(i); }}>✕</button>}
              </> : <span className="xp-rand">{past(i) ? '지난 날' : on ? '👇 아래에서 골라요' : '🎲 무작위'}</span>}
              {on && p && <span className="xp-swap">바꿀 상황을 골라요</span>}
            </div>
          );
        })}
      </div>

      <div className="xp-cats" role="tablist" aria-label="주제">
        {EXPR_TOPICS.map((t, i) => {
          const n = t.items.filter((s) => inWeek.has(s.id)).length;
          return (
            <button key={t.id} role="tab" aria-selected={i === cat} className={i === cat ? 'on' : ''} onClick={() => { setCat(i); playSound('select'); }}>
              {t.cardEmoji} {t.name}{n > 0 && <em>{n}</em>}
            </button>
          );
        })}
      </div>

      <div className="xp-list">
        {topic.items.map((s) => {
          const picked = inWeek.has(s.id);
          const dayAt = keys.findIndex((k) => plan[k] === s.id);
          return (
            <button key={s.id} className={`xp-item${picked ? ' on' : ''}`} disabled={!picked && slot < 0} aria-pressed={picked} onClick={() => put(s.id)}>
              <span className="xp-check">{picked ? DAY_NAMES[days[dayAt].getDay()] : ''}</span>
              <span className="xp-em" aria-hidden="true">{s.emoji}</span>
              <span className="xp-txt"><b>{s.title}</b><small>{s.sentence}</small></span>
              {used.has(s.id) && !picked && <span className="xp-used" title="이번 바퀴에 이미 나온 상황">나왔음</span>}
            </button>
          );
        })}
      </div>

      <PopupActions>
        <button className="btn-tool" onClick={() => { const next = { ...plan }; keys.forEach((k, i) => { if (!past(i)) delete next[k]; }); setPlan(next); setTarget(null); playSound('select'); }}>↺ 이 주 비우기</button>
        <span className="pa-divider" aria-hidden="true" />
        <button className="btn-cancel" onClick={onBack}>취소</button>
        <button className="btn-save" onClick={() => onSave(prunePlan(plan, date))}>💾 저장</button>
      </PopupActions>
    </div>
  );
}
