import { useEffect, useRef, useState } from 'react';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { WORD_LEVELS, bestHit, parseDictExamples, parseDictSearch, weekKey, weekdayIndex, wordOfDay, type WordBook, type WordEntry } from './model';

// 오늘의 낱말 창: 낱말 · 뜻 · 문장을 크게 보여 주고, 읽기 · 쓰기 · 말하기 세 가지 활동을 한다.
// 제목 줄의 "낱말 정하기"에서 단계, 이번 주 요일별 낱말, 추가한 낱말을 고친다.

type Tab = 'read' | 'write' | 'speak';
/** 세 가지 활동 — 색과 아이콘으로 구분한다 (읽기 파랑 · 쓰기 주황 · 말하기 분홍) */
const TABS: { id: Tab; label: string; desc: string; icon: string }[] = [
  { id: 'read', label: '읽기', desc: '글자를 짚으며 읽어요', icon: 'ph-fill ph-book-open-text' },
  { id: 'write', label: '쓰기', desc: '손으로 따라 써요', icon: 'ph-fill ph-pencil-simple' },
  { id: 'speak', label: '말하기', desc: '말하고 녹음해 들어요', icon: 'ph-fill ph-microphone' },
];
/** 녹음은 이 시간(ms)에서 스스로 멈춘다 */
const REC_MAX = 15000;
/** 또박또박 천천히 읽어 준다 */
const say = (text: string) => speak(text, { rate: 0.8 });

// ── 쓰기: 흐린 글씨 위에 손가락으로 따라 쓴다 ──
function TraceBoard({ text }: { text: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef(new Map<number, { x: number; y: number }>());
  const clear = () => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
    cv.getContext('2d')!.scale(dpr, dpr);
  };
  useEffect(clear, [text]);
  const at = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  return (
    <div className="wd-trace">
      <div className={`wd-ghost${text.length > 5 ? ' long' : ''}`} aria-hidden="true">{text}</div>
      <canvas ref={ref} aria-label={`${text} 따라 쓰기`}
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 쓸 수 있다 */ } last.current.set(e.pointerId, at(e)); }}
        onPointerMove={(e) => {
          const from = last.current.get(e.pointerId);
          if (!from) return;
          const to = at(e);
          const ctx = e.currentTarget.getContext('2d')!;
          ctx.strokeStyle = '#1B3A57'; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
          last.current.set(e.pointerId, to);
        }}
        onPointerUp={(e) => last.current.delete(e.pointerId)} onPointerCancel={(e) => last.current.delete(e.pointerId)} />
      <button className="wd-clear" onClick={() => { clear(); playSound('select'); }}>↺ 다시 쓰기</button>
    </div>
  );
}

// ── 읽기: 낱말을 글자 하나씩 짚어 읽고, 문장 속에서 낱말을 찾아본다 ──
function ReadPractice({ entry }: { entry: WordEntry }) {
  const [at, setAt] = useState(-1);
  const letters = [...entry.word.replace(/\s/g, '')];
  const cut = entry.sentence.indexOf(entry.word);
  useEffect(() => setAt(-1), [entry.word]);
  return (
    <div className="wd-read">
      <p>글자를 하나씩 눌러 짚으며 읽어요</p>
      <div className={`wd-syls${letters.length > 4 ? ' long' : ''}`}>
        {letters.map((ch, i) => <button key={i} className={i === at ? 'on' : ''} aria-label={`${ch} 듣기`} onClick={() => { setAt(i); say(ch); }}>{ch}</button>)}
      </div>
      {entry.sentence && (
        <div className="wd-read-sent">
          {cut < 0 ? entry.sentence : <>{entry.sentence.slice(0, cut)}<mark>{entry.word}</mark>{entry.sentence.slice(cut + entry.word.length)}</>}
        </div>
      )}
      <button className="all" onClick={() => { setAt(-1); say(`${entry.word}. ${entry.meaning}. ${entry.sentence}`); }}><i className="ph-fill ph-play" /> 모두 이어서 듣기</button>
      <div className="wd-note">왼쪽의 낱말 · 뜻 · 문장을 누르면 하나씩 읽어 줘요.</div>
    </div>
  );
}

/** 녹음 중 표시: 목소리 크기에 따라 움직이는 막대와 남은 시간 (소리는 크기만 재고 어디에도 보내지 않는다) */
function RecMeter({ stream }: { stream: MediaStream }) {
  const bars = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(REC_MAX / 1000);
  useEffect(() => {
    const began = Date.now();
    const tick = setInterval(() => setLeft(Math.max(0, Math.ceil((REC_MAX - (Date.now() - began)) / 1000))), 200);
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
  }, [stream]);
  return (
    <div className="wd-rec" role="status" aria-label={`녹음 중, ${left}초 남음`}>
      <div className="wd-rec-top"><span className="dot" />녹음 중<b>{left}초</b></div>
      <div className="wd-meter" ref={bars} aria-hidden="true">{Array.from({ length: 20 }, (_, i) => <i key={i} />)}</div>
      <div className="wd-rec-bar"><i style={{ animationDuration: `${REC_MAX}ms` }} /></div>
    </div>
  );
}

// ── 말하기: 듣고 따라 말하기 + 내 목소리를 녹음해서 들어 보기 (녹음은 이 창에서만 쓰고 저장하지 않는다) ──
function SpeakPractice({ entry }: { entry: WordEntry }) {
  const [rec, setRec] = useState<'idle' | 'on' | 'denied' | 'unsupported'>('idle');
  const [url, setUrl] = useState('');
  const [live, setLive] = useState<MediaStream | null>(null);   // 녹음 중인 마이크 (크기 막대를 그리는 데 쓴다)
  const stopRef = useRef<(() => void) | null>(null);
  const urlRef = useRef('');
  useEffect(() => () => { stopRef.current?.(); if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);   // 창을 닫으면 마이크를 끄고 녹음도 버린다

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setRec('unsupported'); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { setRec('denied'); return; }
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      setUrl(urlRef.current);
      setLive(null);
      setRec('idle');
    };
    const timer = setTimeout(() => stopRef.current?.(), REC_MAX);   // 너무 길어지지 않게 15초에서 멈춘다
    stopRef.current = () => { clearTimeout(timer); stopRef.current = null; if (recorder.state !== 'inactive') recorder.stop(); };
    recorder.start();
    setLive(stream);
    setRec('on');
    playSound('check');
  };

  return (
    <div className="wd-speak">
      <div className="wd-step">
        <span>1</span><b>듣고 따라 말해요</b>
        <div><button onClick={() => say(entry.word)}>🔊 낱말</button><button onClick={() => say(entry.sentence)}>🔊 문장</button></div>
      </div>
      <div className="wd-step">
        <span>2</span><b>내 목소리를 녹음해요</b>
        {rec === 'on' && live && <RecMeter stream={live} />}
        <div>
          <button className={rec === 'on' ? 'rec' : ''} onClick={() => { if (rec === 'on') stopRef.current?.(); else void start(); }}>{rec === 'on' ? '⏹ 그만하기' : url ? '🎤 다시 녹음' : '🎤 녹음 시작'}</button>
          <button disabled={!url || rec === 'on'} onClick={() => { void new Audio(url).play(); }}>▶ 내 목소리 듣기</button>
        </div>
      </div>
      <div className="wd-note">
        {rec === 'denied' ? '마이크를 쓸 수 없어요. 주소창의 🔒 에서 마이크를 허용해 주세요.'
          : rec === 'unsupported' ? '이 기기에서는 녹음할 수 없어요. 듣고 따라 말하기만 해요.'
          : '녹음은 여기서 들어 보기만 하고 저장하지 않아요.'}
      </div>
    </div>
  );
}

// ── 낱말 정하기 (선생님) ──
const blank = (): WordEntry => ({ word: '', meaning: '', sentence: '' });
const DAYS = ['월', '화', '수', '목', '금'];

function WordRow({ label, value, onChange, onRemove }: { label: string; value: WordEntry; onChange: (v: WordEntry) => void; onRemove?: () => void }) {
  const [busy, setBusy] = useState(false);
  /** 한국어기초사전에서 뜻과 예문을 찾아 채운다 (검색하는 낱말만 보낸다) */
  const fill = async () => {
    const word = value.word.trim();
    if (!word) { toast('낱말을 먼저 적어 주세요', 'error'); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/dict?q=${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error(String(res.status));
      const hit = bestHit(parseDictSearch(await res.text()), word);
      if (!hit) { toast(`사전에서 "${word}"을(를) 찾지 못했어요. 직접 적어 주세요`, 'error'); return; }
      let sentence = value.sentence;
      if (!sentence.trim() && hit.code) {
        const view = await fetch(`/api/dict?code=${hit.code}`);
        if (view.ok) sentence = parseDictExamples(await view.text())[0] ?? '';
      }
      onChange({ word, meaning: hit.definition, sentence });
      toast(`사전에서 가져왔어요${hit.grade ? ` (${hit.grade})` : ''}. 쉬운 말로 고쳐도 좋아요`, 'success');
    } catch {
      toast('사전을 불러오지 못했어요. 뜻과 문장을 직접 적어 주세요', 'error');
    } finally {
      setBusy(false);
    }
  };
  const set = (k: keyof WordEntry) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="wd-row">
      <span className="day">{label}</span>
      <input className="w" placeholder="낱말" maxLength={20} value={value.word} onChange={set('word')} />
      <input placeholder="뜻" maxLength={80} value={value.meaning} onChange={set('meaning')} />
      <input placeholder="낱말이 들어간 문장" maxLength={80} value={value.sentence} onChange={set('sentence')} />
      <button title="사전에서 뜻과 문장 가져오기" disabled={busy} onClick={() => void fill()}>{busy ? '…' : '📖 사전'}</button>
      {onRemove && <button className="del" title="지우기" aria-label="낱말 지우기" onClick={onRemove}>✕</button>}
    </div>
  );
}

function WordSetup({ book, date, onSave, onBack }: { book: WordBook; date: Date; onSave: (b: WordBook) => void; onBack: () => void }) {
  const keys = [weekKey(date), weekKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7))];   // 이번 주 · 다음 주
  const [at, setAt] = useState(weekdayIndex(date) < 0 ? 1 : 0);   // 주말에 열면 다음 주부터 보여 준다 (미리 정해 두는 때이므로)
  const [level, setLevel] = useState(book.level);
  const [weeks, setWeeks] = useState<Record<string, WordEntry[]>>(() => Object.fromEntries(keys.map((k) => [k, DAYS.map((_, i) => book.weeks[k]?.[i] ?? blank())])));
  const [custom, setCustom] = useState<WordEntry[]>(() => book.custom.map((w) => ({ ...w })));
  const key = keys[at];
  const week = weeks[key];
  const clean = (w: WordEntry): WordEntry => ({ word: w.word.trim(), meaning: w.meaning.trim(), sentence: w.sentence.trim() });
  const save = () => {
    const next = { ...book.weeks };
    for (const k of keys) {
      const filled = weeks[k].map((w) => (w.word.trim() ? clean(w) : null));
      if (filled.some(Boolean)) next[k] = filled; else delete next[k];
    }
    onSave({ level, weeks: next, custom: custom.filter((w) => w.word.trim()).map(clean) });
    playSound('save'); toast('낱말을 저장했어요', 'success');
    onBack();
  };
  return (
    <div className="wd-setup">
      <div className="wd-sec">
        <h3>단계 <small>정해 두지 않은 날에는 이 단계의 기본 낱말이 차례로 나와요</small></h3>
        <div className="mv-toggle">{WORD_LEVELS.map((l) => <button key={l.id} className={l.id === level ? 'on' : ''} aria-pressed={l.id === level} onClick={() => setLevel(l.id)}>{l.label}</button>)}</div>
      </div>
      <div className="wd-sec">
        <h3>주마다 정하는 낱말 <small>비워 둔 요일은 기본 낱말이 나와요</small></h3>
        <div className="mv-toggle">
          {keys.map((k, i) => <button key={k} className={i === at ? 'on' : ''} aria-pressed={i === at} onClick={() => setAt(i)}>{i === 0 ? '이번 주' : '다음 주'} ({Number(k.slice(4, 6))}월 {Number(k.slice(6))}일~)</button>)}
        </div>
        {week.map((w, i) => <WordRow key={`${key}-${i}`} label={DAYS[i]} value={w} onChange={(v) => setWeeks({ ...weeks, [key]: week.map((x, j) => (j === i ? v : x)) })} />)}
      </div>
      <div className="wd-sec">
        <h3>추가한 낱말 <small>기본 목록에 없는 낱말 — 기본 낱말과 함께 차례로 나와요</small></h3>
        {custom.map((w, i) => <WordRow key={i} label="＋" value={w} onChange={(v) => setCustom(custom.map((x, j) => (j === i ? v : x)))} onRemove={() => setCustom(custom.filter((_, j) => j !== i))} />)}
        <button className="wd-add" onClick={() => setCustom([...custom, blank()])}>＋ 낱말 추가</button>
      </div>
      <div className="wd-credit">뜻과 문장 가져오기: 국립국어원 한국어기초사전</div>
      <PopupActions>
        <button className="btn-cancel" onClick={onBack}>취소</button>
        <button className="btn-save" onClick={save}>💾 저장</button>
      </PopupActions>
    </div>
  );
}

export function WordWindow({ book, date, onSave, onClose }: { book: WordBook; date: Date; onSave: (b: WordBook) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('read');
  const [setup, setSetup] = useState(false);
  const [target, setTarget] = useState<'word' | 'sentence'>('word');
  const entry = wordOfDay(book, date);
  const fixed = !!book.weeks[weekKey(date)]?.[weekdayIndex(date)]?.word.trim();

  useEffect(() => { if (entry && !setup) say(`오늘의 낱말은, ${entry.word}`); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entry?.word]);

  if (setup) return <Popup title="✏️ 낱말 정하기" large onClose={onClose}><WordSetup book={book} date={date} onSave={onSave} onBack={() => setSetup(false)} /></Popup>;
  return (
    <Popup title="📗 오늘의 낱말" large onClose={onClose}
      headerExtra={<button className="wd-setup-btn" onClick={() => setSetup(true)}><i className="ph-bold ph-pencil-simple-line" /> 낱말 정하기</button>}>
      {!entry ? <div className="card-hint" style={{ padding: 40 }}>낱말이 없어요. "낱말 정하기"에서 낱말을 넣어 주세요.</div> : (
        <div className="wd">
          <div className="wd-main">
            <div className="wd-tag">{fixed ? '선생님이 정한 낱말' : `${WORD_LEVELS.find((l) => l.id === book.level)?.label} 낱말`}</div>
            <button className={`wd-word${entry.word.length > 4 ? ' long' : ''}`} onClick={() => say(entry.word)} aria-label={`${entry.word} 듣기`}>{entry.word}<i className="ph-fill ph-speaker-high" /></button>
            <button className="wd-line" onClick={() => say(entry.meaning)}><span>뜻</span>{entry.meaning || '뜻을 적어 주세요'}<i className="ph-fill ph-speaker-high" /></button>
            <button className="wd-line" onClick={() => say(entry.sentence)}><span>문장</span>{entry.sentence || '문장을 적어 주세요'}<i className="ph-fill ph-speaker-high" /></button>
          </div>
          <div className="wd-work">
            <div className="wd-modes" role="tablist" aria-label="활동 고르기">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={t.id === tab} className={`wd-mode ${t.id}${t.id === tab ? ' on' : ''}`} onClick={() => { setTab(t.id); playSound('select'); }}>
                  <span className="ico"><i className={t.icon} /></span><b>{t.label}</b><small>{t.desc}</small>
                </button>
              ))}
            </div>
            <div className={`wd-pane ${tab}`} role="tabpanel">
            {tab === 'read' && <ReadPractice entry={entry} />}
            {tab === 'write' && (
              <>
                <div className="mv-toggle wd-target">
                  <button className={target === 'word' ? 'on' : ''} onClick={() => setTarget('word')}>낱말 쓰기</button>
                  <button className={target === 'sentence' ? 'on' : ''} disabled={!entry.sentence} onClick={() => setTarget('sentence')}>문장 쓰기</button>
                </div>
                <TraceBoard text={target === 'sentence' && entry.sentence ? entry.sentence : entry.word} />
              </>
            )}
            {tab === 'speak' && <SpeakPractice entry={entry} />}
            </div>
          </div>
        </div>
      )}
    </Popup>
  );
}
