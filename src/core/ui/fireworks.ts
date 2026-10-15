import { usePrefs } from '@/core/prefs';
import { ensureAudio } from '@/core/sound';

// 축하 효과: 딩동댕동 소리와 화면 폭죽. 아침 준비를 다 마쳤을 때 · 생활표현을 모두 말했을 때 쓴다.

/** 딩동댕동 (소리 끄기면 울리지 않는다) */
export function chime() {
  if (usePrefs.getState().muted) return;
  const ctx = ensureAudio();
  if (!ctx) return;
  [{ f: 659.25, t: 0 }, { f: 783.99, t: 0.25 }, { f: 987.77, t: 0.5 }, { f: 1318.51, t: 0.75 }].forEach((n) => {   // E5·G5·B5·E6
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = n.f;
    g.gain.setValueAtTime(0, ctx.currentTime + n.t);
    g.gain.linearRampToValueAtTime(0.32, ctx.currentTime + n.t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.t + 0.5);
    o.connect(g); g.connect(ctx.destination);
    o.start(ctx.currentTime + n.t); o.stop(ctx.currentTime + n.t + 0.55);
  });
}

export function fireworks() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // 움직임 줄이기 설정이면 생략
  const colors = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#af52de', '#ff2d92'];
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:99999;overflow:hidden';
  document.body.appendChild(box);
  const launch = (x: number, y: number) => {
    for (let i = 0; i < 60; i += 1) {
      const p = document.createElement('div');
      const angle = Math.random() * Math.PI * 2; const dist = 120 + Math.random() * 220;
      const dx = Math.cos(angle) * dist; const dy = Math.sin(angle) * dist; const size = 6 + Math.random() * 8;
      p.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${colors[i % colors.length]};border-radius:${Math.random() < 0.5 ? '50%' : '2px'};transform:translate(-50%,-50%);transition:transform 1.4s cubic-bezier(.2,.7,.3,1),opacity 1.4s ease-out`;
      box.appendChild(p);
      requestAnimationFrame(() => { p.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 200}px)) rotate(${Math.random() * 720}deg)`; p.style.opacity = '0'; });
    }
  };
  const W = window.innerWidth; const H = window.innerHeight;
  launch(W * 0.25, H * 0.4);
  setTimeout(() => launch(W * 0.75, H * 0.35), 250);
  setTimeout(() => launch(W * 0.5, H * 0.5), 500);
  setTimeout(() => box.remove(), 2200);
}
