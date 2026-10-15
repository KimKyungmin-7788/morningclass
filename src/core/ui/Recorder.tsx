import { useEffect, useRef, useState } from 'react';
import { ensureAudio, playSound } from '@/core/sound';

// 말하기 연습 녹음: 녹음해서 그 자리에서 다시 들어 보기만 한다 (저장하지 않고 어디로도 보내지 않는다).
// 한 번에 하나만 녹음한다 — 다른 녹음을 시작하면 하던 녹음은 멈춘다.

export type RecState = 'idle' | 'on' | 'denied' | 'unsupported';

let stopActive: (() => void) | null = null;

export function useRecorder(maxMs: number) {
  const [state, setState] = useState<RecState>('idle');
  const [url, setUrl] = useState('');
  const [live, setLive] = useState<MediaStream | null>(null);   // 녹음 중인 마이크 (크기 막대를 그리는 데 쓴다)
  const stopRef = useRef<(() => void) | null>(null);
  const urlRef = useRef('');
  useEffect(() => () => { stopRef.current?.(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);   // 창을 닫으면 마이크를 끄고 녹음도 버린다

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setState('unsupported'); return; }
    stopActive?.();
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setState('denied'); return; }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      setUrl(urlRef.current);
      setLive(null);
      setState('idle');
    };
    const timer = setTimeout(() => stopRef.current?.(), maxMs);   // 너무 길어지지 않게 스스로 멈춘다
    const stop = () => {
      clearTimeout(timer); stopRef.current = null;
      if (stopActive === stop) stopActive = null;
      if (recorder.state !== 'inactive') recorder.stop();
    };
    stopRef.current = stop;
    stopActive = stop;
    recorder.start();
    setLive(stream);
    setState('on');
    playSound('check');
  };

  return {
    state, url, live,
    toggle: () => { if (state === 'on') stopRef.current?.(); else void start(); },
    play: () => { if (url) void new Audio(url).play(); },
  };
}

/** 녹음 중 표시: 목소리 크기에 따라 움직이는 막대와 남은 시간 (소리는 크기만 재고 어디에도 보내지 않는다) */
export function RecMeter({ stream, maxMs, bars: count = 20 }: { stream: MediaStream; maxMs: number; bars?: number }) {
  const bars = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(maxMs / 1000);
  useEffect(() => {
    const began = Date.now();
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((maxMs - (Date.now() - began)) / 1000))), 200);
    const audio = ensureAudio();
    if (!audio) return () => clearInterval(tick);
    const source = audio.createMediaStreamSource(stream);
    const analyser = audio.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);                                       // 스피커로는 잇지 않는다 (울림 방지)
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    const draw = () => {
      analyser.getByteFrequencyData(data);
      const els = bars.current?.children;
      if (els) for (let i = 0; i < els.length; i += 1) (els[i] as HTMLElement).style.height = `${Math.max(8, Math.min(100, (data[i + 1] / 255) * 130))}%`;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { clearInterval(tick); cancelAnimationFrame(raf); source.disconnect(); };
  }, [stream, maxMs]);
  return (
    <div className="wd-rec" role="status" aria-label={`녹음 중, ${left}초 남음`}>
      <div className="wd-rec-top"><span className="dot" />녹음 중<b>{left}초</b></div>
      <div className="wd-meter" ref={bars} aria-hidden="true">{Array.from({ length: count }, (_, i) => <i key={i} />)}</div>
      <div className="wd-rec-bar"><i style={{ animationDuration: `${maxMs}ms` }} /></div>
    </div>
  );
}
