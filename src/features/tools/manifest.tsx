import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useCurrentClass, useData } from '@/core/data/store';
import type { FeatureManifest } from '../types';
import { fmtMS, swElapsed, timerLeft, useTools } from './store';

// 수업 도구 카드: 시계 · 타이머 · 스톱워치 중 학급에서 고른 것만 보여 준다.

type ToolId = 'clock' | 'timer' | 'stopwatch';
const TOOLS: { id: ToolId; label: string; icon: string }[] = [
  { id: 'clock', label: '시계', icon: 'ph-clock' },
  { id: 'timer', label: '타이머', icon: 'ph-timer' },
  { id: 'stopwatch', label: '스톱워치', icon: 'ph-hourglass-medium' },
];
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
  const on = { clock: true, timer: true, stopwatch: true, ...cls?.options.tools };
  const list = TOOLS.filter((t) => on[t.id]);
  const [open, setOpen] = useState<ToolId | null>(null);
  const [picking, setPicking] = useState(false);
  const now = useNow(200);
  const timer = useTools((s) => s.timer);
  const sw = useTools((s) => s.sw);
  const finishIfDue = useTools((s) => s.finishIfDue);

  // 타이머가 끝나면 알린다 (도구 창이 닫혀 있어도)
  useEffect(() => {
    if (finishIfDue()) { playSound('complete'); toast('⏰ 시간이 다 됐어요!', 'success'); speak('시간이 다 됐어요.'); }
  }, [now, finishIfDue]);

  const d = new Date(now);
  const value: Record<ToolId, string> = {
    clock: `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`,
    timer: fmtMS(Math.ceil(timerLeft(timer, now) - 0.001)),
    stopwatch: fmtMS(swElapsed(sw, now)),
  };
  const running: Record<ToolId, boolean> = { clock: false, timer: !!timer.endAt, stopwatch: !!sw.startAt };

  return (
    <>
      <CardFrame id="tools" label="수업 도구" state="plain" style={{ flex: 1.1, minHeight: 160 }}>
        <CardTitle icon="ph-fill ph-timer" tint="#e0f2fe" color="#0284c7"
          extra={<span className="tl-side"><button title="쓸 도구 고르기" aria-label="쓸 도구 고르기" onClick={() => { ensureAudio(); setPicking(true); }}><i className="ph-bold ph-sliders-horizontal" /></button></span>}>
          수업 도구
        </CardTitle>
        {list.length ? (
          <div className="tl-row">
            {list.map((t) => (
              <button key={t.id} className={`tl-btn${running[t.id] ? ' run' : ''}`} aria-label={`${t.label} 열기`}
                onClick={() => { ensureAudio(); playSound('select'); setOpen(t.id); }}>
                <i className={`ph-fill ${t.icon}`} /><b>{value[t.id]}</b><span>{t.label}</span>
              </button>
            ))}
          </div>
        ) : <div className="card-hint" style={{ fontSize: 15 }}>오른쪽 위 버튼으로 쓸 도구를 골라요</div>}
      </CardFrame>

      {picking && cls && (
        <Popup title="🧰 쓸 도구 고르기" onClose={() => setPicking(false)}>
          <div className="hint" style={{ marginBottom: 12 }}>우리 반 화면에 보일 도구만 골라요.</div>
          <div className="ws-opts">
            {TOOLS.map((t) => (
              <label key={t.id} className="ws-opt">
                <input type="checkbox" checked={on[t.id]}
                  onChange={(e) => { void saveClass({ ...cls, options: { ...cls.options, tools: { ...on, [t.id]: e.target.checked } } }); playSound('select'); }} />
                {' '}<i className={`ph-fill ${t.icon}`} /> {t.label}
              </label>
            ))}
          </div>
          <PopupActions><button className="btn-save" onClick={() => setPicking(false)}>✅ 완료</button></PopupActions>
        </Popup>
      )}

      {open && list.length > 0 && <ToolWindow list={list} start={open} now={now} onClose={() => setOpen(null)} />}
    </>
  );
}

function ToolWindow({ list, start, now, onClose }: { list: typeof TOOLS; start: ToolId; now: number; onClose: () => void }) {
  const [cur, setCur] = useState<ToolId>(list.some((t) => t.id === start) ? start : list[0].id);
  const { timer, sw, preset, adjust, toggleTimer, resetTimer, toggleSw, resetSw } = useTools();
  const d = new Date(now);
  const h = d.getHours();
  const left = timerLeft(timer, now);
  const elapsed = swElapsed(sw, now);
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
              <div className={`tp-pie${timer.done ? ' done' : ''}`} style={{ '--p': `${(timer.total ? Math.min(100, (left / timer.total) * 100) : 0).toFixed(2)}%` } as CSSProperties}>
                <div className="tp-pie-in"><b>{fmtMS(Math.ceil(left - 0.001))}</b>{timer.done && <span>끝!</span>}</div>
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
          {cur === 'stopwatch' && (
            <>
              <div className="tp-big sw"><b>{fmtMS(elapsed)}.{Math.floor(elapsed * 10) % 10}</b></div>
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
