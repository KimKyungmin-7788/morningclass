import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Popup } from '@/core/ui/Popup';
import { RecMeter, useRecorder } from '@/core/ui/Recorder';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { chime, fireworks } from '@/core/ui/fireworks';
import { speak } from '@/core/tts';
import { useDay } from '@/core/data/day';
import { activeStudents, useCurrentClass } from '@/core/data/store';
import type { Student } from '@/core/data/types';
import { SheetFrame } from '@/features/worksheets/Worksheets';
import { TO_LABEL, type ExprSituation, type ExprTopic } from './data';
import { EXPR_PARTS, buildExprCardsHTML } from './cardSheet';
import { ExprTour } from './ExprTour';
import { correctFirst, doneList, recentPicks, sayImages, sceneImages, setLevel, toggleDone, type ExprLevel, type ExprPick } from './model';
import { useExprToday } from './useToday';

// 생활표현 창: ① 상황 그림을 크게 보고 → ② 모든 학생이 자기 수준(문장 · 낱말 · 그림 카드)으로 말해 본다.
// 문장 · 낱말은 듣기 · 녹음 · 내 목소리 듣기, 그림 카드는 두 장 중 맞는 카드 고르기. 녹음은 이 창에서만 듣고 저장하지 않는다.
// 학생 배치: 이름을 수준 칸으로 끌어다 놓는다(처음 한 번). 배치된 이름을 누르면 오늘 따라 말하기 완료 ✓.

const REC_MAX = 10000;
/** 또박또박 천천히 읽어 준다 */
const say = (text: string) => speak(text, { rate: 0.85 });

const LEVELS: { id: ExprLevel; icon: string; label: string }[] = [
  { id: 'sentence', icon: '🗣️', label: '문장' },
  { id: 'word', icon: '💬', label: '낱말' },
  { id: 'card', icon: '✋', label: '그림 카드' },
];

/** 그림 카드 (교실의 그림 카드처럼: 그림 + 말) */
export function PictureCard({ emoji, text, small }: { emoji: string; text: string; small?: boolean }) {
  return (
    <button className={`ex-pic${small ? ' small' : ''}`} onClick={(e) => { e.stopPropagation(); say(text); }} aria-label={`${text} 그림 카드 듣기`}>
      <span aria-hidden="true">{emoji}</span><b>{text}</b>
    </button>
  );
}

/** 상황 그림: public/img/expression/<id>.webp → .png → 없으면 emoji. say: 바르게 말하는 그림(<id>-say)을 먼저 찾는다 */
export function SceneImage({ s, className = '', say }: { s: ExprSituation; className?: string; say?: boolean }) {
  const srcs = say ? sayImages(s.id) : sceneImages(s.id);
  const [at, setAt] = useState(0);
  useEffect(() => setAt(0), [s.id, say]);
  if (at >= srcs.length) return <span className={`ex-scene-img emoji ${className}`} aria-hidden="true">{s.emoji}</span>;
  return <img className={`ex-scene-img ${className}`} src={srcs[at]} alt={s.title} draggable={false} onError={() => setAt(at + 1)} />;
}

export function ExprWindow({ pick, date, onClose }: { pick: ExprPick; date: Date; onClose: () => void }) {
  const { topic, situation: s } = pick;
  const [stage, setStage] = useState<'scene' | 'practice'>('scene');
  const [sheet, setSheet] = useState(false);
  const cls = useCurrentClass();
  const { book, setBook } = useExprToday(cls?.id, date);
  const students = activeStudents(cls);
  const placed = students.filter((st) => book.levels[st.id]);
  const unplaced = students.filter((st) => !book.levels[st.id]);
  const done = doneList(useDay((st) => st.record.exprDone));
  const doneCount = placed.filter((st) => done.includes(st.id)).length;
  const allDone = placed.length > 0 && doneCount === placed.length;
  const [cheer, setCheer] = useState(false);
  /** 말하기 그림 크게 보기 */
  const [zoom, setZoom] = useState(false);
  useEffect(() => {
    if (!zoom) return;
    // 크게 보기는 Esc 로 먼저 닫는다 (아래 생활표현 창은 그대로)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setZoom(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [zoom]);
  const update = useDay((st) => st.update);
  useEffect(() => { if (stage === 'scene') say(`${s.scene} 이럴 땐 뭐라고 말할까요?`); }, [s.scene, stage]);

  // 배치하기 모드는 없다: 이름은 언제든 끌어서 다른 수준 칸(또는 아래 이름 줄)으로 옮긴다
  const drag = useNameDrag((id, level) => {
    setBook(setLevel(book, id, level));
    playSound(level ? 'check' : 'select');
  });
  /** 말해 본 학생: 이름을 누르면 ✓ (다시 누르면 취소). 칸에 놓인 학생이 모두 ✓ 이면 다 함께 축하한다 */
  const tapName = (st: Student) => {
    const on = !done.includes(st.id);
    const next = toggleDone(done, st.id);
    update((r) => { r.exprDone = toggleDone(r.exprDone, st.id); });
    if (!on) { playSound('select'); return; }
    if (placed.every((p) => next.includes(p.id))) {
      setCheer(true);
      chime(); fireworks();
      speak('모두모두 잘했어요!', { rate: 1, pitch: 1.1 });
    } else {
      playSound('correct');
      say(`${st.name}, 잘했어요!`);
    }
  };
  const nameChip = (st: Student, level: ExprLevel | 'none') => {
    // 칸에 놓인 이름: 누르면 말해 보기 ✓, 끌면 다른 칸으로. 이름 줄의 이름: 끌어서 칸에 놓는다
    const ok = level !== 'none' && done.includes(st.id);
    return (
      <button key={st.id} className={`ex-name grab lv-${level}${ok ? ' done' : ''}${drag.dragging === st.id ? ' dragging' : ''}`}
        onPointerDown={(e) => drag.start(e, st)}
        onClick={() => { if (drag.wasDrag()) return; if (level === 'none') toast('이름을 끌어서 수준 칸에 놓아 주세요'); else tapName(st); }}
        aria-label={level === 'none' ? `${st.name} 끌어서 수준 칸에 놓기` : `${st.name} 말해 보기 ${ok ? '완료 취소' : '완료'}`}>
        {ok ? <i className="ph-bold ph-check" /> : level !== 'none' && <i className="ph-fill ph-microphone" />}{st.name}
      </button>
    );
  };

  if (sheet) return <CardSheet pick={pick} recent={recentPicks(book.bag, 5)} onBack={() => setSheet(false)} />;

  return (
    <Popup title={`💬 오늘의 생활표현 · ${topic.name}`} large onClose={() => { window.speechSynthesis?.cancel(); onClose(); }}
      headerExtra={<>
        <button className="wd-setup-btn" onClick={() => { window.speechSynthesis?.cancel(); playSound('select'); setSheet(true); }}><i className="ph-bold ph-printer" /> 그림 카드 인쇄</button>
      </>}>
      <ExprTour showScene={() => setStage('scene')} showPractice={() => { window.speechSynthesis?.cancel(); setStage('practice'); }} />
      {stage === 'scene' ? (
        <div className="ex">
          <div className="ex-scene-big">
            <p className="ex-q">이럴 땐 뭐라고 말할까요? <span className={`ex-to ${s.to}`}>{TO_LABEL[s.to]}</span></p>
            <SceneImage s={s} />
            <button className="ex-scene-text" onClick={() => say(s.scene)}>{s.scene}<i className="ph-fill ph-speaker-high" /></button>
          </div>
          <div className="ex-nav">
            <button className="next" onClick={() => { window.speechSynthesis?.cancel(); playSound('select'); setStage('practice'); }}>말해 보기 <i className="ph-bold ph-arrow-right" /></button>
          </div>
        </div>
      ) : (
        <div className="ex">
          {/* 위 띠: 바르게 말하는 그림 · 상황 이름 · 이어서 할 말 · 모두 말해 보기 진행 (상황 문장은 앞 화면에서 봤으니 줄인다) */}
          <div className="ex-say">
            <button className="ex-say-img" onClick={() => { playSound('select'); setZoom(true); }} aria-label="바르게 말하는 그림 크게 보기">
              <SceneImage s={s} say /><i className="ph-bold ph-magnifying-glass-plus" aria-hidden="true" />
            </button>
            <div className="ex-say-txt">
              {/* 첫 화면의 "이럴 땐 뭐라고 말할까요?"에 답하는 줄 */}
              <b>이럴 땐 이렇게 말해 보세요 <span className={`ex-to ${s.to}`}>{TO_LABEL[s.to]}</span></b>
              <span className="ex-next">{s.next.when} → <b>{s.next.say}</b></span>
              <button className="ex-back" onClick={() => { playSound('select'); setStage('scene'); }}><i className="ph-bold ph-arrow-u-up-left" /> 상황 다시 보기</button>
            </div>
            <div className={`ex-progress${allDone ? ' all' : ''}`} role="status">
              {placed.length ? <>
                <b>{allDone ? '🎉 모두 한 번씩 말했어요!' : '🎤 모두 한 번씩 말해 봐요!'}</b>
                <span className="ex-bar" aria-hidden="true"><i style={{ width: `${(doneCount / placed.length) * 100}%` }} /></span>
                <span className="ex-count"><b>{doneCount}</b> / {placed.length}명 <small>· 말한 친구 이름을 눌러요</small></span>
              </> : <b>👇 학생 이름을 끌어서 수준 칸에 놓으면 시작해요</b>}
            </div>
          </div>
          <div className="ex-levels">
            {LEVELS.map((l) => (
              <LevelPanel key={`${s.id}-${l.id}`} level={l} s={s} topic={topic} first={correctFirst(date, s.id)}
                drop={drag.over === l.id} names={students.filter((st) => book.levels[st.id] === l.id).map((st) => nameChip(st, l.id))} />
            ))}
          </div>
          {/* 아래 이름 줄은 늘 있다: 아직 칸에 없는 학생이 여기 있고, 칸에서 여기로 끌어 오면 배치가 빠진다 */}
          {/* 한 줄 고정 높이: 왼쪽 안내 + 오른쪽 이름 (이름이 많으면 옆으로 넘긴다) — 배치 전후로 화면 크기가 변하지 않게 */}
          <div className={`ex-tray${drag.over === 'none' ? ' drop' : ''}`} data-drop="none">
            <span>{!students.length ? '⚙️ 설정에서 학생을 등록해 주세요'
              : unplaced.length ? '👉 이름을 끌어서 수준 칸에 놓아요' : '여기로 끌어 오면 칸에서 빠져요'}</span>
            <div>{unplaced.map((st) => nameChip(st, 'none'))}</div>
          </div>
        </div>
      )}
      {cheer && <Cheer onClose={() => setCheer(false)} />}
      {zoom && createPortal(
        <div className="ex-zoom" role="dialog" aria-label="바르게 말하는 그림" onClick={() => setZoom(false)}>
          <SceneImage s={s} say />
          <p>{s.sentence}</p>
        </div>, document.body)}
    </Popup>
  );
}

/** 모두 말했을 때: 가운데에 크게 떠오르는 축하 (누르거나 잠시 뒤 닫힌다) */
function Cheer({ onClose }: { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3600); return () => clearTimeout(t); }, [onClose]);
  return createPortal(
    <div className="ex-cheer" role="alert" onClick={onClose}>
      <div className="ex-cheer-box">
        <span aria-hidden="true">🎉</span>
        <b>모두모두 잘했어요!</b>
        <small>오늘 모두 한 번씩 말해 봤어요</small>
      </div>
    </div>,
    document.body,
  );
}

/**
 * 이름 끌어다 놓기 (손가락 · 펜 · 마우스 모두 포인터로). 놓은 자리의 [data-drop] 으로 수준을 정한다.
 * 칸 밖에 놓으면 아무것도 바꾸지 않는다.
 */
function useNameDrag(onDrop: (id: string, level: ExprLevel | undefined) => void) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  /** 방금 끌기가 끝났는지 — 끈 뒤 같은 이름 위에서 손을 떼도 누르기(✓)로 치지 않게 */
  const dragged = useRef(false);
  const zoneAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest('[data-drop]') as HTMLElement | null)?.dataset.drop ?? null;
  const start = (e: React.PointerEvent, st: Student) => {
    if (e.button > 0) return;
    e.preventDefault();
    const sx = e.clientX; const sy = e.clientY; const pid = e.pointerId;
    const from = e.currentTarget as HTMLElement;
    let ghost: HTMLElement | null = null;
    const move = (m: PointerEvent) => {
      if (m.pointerId !== pid) return;
      if (!ghost) {
        if (Math.hypot(m.clientX - sx, m.clientY - sy) < 8) return;
        dragged.current = true;
        ghost = from.cloneNode(true) as HTMLElement;
        ghost.classList.add('ex-ghost');
        document.body.appendChild(ghost);
        setDragging(st.id);
        playSound('select');
      }
      ghost.style.transform = `translate(${m.clientX}px,${m.clientY}px) translate(-50%,-50%)`;
      setOver(zoneAt(m.clientX, m.clientY));
    };
    const up = (u: PointerEvent) => {
      if (u.pointerId !== pid) return;
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      setDragging(null); setOver(null);
      if (!ghost) return;                                          // 끌지 않고 누름 — 누르기(onClick)가 맡는다
      setTimeout(() => { dragged.current = false; }, 0);
      ghost.remove();
      const zone = u.type === 'pointercancel' ? null : zoneAt(u.clientX, u.clientY);
      if (zone) onDropRef.current(st.id, zone === 'none' ? undefined : (zone as ExprLevel));
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  return { start, dragging, over, wasDrag: () => dragged.current };
}

function LevelPanel({ level, s, topic, first, names, drop }: {
  level: (typeof LEVELS)[number]; s: ExprSituation; topic: ExprTopic; first: boolean; names: React.ReactNode[]; drop: boolean;
}) {
  const rec = useRecorder(REC_MAX);
  const text = level.id === 'sentence' ? s.sentence : s.word;
  return (
    <section className={`ex-level lv-${level.id}${drop ? ' drop' : ''}`} data-drop={level.id}>
      <h3><span aria-hidden="true">{level.icon}</span> {level.label}</h3>
      {level.id === 'card' ? <CardChoice s={s} topic={topic} first={first} /> : <>
        <div className="ex-level-body">
          <button className={`ex-line lv-${level.id}`} onClick={() => say(text)}>{text}</button>
        </div>
        {rec.state === 'on' && rec.live && <RecMeter stream={rec.live} maxMs={REC_MAX} bars={12} />}
        <div className="ex-acts">
          <button onClick={() => say(text)}><i className="ph-fill ph-speaker-high" /> 듣기</button>
          <button className={rec.state === 'on' ? 'rec' : ''} onClick={rec.toggle}>
            {rec.state === 'on' ? <><i className="ph-fill ph-stop" /> 그만</> : <><i className="ph-fill ph-microphone" /> {rec.url ? '다시 녹음' : '녹음'}</>}
          </button>
          <button disabled={!rec.url || rec.state === 'on'} onClick={rec.play}><i className="ph-fill ph-play" /> 내 목소리</button>
        </div>
        {rec.state === 'denied' && <p className="ex-warn">마이크를 쓸 수 없어요. 주소창의 🔒 에서 마이크를 허용해 주세요.</p>}
        {rec.state === 'unsupported' && <p className="ex-warn">이 기기에서는 녹음할 수 없어요.</p>}
      </>}
      <div className="ex-names">{names.length ? names : <span className="ex-names-empty">여기에 이름을 놓아요</span>}</div>
    </section>
  );
}

/** 그림 카드 수준: 두 장 중 이 상황에 맞는 카드 고르기 */
function CardChoice({ s, topic, first }: { s: ExprSituation; topic: ExprTopic; first: boolean }) {
  const [picked, setPicked] = useState<'right' | 'wrong' | null>(null);
  const right = { key: 'right' as const, emoji: s.cardEmoji ?? topic.cardEmoji, text: s.card };
  const wrong = { key: 'wrong' as const, ...s.wrong };
  const cards = first ? [right, wrong] : [wrong, right];
  const pick = (k: 'right' | 'wrong', text: string) => {
    setPicked(k);
    if (k === 'right') { playSound('correct'); say(`${text}. 잘했어요!`); } else { playSound('wrong'); say(`${text}. 다시 골라 볼까요?`); }
  };
  return <>
    <div className="ex-level-body">
      <p className="ex-pick-q">어떤 카드를 건넬까요?</p>
      <div className="ex-pick">
        {cards.map((c) => (
          <button key={c.key} className={`ex-pic${picked === c.key ? ` ${c.key}` : ''}`} onClick={() => pick(c.key, c.text)} aria-label={`${c.text} 카드 고르기`}>
            <span aria-hidden="true">{c.emoji}</span><b>{c.text}</b>
          </button>
        ))}
      </div>
      {/* 다시 하기 단추는 없다: 틀리면 알려 주고, 다른 카드를 바로 다시 고르면 된다 */}
      <p className={`ex-act${picked ? ` ${picked}` : ''}`}>{picked === 'right' ? `잘했어요! ${topic.cardAct[s.to]}` : picked === 'wrong' ? '⚠️ 이 카드가 아니에요. 다시 골라 볼까요?' : '\u00a0'}</p>
    </div>
  </>;
}

let cardSel: Record<string, boolean> = { cards: true, strip: true };
function CardSheet({ pick, recent, onBack }: { pick: ExprPick; recent: ExprPick[]; onBack: () => void }) {
  const [sel, setSel] = useState(cardSel);
  const html = useMemo(() => buildExprCardsHTML(pick, recent, sel), [pick, recent, sel]);
  return (
    <SheetFrame title="🖨️ 그림 카드 · 문장 띠 인쇄" html={html} canExport={EXPR_PARTS.some(([k]) => sel[k])} pdfName="생활표현_그림카드" backLabel="← 돌아가기" onBack={onBack}>
      <div className="ws-opts">
        {EXPR_PARTS.map(([k, l]) => <label key={k} className="ws-opt"><input type="checkbox" checked={!!sel[k]} onChange={(e) => { cardSel = { ...sel, [k]: e.target.checked }; setSel(cardSel); }} /> {l}</label>)}
      </div>
    </SheetFrame>
  );
}
