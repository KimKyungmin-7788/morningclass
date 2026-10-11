import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { useCurrentClass, useData } from '@/core/data/store';
import type { FeatureManifest } from '../types';
import { fmtMS, fmtTenths, swElapsed, timerLeft, timerShown, useTools } from './store';
import { BoardWindow } from '@/features/board/BoardWindow';
import { NoiseMeter } from './NoiseMeter';

// 수업 도구 카드: 시계 · 타이머 · 스톱워치 · 소음 측정기 · 판서 중 학급에서 고른 것만 보여 준다.

type ToolId = 'clock' | 'timer' | 'stopwatch' | 'noise';
type CardTool = ToolId | 'board';
const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'clock', label: '시계', icon: 'ph-clock' },
  { id: 'timer', label: '타이머', icon: 'ph-timer' },
  { id: 'stopwatch', label: '스톱워치', icon: 'ph-hourglass-medium' },
  { id: 'noise', label: '소음', icon: 'ph-ear' },
];
/** 카드에 놓을 수 있는 도구 전체. 카드에는 아이콘으로 한 줄에 놓는다 */
const CARD_TOOLS: { id: CardTool; label: string; icon: string }[] = [...TOOLS, { id: 'board', label: '판서', icon: 'ph-pencil-line' }];
/** 카드 한 줄에 놓는 도구 수 — 이보다 많이 고를 수 없다 (도구가 더 늘어도 카드가 넘치지 않게) */
const MAX_ON_CARD = 4;
/** 타이머가 이만큼 남으면 깜빡이기 시작한다 */
const HURRY_SEC = 10;
const DAY = ['일', '월', '화', '수', '목', '금', '토'];

/** 화면을 주기적으로 다시 그리게 하는 현재 시각 */
function useNow(ms: number): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function ToolsCard() {
  const cls = useCurrentClass();
  const saveClass = useData((s) => s.saveClass);
  // 도구는 5가지지만 카드에는 4개만 놓는다 — 처음에는 소음 측정기를 뺀 4개가 놓여 있다
  const on = { clock: true, timer: true, stopwatch: true, noise: false, board: true, ...cls?.options.tools };
  const [board, setBoard] = useState(false);
  const list = TOOLS.filter((t) => on[t.id]);
  const [open, setOpen] = useState<ToolId | null>(null);
  const [picking, setPicking] = useState(false);
  const now = useNow(200);                                         // 카드의 시간 표시와 타이머 끝 알림을 위해 주기적으로 다시 그린다
  const timer = useTools((s) => s.timer);
  const sw = useTools((s) => s.sw);
  const finishIfDue = useTools((s) => s.finishIfDue);

  // 타이머가 끝나면 효과음으로 알린다 (도구 창이 닫혀 있어도). 말로 읽어 주지는 않는다
  useEffect(() => {
    if (finishIfDue()) { playSound('timeup'); toast('⏰ 시간이 다 됐어요!', 'success'); }
  }, [now, finishIfDue]);
  /** 마지막 10초 — 화면 전체가 깜빡여서 곧 끝난다는 것을 알린다 */
  const hurry = !!timer.endAt && timerLeft(timer) <= HURRY_SEC;

  const cardList = CARD_TOOLS.filter((t) => on[t.id]).slice(0, MAX_ON_CARD);
  const picked = CARD_TOOLS.filter((t) => on[t.id]).length;
  // 카드에는 아이콘만 둔다. 가는 중인 타이머·스톱워치만 아이콘 아래에 시간을 보여 준다 (그리는 순간의 시각으로 계산 — 시작하는 순간 숫자가 튀지 않게)
  const live: Partial<Record<CardTool, string>> = {
    ...(timer.endAt ? { timer: fmtMS(timerShown(timer)) } : {}),
    ...(sw.startAt ? { stopwatch: fmtMS(swElapsed(sw)) } : {}),
  };
  const setOn = (id: CardTool, value: boolean) => { if (cls) void saveClass({ ...cls, options: { ...cls.options, tools: { ...on, [id]: value } } }); };

  return (
    <>
      {/* 아이콘 한 줄만 있으면 되므로 내용만큼만 높이를 쓴다 — 남는 높이는 급식·유의사항 카드가 쓴다 */}
      <CardFrame id="tools" label="수업 도구" state="plain" style={{ flex: '0 0 auto' }}>
        <CardTitle icon="ph-fill ph-wrench" tint="#e5e7eb" color="#374151"
          extra={<span className="tl-side"><button title={`쓸 도구 고르기 (${MAX_ON_CARD}개까지)`} aria-label="쓸 도구 고르기" onClick={() => { ensureAudio(); setPicking(true); }}><i className="ph-bold ph-sliders-horizontal" /></button></span>}>
          수업 도구
        </CardTitle>
        {cardList.length ? (
          <div className="tl-icons">
            {cardList.map((t) => (
              <button key={t.id} className={`tl-ico${live[t.id] ? ' run' : ''}`} title={t.label} aria-label={`${t.label} 열기`}
                onClick={() => { ensureAudio(); playSound('select'); if (t.id === 'board') setBoard(true); else setOpen(t.id); }}>
                <i className={`ph-fill ${t.icon}`} />{live[t.id] && <span>{live[t.id]}</span>}
              </button>
            ))}
          </div>
        ) : <div className="card-hint" style={{ fontSize: 15 }}>오른쪽 위 버튼으로 쓸 도구를 {MAX_ON_CARD}개까지 골라요</div>}
      </CardFrame>
      {board && <BoardWindow onClose={() => setBoard(false)} />}
      {hurry && createPortal(<div className="tl-hurry" aria-hidden="true" />, document.body)}

      {picking && cls && (
        <Popup title={`🧰 쓸 도구 고르기 (${MAX_ON_CARD}개까지)`} onClose={() => setPicking(false)}>
          <div className="hint" style={{ marginBottom: 12 }}>
            도구 {CARD_TOOLS.length}가지 중 <b>{MAX_ON_CARD}개</b>를 골라 우리 반 화면에 놓아요. <b>지금 {Math.min(picked, MAX_ON_CARD)} / {MAX_ON_CARD}개</b>
            {picked >= MAX_ON_CARD && <><br />{MAX_ON_CARD}개가 다 찼어요. 다른 도구를 넣으려면 먼저 하나를 빼 주세요.</>}
          </div>
          <div className="ws-opts">
            {CARD_TOOLS.map((t) => (
              <label key={t.id} className="ws-opt" style={!on[t.id] && picked >= MAX_ON_CARD ? { opacity: 0.5 } : undefined}>
                <input type="checkbox" checked={on[t.id]} disabled={!on[t.id] && picked >= MAX_ON_CARD}
                  onChange={(e) => { setOn(t.id, e.target.checked); playSound('select'); }} />
                {' '}<i className={`ph-fill ${t.icon}`} /> {t.label}
              </label>
            ))}
          </div>
          <PopupActions><button className="btn-save" onClick={() => setPicking(false)}>✅ 완료</button></PopupActions>
        </Popup>
      )}

      {open && list.length > 0 && <ToolWindow list={list} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ToolWindow({ list, start, onClose }: { list: typeof TOOLS; start: ToolId; onClose: () => void }) {
  const [cur, setCur] = useState<ToolId>(list.some((t) => t.id === start) ? start : list[0].id);
  const { timer, sw, preset, adjust, toggleTimer, resetTimer, toggleSw, resetSw } = useTools();
  // 스톱워치가 가는 동안에는 0.1초 자리가 빠짐없이 바뀌도록 촘촘하게 다시 그린다
  useNow(cur === 'stopwatch' && sw.startAt ? 33 : cur === 'timer' && timer.endAt ? 100 : 200);
  const d = new Date();
  const h = d.getHours();
  const left = timerLeft(timer);
  const elapsed = fmtTenths(swElapsed(sw));
  const nums = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const a = ((i + 1) * Math.PI) / 6;
    return <text key={i} x={(100 + 72 * Math.sin(a)).toFixed(1)} y={(100 - 72 * Math.cos(a) + 7).toFixed(1)}>{i + 1}</text>;
  }), []);
  const hand = (deg: number) => `rotate(${deg} 100 100)`;
  const tap = (fn: () => void, sound: 'select' | 'check' = 'select') => () => { fn(); playSound(sound); };

  return (
    <Popup title="⏱️ 수업 도구" large onClose={onClose}>
      <div className="tp">
        {list.length > 1 && (
          <div className="mv-toggle tp-tabs" role="tablist">
            {list.map((t) => (
              <button key={t.id} role="tab" aria-selected={t.id === cur} className={t.id === cur ? 'on' : ''} onClick={tap(() => setCur(t.id))}>
                <i className={`ph-fill ${t.icon}`} /> {t.label}
              </button>
            ))}
          </div>
        )}
        <div className={`tp-stage ${cur}`}>
          {cur === 'clock' && (
            <>
              <svg className="tp-analog" viewBox="0 0 200 200" aria-hidden="true">
                <circle cx="100" cy="100" r="94" fill="#fff" stroke="#5BB6FF" strokeWidth="6" />{nums}
                <line x1="100" y1="108" x2="100" y2="54" stroke="#1f2937" strokeWidth="7" strokeLinecap="round" transform={hand((h % 12) * 30 + d.getMinutes() * 0.5)} />
                <line x1="100" y1="110" x2="100" y2="32" stroke="#1f2937" strokeWidth="4.5" strokeLinecap="round" transform={hand(d.getMinutes() * 6 + d.getSeconds() * 0.1)} />
                <line x1="100" y1="114" x2="100" y2="26" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" transform={hand(d.getSeconds() * 6)} />
                <circle cx="100" cy="100" r="5" fill="#ef4444" />
              </svg>
              <div className="tp-side">
                <div className="tp-date">{d.getMonth() + 1}월 {d.getDate()}일 {DAY[d.getDay()]}요일</div>
                <div className="tp-big"><b>{h < 12 ? '오전' : '오후'} {h % 12 || 12}:{String(d.getMinutes()).padStart(2, '0')}</b><small>{String(d.getSeconds()).padStart(2, '0')}</small></div>
              </div>
            </>
          )}
          {cur === 'timer' && (
            <>
              <div className={`tp-pie${timer.done ? ' done' : ''}${timer.endAt && left <= HURRY_SEC ? ' hurry' : ''}`} style={{ '--p': `${(timer.total ? Math.min(100, (left / timer.total) * 100) : 0).toFixed(2)}%` } as CSSProperties}>
                <div className="tp-pie-in"><b>{fmtMS(timerShown(timer))}</b>{timer.done && <span>끝!</span>}</div>
              </div>
              <div className="tp-side">
                <div className="tp-presets">
                  {[1, 3, 5, 10, 15, 30].map((m) => (
                    <button key={m} className={!timer.endAt && timer.total === m * 60 && timer.left === timer.total ? 'on' : ''} onClick={tap(() => preset(m))}>{m}분</button>
                  ))}
                </div>
                <div className="tp-presets"><button onClick={tap(() => adjust(-60))}>− 1분</button><button onClick={tap(() => adjust(60))}>+ 1분</button></div>
                <div className="tp-ctl">
                  <button className={`tp-go${timer.endAt ? ' stop' : ''}`} onClick={tap(toggleTimer, 'check')}>{timer.endAt ? '⏸ 멈춤' : '▶ 시작'}</button>
                  <button onClick={tap(resetTimer)}>↺ 처음으로</button>
                </div>
              </div>
            </>
          )}
          {cur === 'noise' && <NoiseMeter />}
          {cur === 'stopwatch' && (
            <>
              <div className="tp-big sw"><b>{elapsed.ms}.{elapsed.tenth}</b></div>
              <div className="tp-side">
                <div className="tp-ctl">
                  <button className={`tp-go${sw.startAt ? ' stop' : ''}`} onClick={tap(toggleSw, 'check')}>{sw.startAt ? '⏸ 멈춤' : '▶ 시작'}</button>
                  <button onClick={tap(resetSw)}>↺ 처음으로</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Popup>
  );
}

const manifest: FeatureManifest = { id: 'tools', cards: [{ id: 'tools', col: 3, order: 3, Component: ToolsCard }] };
export default manifest;
