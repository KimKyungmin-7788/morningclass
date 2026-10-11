import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useDay } from '@/core/data/day';
import { presentStudents } from '@/core/data/eligible';
import { useCurrentClass } from '@/core/data/store';
import type { Student } from '@/core/data/types';
import { WordSheet } from '@/features/worksheets/Worksheets';
import { EVENTS, TOPICS, emptyBook, VOCAB_SOURCE, VOCAB_STATS, WORD_LEVELS, WRITE_INKS, WRITE_PAGE, bestHit, eventWords, findVocab, fitText, levelOf, pickOfDay, seasonalEvents, sourceLine, wordSpan, wordsOfWeek, writeColumns, writeGroups, parseDictExamples, parseDictSearch, weekKey, weekdayIndex, type WordBook, type WordEntry, type WordLevel, type WordPick } from './model';

// 오늘의 어휘 창: 낱말 · 뜻 · 문장을 크게 보여 주고, 읽기 · 쓰기 · 말하기 세 가지 활동을 한다. 창 아래에는 어휘의 출처와 근거를 밝힌다.
// 제목 줄의 "어휘 정하기"에서 단계, 이번 주 요일별 어휘, 추가한 어휘를 고친다.

type Tab = 'read' | 'write' | 'speak';
/** 세 가지 활동 — 색과 아이콘으로 구분한다 (읽기 파랑 · 쓰기 주황 · 말하기 분홍) */
const TABS: { id: Tab; label: string; desc: string; icon: string }[] = [
  { id: 'read', label: '읽기', desc: '글자를 짚으며 읽어요', icon: 'ph-fill ph-book-open-text' },
  { id: 'write', label: '쓰기', desc: '손으로 따라 써요', icon: 'ph-fill ph-pencil-simple' },
  { id: 'speak', label: '말하기', desc: '말하고 녹음해 들어요', icon: 'ph-fill ph-microphone' },
];
/** 녹음은 이 시간(ms)에서 스스로 멈춘다 */
const REC_MAX = 15000;
/** 문장 '함께 쓰기'에 고를 수 있는 학생 수 */
const PAIR_MAX = 2;
/** 또박또박 천천히 읽어 준다 */
const say = (text: string) => speak(text, { rate: 0.8 });

// ── 쓰기: 흐린 글씨 위에 손가락으로 따라 쓴다 ──
/** 따라 쓰는 칸 하나. 글은 칸 크기에 맞춰 가장 크게(긴 문장은 여러 줄로) 놓이고, 여러 손가락이 함께 써도 된다. */
function TracePad({ text, ink = '#1B3A57', wipe = 0 }: { text: string; ink?: string; wipe?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const last = useRef(new Map<number, { x: number; y: number }>());
  const [fit, setFit] = useState<{ lines: string[]; size: number }>({ lines: [text], size: 0 });
  const clear = () => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr);
    cv.getContext('2d')!.scale(dpr, dpr);
  };
  // 칸 크기가 바뀌면 글자 크기를 다시 맞추고 쓴 것을 지운다 (글자 자리가 달라지므로)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => { setFit(fitText(text, el.clientWidth, el.clientHeight)); clear(); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);
  useEffect(() => { if (wipe) clear(); }, [wipe]);
  const at = (e: React.PointerEvent<HTMLCanvasElement>) => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  const pen = Math.max(6, Math.min(18, fit.size * 0.085));
  return (
    <div className="wd-trace" ref={box}>
      <div className="wd-ghost" aria-hidden="true" style={{ fontSize: fit.size || undefined }}>{fit.lines.map((l, i) => <span key={i}>{l}</span>)}</div>
      <canvas ref={ref} aria-label={`${text} 따라 쓰기`}
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* 잡지 못해도 쓸 수 있다 */ } last.current.set(e.pointerId, at(e)); }}
        onPointerMove={(e) => {
          const from = last.current.get(e.pointerId);
          if (!from) return;
          const to = at(e);
          const ctx = e.currentTarget.getContext('2d')!;
          ctx.strokeStyle = ink; ctx.lineWidth = pen; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
          last.current.set(e.pointerId, to);
        }}
        onPointerUp={(e) => last.current.delete(e.pointerId)} onPointerCancel={(e) => last.current.delete(e.pointerId)} />
      <button className="wd-clear" onClick={() => { clear(); playSound('select'); }}>↺ 다시 쓰기</button>
    </div>
  );
}

interface Stage {
  text: string;
  /** 칸을 나눠 쓸 학생. 비어 있으면 혼자 크게 쓴다 */
  writers: Student[];
  /** 다같이 써보기: 종료하면 오늘 어휘 쓰기를 마친 것으로 기록한다 */
  all?: boolean;
}

/** 전체 화면 쓰기: 학생마다 이름표가 붙은 칸을 나눠 준다 (전자칠판에서 여럿이 함께 쓴다). 쓴 글씨는 저장하지 않는다. */
function WriteStage({ stage, onClose, onFinish }: { stage: Stage; onClose: () => void; onFinish: () => void }) {
  const groups = stage.writers.length ? writeGroups(stage.writers) : [[]];
  const [page, setPage] = useState(0);
  const [wipe, setWipe] = useState(0);
  const group = groups[Math.min(page, groups.length - 1)];
  // Esc 는 이 화면만 닫는다 (뒤의 어휘 창은 그대로)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);
  return createPortal(
    <div className="wd-stage" role="dialog" aria-modal="true" aria-label="따라 쓰기">
      <div className="wd-stage-bar">
        <b><i className="ph-fill ph-pencil-simple" /> {stage.all ? '다같이 써보기' : stage.writers.length ? '함께 쓰기' : '크게 쓰기'}</b>
        <span className="wd-stage-text">{stage.text}</span>
        {groups.length > 1 && (
          <div className="mv-toggle" role="group" aria-label="모둠 고르기">
            {groups.map((g, i) => <button key={i} className={i === page ? 'on' : ''} aria-pressed={i === page} onClick={() => { setPage(i); playSound('select'); }}>{i + 1}모둠 ({g.length}명)</button>)}
          </div>
        )}
        <button className="wd-stage-btn" onClick={() => { setWipe((n) => n + 1); playSound('select'); }}>↺ 모두 지우기</button>
        {stage.all
          ? <button className="wd-stage-btn done" onClick={onFinish}>✓ 종료 (모두 작성 완료)</button>
          : <button className="wd-stage-btn done" onClick={onClose}>✓ 닫기</button>}
      </div>
      <div className="wd-stage-grid" key={page} style={{ gridTemplateColumns: `repeat(${writeColumns(group.length)}, minmax(0, 1fr))` }}>
        {group.length === 0 && <div className="wd-stage-cell"><TracePad text={stage.text} wipe={wipe} /></div>}
        {group.map((s, i) => {
          const ink = WRITE_INKS[(page * WRITE_PAGE + i) % WRITE_INKS.length];
          return (
            <div key={s.id} className="wd-stage-cell" style={{ borderColor: ink }}>
              <div className="wd-stage-name" style={{ background: ink }}>{s.name}</div>
              <TracePad text={stage.text} ink={ink} wipe={wipe} />
            </div>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

/** 쓰기 활동: 낱말 · 문장을 고르고, 여기서 바로 쓰거나 전체 화면으로 크게 · 여럿이 쓴다 */
function WritePractice({ entry }: { entry: WordEntry }) {
  const cls = useCurrentClass();
  const record = useDay((s) => s.record);
  const update = useDay((s) => s.update);
  const [target, setTarget] = useState<'word' | 'sentence'>('word');
  const [choosing, setChoosing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [stage, setStage] = useState<Stage | null>(null);
  const present = presentStudents(cls, record);
  const sentence = target === 'sentence' && !!entry.sentence;
  const text = sentence ? entry.sentence : entry.word;
  const toggle = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((x) => x !== id));
    else if (picked.length < PAIR_MAX) setPicked([...picked, id]);
    else toast(`함께 쓰기는 ${PAIR_MAX}명까지예요`);
    playSound('select');
  };
  const open = (s: Stage) => { ensureAudio(); playSound('select'); setStage(s); };
  return (
    <>
      <div className="wd-write-top">
        <div className="mv-toggle wd-target">
          <button className={!sentence ? 'on' : ''} onClick={() => { setTarget('word'); setChoosing(false); }}>낱말 쓰기</button>
          <button className={sentence ? 'on' : ''} disabled={!entry.sentence} onClick={() => setTarget('sentence')}>문장 쓰기</button>
        </div>
        <button className="wd-act" onClick={() => open({ text, writers: [] })}><i className="ph-bold ph-arrows-out" /> 크게 쓰기</button>
        {sentence
          ? <button className={`wd-act together${choosing ? ' on' : ''}`} disabled={!present.length} onClick={() => { setChoosing(!choosing); playSound('select'); }}><i className="ph-fill ph-users" /> 함께 쓰기</button>
          : <button className="wd-act together" disabled={!present.length} onClick={() => open({ text, writers: present, all: true })}><i className="ph-fill ph-users-three" /> 다같이 써보기</button>}
      </div>
      {sentence && choosing && (
        <div className="wd-pick">
          <span>누가 쓸까요? <small>({PAIR_MAX}명까지)</small></span>
          <div>{present.map((s) => <button key={s.id} className={picked.includes(s.id) ? 'on' : ''} aria-pressed={picked.includes(s.id)} onClick={() => toggle(s.id)}>{s.name}</button>)}</div>
          <button className="go" disabled={!picked.length} onClick={() => open({ text, writers: present.filter((s) => picked.includes(s.id)) })}>쓰기 시작 ▶</button>
        </div>
      )}
      <TracePad text={text} />
      {stage && (
        <WriteStage stage={stage} onClose={() => setStage(null)}
          onFinish={() => {
            update((r) => { r.wordDone = true; });
            playSound('complete'); toast('모두 작성 완료! 👏', 'success');
            setStage(null);
          }} />
      )}
    </>
  );
}

// ── 읽기: 낱말을 글자 하나씩 짚어 읽고, 문장 속에서 낱말을 찾아본다 ──
function ReadPractice({ entry }: { entry: WordEntry }) {
  const [at, setAt] = useState(-1);
  const letters = [...entry.word.replace(/\s/g, '')];
  const span = wordSpan(entry.word, entry.sentence);   // 문장 속에서 낱말이 쓰인 자리 (모양이 바뀐 말도 찾는다)
  useEffect(() => setAt(-1), [entry.word]);
  return (
    <div className="wd-read">
      <p>글자를 하나씩 눌러 짚으며 읽어요</p>
      <div className={`wd-syls${letters.length > 4 ? ' long' : ''}`}>
        {letters.map((ch, i) => <button key={i} className={i === at ? 'on' : ''} aria-label={`${ch} 듣기`} onClick={() => { setAt(i); say(ch); }}>{ch}</button>)}
      </div>
      {entry.sentence && (
        <div className="wd-read-sent">
          {!span ? entry.sentence : <>{entry.sentence.slice(0, span[0])}<mark>{entry.sentence.slice(span[0], span[1])}</mark>{entry.sentence.slice(span[1])}</>}
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

// ── 단계 고르기 · 출처 (카드와 창이 함께 쓴다) ──
/** 가 · 나 · 다 단계 고르기 */
export function LevelToggle({ level, onChange, className = '' }: { level: WordLevel; onChange: (l: WordLevel) => void; className?: string }) {
  return (
    <div className={`wd-levels ${className}`} role="group" aria-label="어휘 단계 고르기">
      {WORD_LEVELS.map((l) => (
        <button key={l.id} className={l.id === level ? 'on' : ''} aria-pressed={l.id === level} title={`${l.label} 단계 · ${l.desc}`} aria-label={`${l.label} 단계 (${l.desc})`}
          onClick={(e) => { e.stopPropagation(); if (l.id !== level) onChange(l.id); }}>{l.label}</button>
      ))}
    </div>
  );
}

/** 그날의 어휘가 어디서 나왔는지 한마디 */
export const pickLabel = (pick: WordPick) => (
  pick.from === 'set' ? '선생님이 정한 어휘'
    : pick.from === 'custom' ? '선생님이 추가한 어휘'
    : `이번 주 주제 · ${pick.topic}`
);

/** 창 아래에 밝히는 출처와 근거. entry 를 주면 그 어휘의 근거도 한 줄 보여 준다 */
function SourceFoot({ entry }: { entry?: WordEntry }) {
  const found = entry ? findVocab(entry) : null;
  return (
    <div className="wd-src">
      <p><b>출처</b><span><a href={VOCAB_SOURCE.url} target="_blank" rel="noreferrer">{VOCAB_SOURCE.title}</a> ({VOCAB_SOURCE.note})에서 가려 뽑고, 뜻과 문장은 쉬운 말로 다듬었어요.</span></p>
      {entry && <p><b>이 어휘</b><span>{found ? sourceLine(found) : '선생님이 직접 넣은 어휘예요 (기본 목록에 없는 어휘)'}</span></p>}
      <details>
        <summary>근거 자세히 보기</summary>
        <ul>
          <li><b>단계</b> {WORD_LEVELS.map((l) => `${l.label} = ${l.desc} ${TOPICS[l.id].length * 20}개`).join(' · ')}. 주제 {VOCAB_STATS.topics}개에 20개씩, 모두 {VOCAB_STATS.total.toLocaleString()}개예요.</li>
          <li><b>고른 방법</b> 국립국어원 목록의 1~4등급(4세~초등 6학년) 23,000개와 하나씩 견주었어요. {VOCAB_STATS.listed.toLocaleString()}개는 그 목록에 있는 어휘이고, {VOCAB_STATS.added}개는 목록에 없어 주제에 맞춰 더한 어휘예요.</li>
          <li><b>알아 둘 점</b> 등급은 국립국어원이 나이 · 학년에 따라 나눈 것이고, 학년마다 꼭 외워야 하는 어휘 목록은 아니에요. 단계는 학생에게 맞춰 골라 주세요.</li>
          <li><b>뜻과 문장</b> 아직 선생님 감수와 학생 검증을 거치지 않은 초안이에요. 어색한 곳은 "어휘 정하기"에서 고쳐 쓸 수 있어요.</li>
          <li><b>시기에 맞춘 어휘</b> "어휘 정하기"의 목록에서 계절 · 국경일 · 기념일 · 학교 행사에 어울리는 어휘를 권해요. 국경일 · 기념일 날짜는 행정안전부, 설날 · 추석 날짜는 우주항공청 월력요항을 따랐고, 어느 날에 어느 어휘를 잇는지는 편집에서 정한 제안이에요.</li>
        </ul>
      </details>
    </div>
  );
}

// ── 어휘 정하기 (선생님) ──
const blank = (): WordEntry => ({ word: '', meaning: '', sentence: '' });
const DAYS = ['월', '화', '수', '목', '금'];

/** 기본 목록에서 어휘 고르기: 단계 · 주제 · 시기로 좁혀 보고, 누르면 그 칸에 낱말 · 뜻 · 문장이 들어간다 */
function WordPicker({ level: first, event: firstEvent, date, custom, onPick, onClose }: { level: WordLevel; event: string; date: Date; custom: WordEntry[]; onPick: (w: WordEntry) => void; onClose: () => void }) {
  const [level, setLevel] = useState(first);
  const [topic, setTopic] = useState('');
  const [event, setEvent] = useState(firstEvent);
  const [q, setQ] = useState('');
  const near = seasonalEvents(date).filter((e) => eventWords(e, level).length);
  const ev = EVENTS.find((e) => e.id === event);
  const mine = topic === '__mine';
  const base: WordEntry[] = mine ? custom.filter((w) => w.word.trim()) : ev ? eventWords(ev, level) : TOPICS[level].flatMap((t) => t.words);
  const list = base.filter((w) => (mine || !topic || ('topic' in w && w.topic === topic)) && (!q.trim() || w.word.includes(q.trim())));
  return (
    <div className="wd-picker">
      <div className="wd-picker-top">
        <LevelToggle level={level} onChange={(l) => { setLevel(l); setTopic(''); }} />
        <select aria-label="주제" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">주제 모두</option>
          {TOPICS[level].map((t) => <option key={`${t.band}-${t.name}`} value={t.name}>{t.name}</option>)}
          {custom.some((w) => w.word.trim()) && <option value="__mine">내가 추가한 어휘</option>}
        </select>
        <select aria-label="시기 · 행사" value={event} onChange={(e) => setEvent(e.target.value)}>
          <option value="">시기 · 행사 모두</option>
          {EVENTS.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <input aria-label="낱말 찾기" placeholder="낱말 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="x" aria-label="목록 닫기" onClick={onClose}>✕</button>
      </div>
      {near.length > 0 && (
        <div className="wd-picker-near">
          <span>이 무렵에 좋아요</span>
          {near.map((e) => <button key={e.id} className={e.id === event ? 'on' : ''} aria-pressed={e.id === event} onClick={() => { setEvent(e.id === event ? '' : e.id); setTopic(''); }}>{e.name}</button>)}
        </div>
      )}
      <div className="wd-picker-list">
        {list.map((w, i) => <button key={`${w.word}-${i}`} title={w.sentence} onClick={() => onPick({ word: w.word, meaning: w.meaning, sentence: w.sentence })}><b>{w.word}</b><small>{w.meaning}</small></button>)}
        {!list.length && <p>알맞은 어휘가 없어요. 주제나 시기를 바꿔 보세요.</p>}
      </div>
    </div>
  );
}

function WordRow({ label, value, hint, onChange, onList, onRemove }: { label: string; value: WordEntry; hint?: string; onChange: (v: WordEntry) => void; onList?: () => void; onRemove?: () => void }) {
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
      <input className="w" placeholder={hint ? `${hint} (자동)` : '낱말'} maxLength={20} value={value.word} onChange={set('word')} />
      <input placeholder="뜻" maxLength={80} value={value.meaning} onChange={set('meaning')} />
      <input placeholder="낱말이 들어간 문장" maxLength={80} value={value.sentence} onChange={set('sentence')} />
      <div className="acts">
        {onList && <button title="기본 목록에서 고르기" onClick={onList}>📚 목록</button>}
        <button title="사전에서 뜻과 문장 가져오기" disabled={busy} onClick={() => void fill()}>{busy ? '…' : '📖 사전'}</button>
        <button className="del" title="지우기" aria-label="어휘 지우기" disabled={!onRemove && !value.word.trim() && !value.meaning.trim() && !value.sentence.trim()} onClick={onRemove ?? (() => onChange(blank()))}>✕</button>
      </div>
    </div>
  );
}

function WordSetup({ book, date, onSave, onBack }: { book: WordBook; date: Date; onSave: (b: WordBook) => void; onBack: () => void }) {
  const mondays = [0, 7].map((n) => { const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + n); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; });   // 이번 주 · 다음 주
  const keys = mondays.map(weekKey);
  const [at, setAt] = useState(weekdayIndex(date) < 0 ? 1 : 0);   // 주말에 열면 다음 주부터 보여 준다 (미리 정해 두는 때이므로)
  const [level, setLevel] = useState(book.level);
  // 정해 둔 어휘 · 추가한 어휘는 단계마다 따로 — 위에서 고른 단계의 것을 고친다
  const [allWeeks, setAllWeeks] = useState(() => Object.fromEntries(WORD_LEVELS.map((l) => [l.id, Object.fromEntries(keys.map((k) => [k, DAYS.map((_, i) => book.weeks[l.id]?.[k]?.[i] ?? blank())]))])) as Record<WordLevel, Record<string, WordEntry[]>>);
  const [allCustom, setAllCustom] = useState(() => Object.fromEntries(WORD_LEVELS.map((l) => [l.id, (book.custom[l.id] ?? []).map((w) => ({ ...w }))])) as Record<WordLevel, WordEntry[]>);
  const weeks = allWeeks[level];
  const custom = allCustom[level];
  const setCustom = (list: WordEntry[]) => setAllCustom({ ...allCustom, [level]: list });
  const [listAt, setListAt] = useState(-1);   // 목록에서 고르는 중인 요일
  const [listEvent, setListEvent] = useState('');   // 목록을 열 때 먼저 보여 줄 시기
  const key = keys[at];
  const week = weeks[key];
  const clean = (w: WordEntry): WordEntry => ({ word: w.word.trim(), meaning: w.meaning.trim(), sentence: w.sentence.trim() });
  const setDay = (i: number, v: WordEntry) => setAllWeeks({ ...allWeeks, [level]: { ...weeks, [key]: week.map((x, j) => (j === i ? v : x)) } });
  /** 비워 둔 요일에 저절로 나올 어휘 (지금 고른 단계 · 추가한 어휘 기준) */
  const auto = (i: number) => pickOfDay({ ...emptyBook(), level, custom: allCustom }, new Date(mondays[at].getFullYear(), mondays[at].getMonth(), mondays[at].getDate() + i));
  const theme = auto(0)?.topic;
  const near = seasonalEvents(mondays[at]).filter((e) => eventWords(e, level).length);
  const save = () => {
    const next = emptyBook();
    for (const l of WORD_LEVELS) {
      next.weeks[l.id] = { ...book.weeks[l.id] };
      for (const k of keys) {
        const filled = allWeeks[l.id][k].map((w) => (w.word.trim() ? clean(w) : null));
        if (filled.some(Boolean)) next.weeks[l.id][k] = filled; else delete next.weeks[l.id][k];
      }
      next.custom[l.id] = allCustom[l.id].filter((w) => w.word.trim()).map(clean);
    }
    onSave({ ...next, level });
    playSound('save'); toast('어휘를 저장했어요', 'success');
    onBack();
  };
  return (
    <div className="wd-setup">
      <div className="wd-sec">
        <h3>단계 <small>아래의 정하는 어휘와 추가한 어휘는 단계마다 따로예요. 정해 두지 않은 날에는 이 단계의 어휘가 주마다 한 주제씩 나와요</small></h3>
        <div className="wd-level-pick">
          {WORD_LEVELS.map((l) => <button key={l.id} className={l.id === level ? 'on' : ''} aria-pressed={l.id === level} onClick={() => { setLevel(l.id); setListAt(-1); }}><b>{l.label}</b><span>{l.desc}</span></button>)}
        </div>
      </div>
      <div className="wd-sec">
        <h3>{levelOf(level).label} 단계 · 주마다 정하는 어휘 <small>비워 둔 요일은 흐리게 적힌 어휘가 저절로 나와요{theme ? ` (이 주의 주제: ${theme})` : ''}</small></h3>
        <div className="mv-toggle">
          {keys.map((k, i) => <button key={k} className={i === at ? 'on' : ''} aria-pressed={i === at} onClick={() => { setAt(i); setListAt(-1); }}>{i === 0 ? '이번 주' : '다음 주'} ({Number(k.slice(4, 6))}월 {Number(k.slice(6))}일~)</button>)}
        </div>
        {near.length > 0 && (
          <div className="wd-picker-near">
            <span>🗓 이 무렵에 좋은 어휘</span>
            {near.map((e) => <button key={e.id} title={`${e.name}에 어울리는 어휘를 목록에서 골라요`} onClick={() => { const empty = week.findIndex((w) => !w.word.trim()); setListEvent(e.id); setListAt(empty < 0 ? 0 : empty); }}>{e.name}</button>)}
          </div>
        )}
        {week.map((w, i) => {
          const pick = auto(i);
          return (
            <div key={`${level}-${key}-${i}`} className="wd-day">
              <WordRow label={DAYS[i]} value={w} hint={pick?.entry.word} onChange={(v) => setDay(i, v)} onList={() => { setListEvent(''); setListAt(listAt === i ? -1 : i); }} />
              {listAt === i && <WordPicker key={listEvent} level={level} event={listEvent} date={mondays[at]} custom={custom} onPick={(v) => { setDay(i, v); setListAt(-1); playSound('select'); }} onClose={() => setListAt(-1)} />}
            </div>
          );
        })}
      </div>
      <div className="wd-sec">
        <h3>{levelOf(level).label} 단계 · 추가한 어휘 <small>기본 목록에 없는 어휘 — 금요일마다 하나씩 차례로 나와요</small></h3>
        {custom.map((w, i) => <WordRow key={`${level}-${i}`} label="＋" value={w} onChange={(v) => setCustom(custom.map((x, j) => (j === i ? v : x)))} onRemove={() => setCustom(custom.filter((_, j) => j !== i))} />)}
        <button className="wd-add" onClick={() => setCustom([...custom, blank()])}>＋ 어휘 추가</button>
      </div>
      <SourceFoot />
      <div className="wd-credit">📖 사전 단추의 뜻과 문장: 국립국어원 한국어기초사전</div>
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
  const [sheet, setSheet] = useState(false);
  const pick = pickOfDay(book, date);
  const entry = pick?.entry ?? null;

  useEffect(() => { if (entry && !setup) say(`오늘의 어휘는, ${entry.word}`); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [entry?.word]);

  if (sheet && entry) return <WordSheet entry={entry} week={wordsOfWeek(book, date)} onBack={() => setSheet(false)} />;
  if (setup) return <Popup title="✏️ 어휘 정하기" large onClose={onClose}><WordSetup book={book} date={date} onSave={onSave} onBack={() => setSetup(false)} /></Popup>;
  return (
    <Popup title="📗 오늘의 어휘" large onClose={onClose}
      headerExtra={<>
        {entry && <button className="wd-setup-btn" onClick={() => { window.speechSynthesis?.cancel(); playSound('select'); setSheet(true); }}><i className="ph-bold ph-printer" /> 학습지</button>}
        <button className="wd-setup-btn" onClick={() => setSetup(true)}><i className="ph-bold ph-pencil-simple-line" /> 어휘 정하기</button>
      </>}>
      {!pick || !entry ? <div className="card-hint" style={{ padding: 40 }}>어휘가 없어요. "어휘 정하기"에서 어휘를 넣어 주세요.</div> : (
        <div className="wd">
          <div className="wd-main">
            <div className="wd-head">
              <div className={`wd-tag ${pick.from}`}>{pickLabel(pick)}</div>
              <LevelToggle level={book.level} onChange={(level) => { playSound('select'); onSave({ ...book, level }); }} />
            </div>
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
            {tab === 'write' && <WritePractice entry={entry} />}
            {tab === 'speak' && <SpeakPractice entry={entry} />}
            </div>
          </div>
        </div>
      )}
      <SourceFoot entry={entry ?? undefined} />
    </Popup>
  );
}
