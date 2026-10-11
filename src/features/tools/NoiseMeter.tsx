import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ensureAudio, playSound } from '@/core/sound';
import { NOISE_TEXT, noiseLevel, noiseState, smoothLevel } from './noise';
import { fmtMS } from './store';

// 소음 측정기: 교실 소리의 크기를 마이크로 재서 보여 준다. 목표는 조용히 하기 —
// 기준보다 조용하게 버틴 시간을 재고, 기준을 넘으면 화면이 "쉿!"으로 바뀌면서 시간이 처음으로 돌아간다.
// 소리는 크기만 재고 녹음하거나 보내지 않으며, 측정을 멈추거나 창을 닫으면 마이크도 끈다.

type Status = 'idle' | 'on' | 'denied' | 'unsupported';
/** 이만큼 이어서 시끄러워야 "조용히 한 시간"을 처음으로 돌린다 (문 닫는 소리 한 번에 끊기지 않게) */
const LOUD_HOLD_MS = 700;
const TICK_MS = 100;

export function NoiseMeter() {
  const [status, setStatus] = useState<Status>('idle');
  const [level, setLevel] = useState(0);
  const [limit, setLimit] = useState(55);
  const [quiet, setQuiet] = useState(0);                          // 조용히 한 시간(초)
  const [best, setBest] = useState(0);
  const stop = useRef<(() => void) | null>(null);
  const limitRef = useRef(limit);
  limitRef.current = limit;

  useEffect(() => () => stop.current?.(), []);                    // 창을 닫거나 다른 도구로 가면 마이크를 끈다

  const start = async () => {
    const audio = ensureAudio();
    if (!audio || !navigator.mediaDevices?.getUserMedia) { setStatus('unsupported'); return; }
    let stream: MediaStream;
    try {
      // 목소리를 다듬는 기능을 끄고 있는 그대로의 크기를 잰다
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch {
      setStatus('denied');
      return;
    }
    const source = audio.createMediaStreamSource(stream);
    const analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);                                      // 스피커로는 잇지 않는다 (재기만 한다)
    const buf = new Float32Array(analyser.fftSize);
    let shown = 0; let quietFrom = Date.now(); let loudFrom = 0; let top = 0; let wasLoud = false;
    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      shown = smoothLevel(shown, noiseLevel(Math.sqrt(sum / buf.length)));
      const now = Date.now();
      const loud = noiseState(shown, limitRef.current) === 'loud';
      if (!loud) { loudFrom = 0; wasLoud = false; }
      else {
        loudFrom ||= now;
        if (now - loudFrom >= LOUD_HOLD_MS) { quietFrom = now; if (!wasLoud) { wasLoud = true; playSound('wrong'); } }   // 넘는 순간 한 번만 알린다
      }
      const sec = (now - quietFrom) / 1000;
      top = Math.max(top, sec);
      setLevel(Math.round(shown)); setQuiet(sec); setBest(top);
    }, TICK_MS);
    stop.current = () => {
      clearInterval(timer);
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      stop.current = null;
    };
    setQuiet(0); setBest(0);
    setStatus('on');
  };
  const end = () => { stop.current?.(); setStatus('idle'); setLevel(0); };

  const on = status === 'on';
  const state = on ? noiseState(level, limit) : 'quiet';
  const info = NOISE_TEXT[state];
  const gauge = { '--p': `${on ? level : 0}%`, '--limit': `${limit}%` } as CSSProperties;
  return (
    <>
      <div className={`tp-noise ${on ? state : 'off'}`} style={gauge}>
        <div className="tp-noise-in">
          <span className="face">{on ? info.face : '🎤'}</span>
          <b>{on ? info.text : '소음 측정기'}</b>
        </div>
      </div>
      <div className="tp-side tp-noise-side">
        {on ? (
          <>
            <div className="tp-quiet"><span>조용히 한 시간</span><b>{fmtMS(quiet)}</b><small>오늘 최고 {fmtMS(best)}</small></div>
            <div className={`tp-meter ${state}`} style={gauge} aria-label={`지금 소리 크기 ${level}`}><i /><em /></div>
          </>
        ) : (
          <div className="tp-noise-msg">
            {status === 'denied' ? <>마이크를 쓸 수 없어요.<br />주소창의 🔒 에서 마이크를 허용해 주세요.</>
              : status === 'unsupported' ? <>이 기기에서는 소음을 잴 수 없어요.</>
              : <>우리 반 소리가 얼마나 큰지 재요.<br />조용히 한 시간이 길수록 좋아요! <small>소리는 크기만 재고 녹음하지 않아요.</small></>}
          </div>
        )}
        <label className="tp-limit">
          <span>기준</span>
          <input type="range" min={25} max={90} step={5} value={limit} onChange={(e) => setLimit(Number(e.target.value))} aria-label="시끄럽다고 보는 기준" />
          <em>{limit <= 40 ? '아주 조용히' : limit <= 60 ? '조용히' : '조금 떠들어도'}</em>
        </label>
        <div className="tp-ctl">
          <button className={`tp-go${on ? ' stop' : ''}`} onClick={() => { playSound('check'); if (on) end(); else void start(); }}>{on ? '⏹ 그만 재기' : '🎤 재기 시작'}</button>
        </div>
      </div>
    </>
  );
}
