import { useEffect, useRef, useState } from 'react';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { holidayName } from '@/core/data/holidays';
import { DAY_NAMES, useDay } from '@/core/data/day';

// 날짜 선택: 달력에서 고르기 / 스티커를 붙여 날짜 만들기. 학생이 직접 고르도록 항상 미선택으로 시작한다.

type Mode = 'calendar' | 'sticker';
type TileKind = 'year' | 'month' | 'digit' | 'weekday';
const SLOT_OF: Record<TileKind, string> = { year: 'year', month: 'month', digit: 'day', weekday: 'weekday' };

export function DatePicker({ onClose }: { onClose: () => void }) {
  const current = useDay((s) => s.date);
  const confirmDate = useDay((s) => s.confirmDate);
  const [mode, setMode] = useState<Mode>('calendar');
  const [view, setView] = useState({ y: current.getFullYear(), m: current.getMonth() });
  const [calPick, setCalPick] = useState<Date | null>(null);
  const [st, setSt] = useState<{ year: number | null; month: number | null; raw: string }>({ year: null, month: null, raw: '' });
  const [hintOn, setHintOn] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const day = Number(st.raw) || null;
  const stickerPick = (() => {
    if (!st.year || !st.month || !day) return null;
    return day <= new Date(st.year, st.month, 0).getDate() ? new Date(st.year, st.month - 1, day) : null;
  })();
  const pick = mode === 'calendar' ? calPick : stickerPick;

  const confirm = () => {
    if (!pick) return;
    void confirmDate(pick);
    playSound('save');
    toast(`${pick.getFullYear()}.${pick.getMonth() + 1}.${pick.getDate()} 불러왔어요`, 'success');
    setTimeout(() => speak(`오늘은 ${pick.getFullYear()}년 ${pick.getMonth() + 1}월 ${pick.getDate()}일 ${DAY_NAMES[pick.getDay()]}요일입니다`), 320);
    onClose();
  };

  // ── 달력 힌트: 오늘이 있는 주를 점선으로 감싸고 요일을 깜빡여 준다 ──
  useEffect(() => {
    const grid = gridRef.current;
    if (!hintOn || !grid) return;
    const today = new Date();
    const cells = [...grid.children].slice(7) as HTMLElement[];
    const idx = cells.findIndex((c) => c.dataset.d === String(today.getDate()));
    if (idx < 0) return;
    const rowCells = cells.slice(Math.floor(idx / 7) * 7, Math.floor(idx / 7) * 7 + 7);
    rowCells.forEach((c) => c.classList.add('hint-row'));
    const first = rowCells[0];
    const last = rowCells[rowCells.length - 1];
    const frame = document.createElement('div');
    frame.className = 'cal-hint-frame';
    Object.assign(frame.style, {
      left: `${first.offsetLeft - 4}px`, top: `${first.offsetTop - 4}px`,
      width: `${last.offsetLeft + last.offsetWidth - first.offsetLeft + 8}px`, height: `${first.offsetHeight + 8}px`,
    });
    grid.appendChild(frame);
    const tags = rowCells.filter((c) => c.classList.contains('cal-day')).map((c) => {
      const i = cells.indexOf(c) % 7;
      const t = document.createElement('div');
      t.className = `cal-hint-dow${i === today.getDay() ? ' target' : ''}`;
      t.textContent = DAY_NAMES[i];
      Object.assign(t.style, { top: `${c.offsetTop - 6}px`, left: `${c.offsetLeft + c.offsetWidth / 2}px` });
      grid.appendChild(t);
      return t;
    });
    const clear = () => { rowCells.forEach((c) => c.classList.remove('hint-row')); frame.remove(); tags.forEach((t) => t.remove()); };
    const timer = setTimeout(clear, 5600);
    return () => { clearTimeout(timer); clear(); };
  }, [hintOn, view]);

  const showHint = () => {
    const today = new Date();
    speak(`지금 반짝이는 줄에서 ${DAY_NAMES[today.getDay()]}요일을 찾아보세요`);
    setView({ y: today.getFullYear(), m: today.getMonth() });
    setHintOn((n) => n + 1);
  };

  // ── 스티커 붙이기 ──
  const place = (kind: TileKind, val: string, slot: string) => {
    if (slot !== SLOT_OF[kind]) return; // 잘못된 칸에 놓음
    if (kind === 'weekday') {
      if (!stickerPick) { toast('먼저 년·월·일을 놓아요', 'error'); return; }
      if (DAY_NAMES[stickerPick.getDay()] === val) { playSound('correct'); speak(`맞아요! ${val}요일`); toast(`✅ ${val}요일 정답!`, 'success'); }
      else { playSound('wrong'); toast('요일을 다시 생각해봐요 🤔', 'error'); }
      return;
    }
    let say = '';
    if (kind === 'year') { setSt((s) => ({ ...s, year: Number(val) })); say = `${val}년`; }
    else if (kind === 'month') { setSt((s) => ({ ...s, month: Number(val) })); say = `${val}월`; }
    else {
      let cand = st.raw + val;
      if (cand.length > 2 || Number(cand) > 31) cand = val;
      if (Number(cand) === 0) cand = '';
      setSt((s) => ({ ...s, raw: cand }));
      say = Number(cand) ? `${Number(cand)}일` : '';
    }
    playSound('select');
    if (say) speak(say);
  };

  /** 스티커: 누르면 제 칸에 붙고, 끌어서 놓을 수도 있다 (터치 지원) */
  const tileProps = (kind: TileKind, val: string) => ({
    'data-kind': kind,
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button) return;
      const tile = e.currentTarget;
      const sx = e.clientX;
      const sy = e.clientY;
      let ghost: HTMLElement | null = null;
      const slots = () => bodyRef.current?.querySelectorAll('.st-slot') ?? [];
      const onMove = (ev: PointerEvent) => {
        if (!ghost && (Math.abs(ev.clientX - sx) > 6 || Math.abs(ev.clientY - sy) > 6)) {
          ghost = tile.cloneNode(true) as HTMLElement;
          ghost.classList.add('st-ghost');
          ghost.style.width = `${tile.offsetWidth}px`;
          document.body.appendChild(ghost);
          tile.style.opacity = '.4';
        }
        if (!ghost) return;
        ghost.style.left = `${ev.clientX - ghost.offsetWidth / 2}px`;
        ghost.style.top = `${ev.clientY - 20}px`;
        slots().forEach((s) => s.classList.remove('drag-over'));
        document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.st-slot')?.classList.add('drag-over');
      };
      const onUp = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        if (!ghost) { place(kind, val, SLOT_OF[kind]); return; }   // 끌지 않고 눌렀음
        ghost.remove();
        tile.style.opacity = '';
        slots().forEach((s) => s.classList.remove('drag-over'));
        const slot = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.st-slot');
        if (slot?.dataset.slot) place(kind, val, slot.dataset.slot);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); place(kind, val, SLOT_OF[kind]); } },
  });

  const calendar = () => {
    const startDow = new Date(view.y, view.m, 1).getDay();
    const lastD = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (number | null)[] = [...Array<null>(startDow).fill(null), ...Array.from({ length: lastD }, (_, i) => i + 1)];
    const step = (d: number) => { setHintOn(0); setView(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; }); };
    return (
      <div className="cal-pop">
        <div className="cal-head">
          <button onClick={() => step(-1)} aria-label="이전 달">‹</button>
          <span>{view.y}년 {view.m + 1}월</span>
          <button onClick={() => step(1)} aria-label="다음 달">›</button>
          <button className="cal-hint-btn" onClick={showHint}>💡 힌트</button>
        </div>
        <div className="cal-grid" ref={gridRef}>
          {DAY_NAMES.map((n, i) => (
            <div key={n} className="cal-dow" style={{ color: i === 0 ? 'var(--acc-coral)' : i === 6 ? 'var(--acc-sky)' : 'var(--text-sub)' }}>{n}</div>
          ))}
          {cells.map((c, i) => {
            if (c == null) return <div key={`e${i}`} className="cal-empty" />;
            const dt = new Date(view.y, view.m, c);
            const dow = dt.getDay();
            const hol = holidayName(dt);
            const selected = calPick?.toDateString() === dt.toDateString();
            const cls = ['cal-day', selected ? 'selected' : '', dow === 0 ? 'sun' : '', dow === 6 ? 'sat' : '', hol ? 'holiday' : ''].filter(Boolean).join(' ');
            return (
              <div key={c} className={cls} data-d={c} role="button" tabIndex={0} aria-pressed={selected}
                onClick={() => setCalPick(dt)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCalPick(dt); } }}>
                <span className="cal-dnum">{c}</span>
                {hol && <span className="cal-hname">{hol}</span>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const sticker = () => {
    const nowY = new Date().getFullYear();
    const weekday = stickerPick ? DAY_NAMES[stickerPick.getDay()] : null;
    const slot = (name: string, label: string, text: string | null, extra?: React.ReactNode) => (
      <div className="st-tcell">
        <div className="st-tlabel">{label}</div>
        <div className={`st-slot${text ? ' filled' : ''}`} data-slot={name}>
          {text ? <span>{text}</span> : <span className="ph">?</span>}{text && extra}
        </div>
      </div>
    );
    return (
      <div className="st-build">
        <div className="st-target">
          <div className="st-target-title">✨ 여기에 붙여서 날짜를 완성해요</div>
          <div className="st-target-slots">
            {slot('year', '년', st.year ? String(st.year) : null)}
            {slot('month', '월', st.month ? `${st.month}월` : null)}
            {slot('day', '일', day ? `${day}일` : null,
              <button className="st-clear" aria-label="일 지우기" onClick={() => { setSt((s) => ({ ...s, raw: '' })); playSound('select'); }}>✕</button>)}
            {slot('weekday', '요일', weekday ? `${weekday}요일` : null)}
          </div>
        </div>
        <div className="st-cols">
          <div className="st-col"><div className="st-tiles yr">{[nowY - 1, nowY, nowY + 1, nowY + 2].map((y) => <button key={y} className="st-tile yr" {...tileProps('year', String(y))}>{y}</button>)}</div></div>
          <div className="st-col"><div className="st-tiles mo">{Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <button key={m} className="st-tile mo" {...tileProps('month', String(m))}>{m}</button>)}</div></div>
          <div className="st-col"><div className="st-tiles dg">{Array.from({ length: 10 }, (_, i) => i).map((d) => <button key={d} className="st-tile dg" {...tileProps('digit', String(d))}>{d}</button>)}</div></div>
          <div className="st-col"><div className="st-tiles wk">{['월', '화', '수', '목', '금', '토', '일'].map((w) => <button key={w} className={`st-tile wk${weekday === w ? ' ok' : ''}`} {...tileProps('weekday', w)}>{w}</button>)}</div></div>
        </div>
        <div className="st-hint">스티커를 <b>눌러서(또는 끌어서)</b> 위 <b style={{ color: '#b45309' }}>노란 칸</b>에 붙여요. 요일은 자동으로 맞춰줘요!</div>
      </div>
    );
  };

  return (
    <Popup title="📅 날짜 선택" onClose={onClose}>
      <div ref={bodyRef}>
        <div className="dp-modes">
          <button className={`dp-mode-btn${mode === 'calendar' ? ' active' : ''}`} onClick={() => setMode('calendar')}>📅 달력</button>
          <button className={`dp-mode-btn${mode === 'sticker' ? ' active' : ''}`} onClick={() => setMode('sticker')}>🧩 붙이기</button>
        </div>
        <div id="dp-body">{mode === 'calendar' ? calendar() : sticker()}</div>
        <PopupActions>
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" disabled={!pick} onClick={confirm}>✅ 입력</button>
        </PopupActions>
      </div>
    </Popup>
  );
}
