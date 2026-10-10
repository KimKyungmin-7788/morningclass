import { useEffect, useRef, useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup } from '@/core/ui/Popup';
import { InclToggles } from '@/core/ui/InclToggles';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { eligibleStudents } from '@/core/data/eligible';
import { EMOTIONS, EMO_ZONES, emotionOf } from '@/core/data/emotions';
import type { EmotionEntry, EmotionItem, EmotionKind, Student } from '@/core/data/types';
import type { FeatureManifest } from '../types';
import { EMO_MAX, EMO_PERSON, compact, emoImg, emoPose, heartPos, inHeart, makeMain, placeAt, roughInside, type Inside, type Pt } from './model';

// 우리반 감정: 학생마다 "마음 일기" 창에서 사람 몸에 감정 친구를 넣는다. 첫 감정(가운데 동그라미)이 주인공이 된다.

const TITLE = { icon: 'ph-fill ph-smiley', tint: '#fce7f3', color: '#db2777' };
const Blob = ({ k }: { k: EmotionKind }) => <span className="emo-tok"><img src={emoImg(k)} alt="" draggable={false} /></span>;

function EmotionsCard() {
  const cls = useCurrentClass();
  const record = useDay((s) => s.record);
  const [target, setTarget] = useState<Student | null>(null);
  const eligible = eligibleStudents(cls, record, 'emo');

  if (!activeStudents(cls).length) {
    return <CardFrame id="emotions" label="우리반 감정 현황"><CardTitle {...TITLE}>우리반 감정</CardTitle><div className="card-hint">⚙️ 설정에서 학생을 등록해 주세요</div></CardFrame>;
  }
  if (!eligible.length) {
    return <CardFrame id="emotions" label="우리반 감정 현황"><CardTitle {...TITLE}>우리반 감정</CardTitle><div className="card-hint">참여할 학생이 없어요 🙂</div><InclToggles kind="emo" /></CardFrame>;
  }
  const allDone = eligible.every((s) => record.emotions[s.id]);
  return (
    <>
      <CardFrame id="emotions" label="우리반 감정 현황" state={allDone ? 'filled' : 'empty'}>
        <CardTitle {...TITLE} extra={allDone ? <span className="v3-badge"><i className="ph-bold ph-check" />모두 완료</span> : undefined}>우리반 감정</CardTitle>
        <div className="students-grid">
          {eligible.map((s) => {
            const v: EmotionEntry | undefined = record.emotions[s.id];
            const kinds = [...new Set((v?.items ?? []).map((it) => it.k))];
            const label = !v ? '미선택' : kinds.length ? kinds.map((k) => emotionOf(k)?.l).join(', ') : v.legacy?.label ?? '';
            const open = () => { ensureAudio(); setTarget(s); };
            return (
              <div key={s.id} className={`student-card${v ? ' filled' : ''}`} tabIndex={0} role="button" aria-label={`${s.name} 감정 선택`}
                onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}>
                <div className="em" role="img" aria-label={label}>
                  {kinds.length ? <img className="em-img" src={emoImg(kinds[0])} alt="" /> : v ? v.legacy?.emoji : '❓'}
                  {kinds.length > 1 && <span className="em-more">+{kinds.length - 1}</span>}
                </div>
                <div className="nm">{s.name}</div>
              </div>
            );
          })}
        </div>
        <InclToggles kind="emo" />
      </CardFrame>
      {target && <DiaryWindow student={target} onClose={() => setTarget(null)} />}
    </>
  );
}

// 사람 그림 투명도 지도 — 놓은 자리가 몸 안인지 알파값으로 판정 (그림마다 한 번 만들어 재사용)
const masks = new Map<string, Inside | null>();
function loadMask(src: string): void {
  if (masks.has(src)) return;
  masks.set(src, null);
  const img = new Image();
  img.onload = () => {
    try {
      const W = 120; const H = Math.round((W * EMO_PERSON.h) / EMO_PERSON.w);
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const cx = cv.getContext('2d')!;
      cx.drawImage(img, 0, 0, W, H);
      const a = cx.getImageData(0, 0, W, H).data;
      masks.set(src, (p) => a[(Math.floor(Math.min(0.999, p.y) * H) * W + Math.floor(Math.min(0.999, p.x) * W)) * 4 + 3] > 100);
    } catch {
      /* 그림을 못 읽으면 대략적인 범위로 판정한다 */
    }
  };
  img.src = src;
}

function DiaryWindow({ student, onClose }: { student: Student; onClose: () => void }) {
  const cls = useCurrentClass();
  const saveClass = useData((s) => s.saveClass);
  const saved = useDay((s) => s.record.emotions[student.id]);
  const update = useDay((s) => s.update);
  const [items, setItems] = useState<EmotionItem[]>(() => (saved?.items ?? []).map((it) => ({ ...it })));
  const [picked, setPicked] = useState<EmotionKind | null>(null);   // 눌러서 넣기에서 고른 감정
  const [pop, setPop] = useState(-1);
  const [hot, setHot] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const mode = cls?.options.emoMode === 'tap' ? 'tap' : 'drag';
  const areaRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pose = emoPose(items[0]?.k);
  const lastPose = useRef(pose);
  const poseChanged = useRef(false);
  if (lastPose.current !== pose) { lastPose.current = pose; poseChanged.current = true; }
  const inside: Inside = (p) => (masks.get(emoPose(itemsRef.current[0]?.k)) ?? roughInside)(p);

  useEffect(() => {
    // 표정 그림 9장을 미리 받아 두고(바뀔 때 깜빡이지 않게) 몸 판정용 지도도 만든다
    [undefined, ...EMOTIONS.map((e) => e.k)].forEach((k) => loadMask(emoPose(k)));
    speak(`${student.name} 친구, 마음속에 어떤 감정이 있나요?`);
  }, [student.name]);

  /** 화면 좌표 → 사람 그림 기준 비율 좌표. 가운데 칸 밖이면 null (사람 옆 빈자리에 놓아도 받아 준다) */
  const toBox = (cx: number, cy: number): Pt | null => {
    const a = areaRef.current?.getBoundingClientRect();
    const r = wrapRef.current?.getBoundingClientRect();
    if (!a || !r || cx < a.left || cx > a.right || cy < a.top || cy > a.bottom) return null;
    const cl = (v: number) => Math.max(0, Math.min(0.999, v));
    return { x: cl((cx - r.left) / r.width), y: cl((cy - r.top) / r.height) };
  };
  const full = () => { playSound('wrong'); toast(`감정은 ${EMO_MAX}개까지 넣을 수 있어요`); };
  const say = (k: EmotionKind) => speak(emotionOf(k)?.say ?? '');   // 넣으면 "기뻐요"처럼 감정을 말로 읽어 준다

  const add = (k: EmotionKind, pos: { x: number; y: number; zone: string }) => {
    const cur = itemsRef.current;
    if (cur.length >= EMO_MAX) { full(); return; }
    setItems([...cur, { k, ...pos }]); setPop(cur.length);
    playSound('emotion'); say(k);
  };
  const promote = (it: EmotionItem) => { setItems(makeMain(itemsRef.current, it, inside)); setPop(-1); playSound('sparkle'); say(it.k); };
  const removeAt = (i: number) => { setItems(itemsRef.current.filter((_, j) => j !== i)); setPop(-1); playSound('check'); };

  /** 끌기: 손가락·펜·마우스를 모두 포인터로 처리. 거의 안 움직이고 떼면 '탭'으로 본다 */
  const startDrag = (ev: React.PointerEvent, k: EmotionKind, fromIdx: number | null, key: string) => {
    if (ev.button > 0) return;
    ev.preventDefault();
    const sx = ev.clientX; const sy = ev.clientY; const pid = ev.pointerId;
    let ghost: HTMLElement | null = null;
    const move = (m: PointerEvent) => {
      if (m.pointerId !== pid) return;
      if (!ghost) {
        if (Math.hypot(m.clientX - sx, m.clientY - sy) < 10) return;
        ghost = document.createElement('div');
        ghost.className = 'emo-ghost';
        ghost.innerHTML = `<span class="emo-tok"><img src="${emoImg(k)}" alt=""></span>`;
        const size = Math.round((wrapRef.current?.getBoundingClientRect().width ?? 200) * 0.22);
        ghost.style.width = ghost.style.height = `${size}px`;
        document.body.appendChild(ghost);
        setDragging(key);
        playSound('select');
      }
      ghost.style.transform = `translate(${m.clientX}px,${m.clientY}px) translate(-50%,-50%)`;
      setHot(!!toBox(m.clientX, m.clientY));
    };
    const up = (u: PointerEvent) => {
      if (u.pointerId !== pid) return;
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      setHot(false); setDragging(null);
      const cur = itemsRef.current;
      if (!ghost) {                                               // 탭: 넣은 감정은 빼고, 새 감정은 마음 자리에 쏙
        if (fromIdx != null) removeAt(fromIdx); else add(k, heartPos());
        return;
      }
      ghost.remove();
      const raw = u.type === 'pointercancel' ? null : toBox(u.clientX, u.clientY);
      const pos = raw && placeAt(raw, inside);
      const toHeart = !!pos && cur.length > 0 && inHeart(raw);
      if (fromIdx != null && fromIdx > 0 && toHeart) promote({ ...cur[fromIdx], ...pos });           // 몸에 넣은 감정을 마음 자리로 → 주인공
      else if (fromIdx == null && toHeart) { if (cur.length >= EMO_MAX) full(); else promote({ k, ...pos! }); }   // 새 감정을 마음 자리로 → 바로 주인공
      else if (fromIdx != null) {                                 // 몸 안에서 옮기기 — 밖으로 빼면 지우기
        if (pos) { setItems(cur.map((it, i) => (i === fromIdx ? { ...it, ...pos } : it))); setPop(fromIdx === 0 ? -1 : fromIdx); playSound('select'); }
        else removeAt(fromIdx);
      } else if (pos) add(k, pos);
      else playSound('wrong');
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };

  /** 눌러서 넣기: 고른 감정을 누른 자리에. 마음 자리를 누르면 고른 감정이 주인공 */
  const tapArea = (ev: React.MouseEvent) => {
    if (mode !== 'tap' || !picked) return;
    const raw = toBox(ev.clientX, ev.clientY);
    if (!raw) return;
    const pos = placeAt(raw, inside);
    if (items.length && inHeart(raw)) { if (items.length >= EMO_MAX) full(); else promote({ k: picked, ...pos }); }
    else add(picked, pos);
  };

  const setMode = (m: 'drag' | 'tap') => {
    if (!cls || m === mode) return;
    void saveClass({ ...cls, options: { ...cls.options, emoMode: m } });
    setPicked(null); playSound('select');
  };
  const done = () => {
    if (!items.length) return;
    const labels = [...new Set(items.map((it) => emotionOf(it.k)?.l))];
    update((r) => { r.emotions[student.id] = { items: compact(items) }; });
    playSound('save');
    toast(`${student.name}: ${labels.join(', ')}`, 'success');
    onClose();
  };

  const guide = mode === 'drag'
    ? (items.length >= 2 ? <>가장 큰 감정을 <b>가운데 동그라미</b>로 옮겨 보세요.</> : null)
    : picked ? <><b>{emotionOf(picked)?.l}</b>을(를) 넣을 곳을 사람 몸에서 눌러 보세요.</> : <>감정 친구를 <b>누르고</b>, 사람 몸을 눌러 넣어 보세요.</>;

  return (
    <Popup title={`💖 ${student.name}의 마음 일기`} large onClose={onClose}
      headerExtra={(
        <div className="mv-toggle emo-mode" role="group" aria-label="넣는 방식">
          <button className={mode === 'drag' ? 'on' : ''} aria-pressed={mode === 'drag'} onClick={() => setMode('drag')}><i className="ph-bold ph-hand-grabbing" /> 끌어서 넣기</button>
          <button className={mode === 'tap' ? 'on' : ''} aria-pressed={mode === 'tap'} onClick={() => setMode('tap')}><i className="ph-bold ph-hand-pointing" /> 눌러서 넣기</button>
        </div>
      )}>
      <div className={`emo-modal${mode === 'tap' ? ' mode-tap' : ''}`}>
        <div className="emo-palette">
          <div className="emo-pal-title"><span>❤️</span> 감정 친구들</div>
          <div className="emo-pal-grid">
            {EMOTIONS.map((e) => {
              const on = mode === 'tap' && picked === e.k;
              return (
                <button key={e.k} className={`emo-pal-item${on ? ' picked' : ''}${dragging === `pal-${e.k}` ? ' dragging' : ''}`} aria-label={e.l} aria-pressed={on}
                  onPointerDown={mode === 'drag' ? (ev) => startDrag(ev, e.k, null, `pal-${e.k}`) : undefined}
                  onClick={mode === 'tap' ? () => { const next = picked === e.k ? null : e.k; setPicked(next); playSound('select'); if (next) say(e.k); } : undefined}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); add(e.k, heartPos()); } }}>
                  <Blob k={e.k} /><span className="lb">{e.l}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="emo-center" ref={areaRef} onClick={tapArea}>
          <div className="emo-q handwriting">지금 내 마음속에는 어떤 감정이 있을까?</div>
          <div className="emo-fig-box">
            <div className={`emo-fig-wrap${hot ? ' hot' : ''}${mode === 'tap' && picked ? ' awaiting' : ''}`} ref={wrapRef}>
              {/* 주인공 감정이 바뀌면 사람 그림을 그 표정으로 바꾼다 (처음 그림에는 움직임을 넣지 않는다) */}
              <img key={pose} className={`emo-fig${poseChanged.current ? ' morph' : ''}`} src={pose} alt="" draggable={false} />
              <div className="emo-placed">
                {items.map((it, i) => {
                  const e = emotionOf(it.k);
                  const label = `${i === 0 ? '첫 감정 ' : ''}${e?.l} (${EMO_ZONES[it.zone] ?? ''}) 빼기`;
                  const common = {
                    'aria-label': label,
                    onPointerDown: mode === 'drag' ? (ev: React.PointerEvent) => startDrag(ev, it.k, i, `in-${i}`) : undefined,
                    // 감정을 골라 둔 상태면 넣기(바깥 칸의 누르기)로 넘긴다
                    onClick: mode === 'tap' ? (ev: React.MouseEvent) => { if (picked) return; ev.stopPropagation(); removeAt(i); } : undefined,
                    onKeyDown: (ev: React.KeyboardEvent) => { if (['Enter', ' ', 'Delete', 'Backspace'].includes(ev.key)) { ev.preventDefault(); removeAt(i); } },
                  };
                  // 첫 감정: 그림 속 셔츠에 감정 친구가 그려져 있으므로, 그 위에 투명한 누르는 자리만 둔다
                  return i === 0
                    ? <button key={`${it.k}-main`} className="emo-in main" style={{ left: `${EMO_PERSON.heart.x * 100}%`, top: `${EMO_PERSON.heart.y * 100}%` }} {...common} />
                    : <button key={`${it.k}-${i}`} className={`emo-in${i === pop ? ' pop' : ''}${dragging === `in-${i}` ? ' dragging' : ''}`} style={{ left: `${it.x * 100}%`, top: `${it.y * 100}%` }} {...common}><Blob k={it.k} /></button>;
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="emo-side">
          <div className="emo-guide handwriting">{guide}</div>
          <div className="emo-cloud handwriting">여러 감정이 함께 있을 수 있어요. <b>괜찮아요!</b></div>
          <div className="emo-actions">
            <button className="emo-reset" disabled={!items.length} onClick={() => { setItems([]); setPicked(null); setPop(-1); playSound('check'); }}><i className="ph-bold ph-arrow-counter-clockwise" /> 다시 하기</button>
            <button className="emo-done" disabled={!items.length} onClick={done}>완료하기 <i className="ph-bold ph-arrow-right" /></button>
          </div>
        </div>
      </div>
    </Popup>
  );
}

const manifest: FeatureManifest = { id: 'emotions', cards: [{ id: 'emotions', col: 2, order: 1, Component: EmotionsCard }] };
export default manifest;
