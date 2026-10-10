import { usePrefs } from './prefs';

// 효과음: 음원 파일 없이 Web Audio 로 짧은 음을 만든다 (기존 playSound 그대로).

type Wave = OscillatorType;
interface Note {
  f: number; // 주파수(Hz)
  t: number; // 시작(초)
  d: number; // 길이(초)
  w?: Wave;
}

const SOUNDS = {
  select: [{ f: 450, t: 0, d: 0.15 }],
  emotion: [{ f: 523, t: 0, d: 0.15 }, { f: 659, t: 0.15, d: 0.15 }],
  check: [{ f: 600, t: 0, d: 0.1 }],
  correct: [{ f: 659, t: 0, d: 0.1 }, { f: 784, t: 0.1, d: 0.15 }],
  wrong: [{ f: 220, t: 0, d: 0.15 }],
  save: [{ f: 523, t: 0, d: 0.12 }, { f: 659, t: 0.12, d: 0.12 }, { f: 784, t: 0.24, d: 0.18 }],
  complete: [
    { f: 523, t: 0, d: 0.12 }, { f: 659, t: 0.13, d: 0.12 },
    { f: 784, t: 0.26, d: 0.12 }, { f: 1047, t: 0.39, d: 0.3 },
  ],
  drum: [{ f: 140, t: 0, d: 0.07, w: 'triangle' }, { f: 110, t: 0.035, d: 0.06, w: 'triangle' }],
  sparkle: [{ f: 1319, t: 0, d: 0.08 }, { f: 1760, t: 0.07, d: 0.08 }, { f: 2093, t: 0.14, d: 0.14 }],
  fanfare: [
    { f: 523, t: 0, d: 0.12, w: 'triangle' }, { f: 523, t: 0.14, d: 0.1, w: 'triangle' },
    { f: 523, t: 0.26, d: 0.1, w: 'triangle' }, { f: 698, t: 0.38, d: 0.35, w: 'triangle' },
    { f: 880, t: 0.72, d: 0.18, w: 'triangle' }, { f: 1047, t: 0.9, d: 0.5, w: 'triangle' },
  ],
} satisfies Record<string, Note[]>;

export type SoundId = keyof typeof SOUNDS;

let ctx: AudioContext | null = null;

/** 첫 터치 뒤에만 소리가 나므로, 창을 여는 동작에서 미리 불러 준다. */
export function ensureAudio(): AudioContext | null {
  if (!ctx) {
    try {
      const Ctor = window.AudioContext
        || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function playSound(id: SoundId): void {
  if (usePrefs.getState().muted) return;
  const audio = ensureAudio();
  if (!audio) return;
  for (const { f, t, d, w } of SOUNDS[id] as Note[]) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.frequency.value = f;
    osc.type = w ?? 'sine';
    gain.gain.setValueAtTime(0.3, audio.currentTime + t);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + t + d);
    osc.start(audio.currentTime + t);
    osc.stop(audio.currentTime + t + d + 0.05);
  }
}
