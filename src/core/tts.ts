import { usePrefs } from './prefs';

// 음성 안내 (Web Speech API) — 기존 speak 그대로.

interface SpeakOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
}

let voices: SpeechSynthesisVoice[] = [];
let lastText = '';
let lastAt = 0;

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

if (supported()) {
  try {
    voices = window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
    };
  } catch {
    /* 일부 브라우저는 목록을 늦게 준다 — speak 에서 다시 읽는다 */
  }
}

function koreanVoice(): SpeechSynthesisVoice | undefined {
  if (!voices.length) voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'ko-KR')
    ?? voices.find((v) => v.lang?.startsWith('ko'))
    ?? voices.find((v) => /Korean|한국/i.test(v.name));
}

export function speak(raw: string, opts: SpeakOptions = {}): void {
  const text = String(raw ?? '').trim();
  if (usePrefs.getState().muted || !text || !supported()) return;
  const now = Date.now();
  if (text === lastText && now - lastAt < 350) return; // 같은 안내가 연달아 들어오면 한 번만
  lastText = text;
  lastAt = now;

  const doSpeak = (tryCount: number) => {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = opts.rate ?? 0.95;
      u.pitch = opts.pitch ?? 1.05;
      u.volume = opts.volume ?? 1;
      const ko = koreanVoice();
      if (ko) u.voice = ko;
      u.onerror = (e) => {
        // 새 안내를 읽으려고 이전 발화를 멈출 때 생기는 정상 이벤트 — 한 번만 다시 시도
        const stopped = e.error === 'canceled' || e.error === 'interrupted';
        if (stopped && tryCount < 1) setTimeout(() => doSpeak(tryCount + 1), 180);
        else if (!stopped) console.warn('[TTS] error', e.error);
      };
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('[TTS] speak failed', e);
    }
  };

  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) window.speechSynthesis.cancel();
  } catch {
    /* 무시 */
  }
  // Chrome 이 cancel 직후의 speak 를 무시하는 문제 회피: 약간 늦춘다
  setTimeout(() => doSpeak(0), 180);
}
