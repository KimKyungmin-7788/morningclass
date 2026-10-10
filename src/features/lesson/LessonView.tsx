import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useCurrentClass } from '@/core/data/store';
import { useDay, DAY_NAMES } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { holidayName } from '@/core/data/holidays';
import { levelSubjects } from '@/core/data/subjects';
import {
  LESSON_MODELS, LESSON_TEMPLATES, STEP_COLORS, duplicateLesson, fmtISO, groupByDate, modelName, newLesson, normalizeLesson,
  periodLabel, presentSteps, subjectColor, youtubeId, type Lesson, type LessonModel,
} from './model';

// 수업교실: 차시 목록(목록/달력) → 준비 모드(입력) → 발표 모드(학생용 전체 화면). 입력은 바꾸는 즉시 저장된다.

const Icon = ({ name, size = 22 }: { name: string; size?: number }) => <img className="lic" src={`/img/lesson/${name}.png`} style={{ width: size, height: size }} alt="" />;

export function LessonView() {
  const base = useDay((s) => s.date);
  const [raw, setRaw] = useKv<Lesson[]>('lessons', []);
  const lessons = useMemo(() => raw.map(normalizeLesson), [raw]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [month, setMonth] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const [selDay, setSelDay] = useState(fmtISO(base));
  const [editId, setEditId] = useState<string | null>(null);
  const [presentId, setPresentId] = useState<string | null>(null);

  const create = (date: string) => {
    const l = newLesson(date);
    setRaw([l, ...lessons]);
    setSelDay(date || selDay);
    setEditId(l.id);                                              // 만들면 바로 입력 화면으로
    toast('새 수업을 만들었어요', 'success');
  };
  const patch = (id: string, change: (l: Lesson) => Lesson) => setRaw(lessons.map((l) => (l.id === id ? change(l) : l)));
  const remove = (l: Lesson) => {
    if (!confirm(`'${l.title || '이 수업'}'을(를) 삭제할까요?`)) return;
    setRaw(lessons.filter((x) => x.id !== l.id));
    toast('삭제했어요', 'success');
  };
  const start = (l: Lesson) => {
    if (!presentSteps(l).length) { toast('먼저 수업 내용을 입력해 주세요 🧑‍🏫', 'error'); return; }
    ensureAudio(); setPresentId(l.id);
  };

  const editing = lessons.find((l) => l.id === editId);
  const presenting = lessons.find((l) => l.id === presentId);
  if (editing) return <Editor lesson={editing} patch={(fn) => patch(editing.id, fn)} onBack={() => setEditId(null)} />;

  const card = (l: Lesson) => (
    <div key={l.id} className={`lesson-card${l.draft ? ' is-draft' : ''}`}>
      <div className="lc-top">
        <span className="lc-subject">{l.subject || '과목 미정'}</span>
        {periodLabel(l.period) && <span className="lc-period">{periodLabel(l.period)}</span>}
        {l.draft && <span className="lc-draft">✎ 임시저장</span>}
        <span className="lc-model">{modelName(l.model)}</span>
      </div>
      <div className="lc-title">{l.title || '제목 없음'}</div>
      <div className="lc-unit">{l.unit}<span className="lc-date">📅 {l.date ? `${Number(l.date.slice(5, 7))}/${Number(l.date.slice(8, 10))}` : '미지정'}</span></div>
      <div className="lc-actions">
        <button className="lc-btn prepare" onClick={() => setEditId(l.id)}><Icon name="prep" size={16} /> 입력</button>
        <button className="lc-btn present" onClick={() => start(l)}><Icon name="present" size={16} /> 수업시작</button>
        <button className="lc-btn dup" aria-label="복사하기" title="복사하기" onClick={() => { setRaw([duplicateLesson(l), ...lessons]); toast('복사했어요. 입력에서 날짜를 바꿔 쓰세요', 'success'); }}><i className="ph-bold ph-copy" /></button>
        <button className="lc-btn del" aria-label="삭제" title="삭제" onClick={() => remove(l)}><i className="ph-bold ph-trash" /></button>
      </div>
    </div>
  );

  const list = () => {
    if (!lessons.length) return <div className="lesson-empty">아직 등록한 수업이 없어요.<br /><b>➕ 수업 등록</b>으로 시작해요 <Icon name="room" size={20} /></div>;
    return (
      <div className="lesson-listview">
        {groupByDate(lessons).map((g) => {
          const d = new Date(`${g.key}T00:00:00`);
          const label = g.key === '미지정' ? '🗂️ 미지정 보관함' : `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}. (${DAY_NAMES[d.getDay()]})`;
          return <div key={g.key} className="lesson-group"><div className="lg-title">{label} <span>{g.items.length}개</span></div><div className="lesson-list">{g.items.map(card)}</div></div>;
        })}
      </div>
    );
  };

  const calendar = () => {
    const { y, m } = month;
    const startDow = new Date(y, m, 1).getDay();
    const last = new Date(y, m + 1, 0).getDate();
    const iso = (c: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(c).padStart(2, '0')}`;
    const cells: (number | null)[] = [...Array<null>(startDow).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
    const selLessons = lessons.filter((l) => l.date === selDay);
    const undated = lessons.filter((l) => !l.date);
    const sd = new Date(`${selDay}T00:00:00`);
    const step = (d: number) => setMonth(() => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
    return (
      <>
        <div className="lcal">
          <div className="lcal-head"><button aria-label="이전 달" onClick={() => step(-1)}>‹</button><span>{y}년 {m + 1}월</span><button aria-label="다음 달" onClick={() => step(1)}>›</button></div>
          <div className="lcal-grid">
            {DAY_NAMES.map((n, i) => <div key={n} className="lcal-dow" style={{ color: i === 0 ? 'var(--acc-coral)' : i === 6 ? 'var(--acc-sky)' : 'var(--text-sub)' }}>{n}</div>)}
            {cells.map((c, i) => {
              if (c == null) return <div key={`e${i}`} className="lcal-empty" />;
              const dt = new Date(y, m, c);
              const dow = dt.getDay();
              const day = iso(c);
              const ls = lessons.filter((l) => l.date === day);
              const cls = ['lcal-day', day === selDay ? 'sel' : '', dow === 0 ? 'sun' : '', dow === 6 ? 'sat' : '', holidayName(dt) ? 'hol' : ''].filter(Boolean).join(' ');
              return (
                <div key={c} className={cls} role="button" tabIndex={0} aria-pressed={day === selDay} onClick={() => setSelDay(day)} onKeyDown={(e) => { if (e.key === 'Enter') setSelDay(day); }}>
                  <span className="lcal-num">{c}</span>
                  {ls.length > 0 && <span className="lcal-dots">{ls.slice(0, 4).map((l) => <span key={l.id} className="lcal-dot" style={{ background: subjectColor(l.subject) }} />)}</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="lcal-daypanel">
          <div className="lcal-daytitle">{sd.getMonth() + 1}월 {sd.getDate()}일 ({DAY_NAMES[sd.getDay()]})의 수업 <span>{selLessons.length}개</span></div>
          {selLessons.length ? <div className="lesson-list">{selLessons.map(card)}</div> : <div className="lcal-dayempty">이 날 등록된 수업이 없어요</div>}
          <button className="lesson-newday-btn" onClick={() => create(selDay)}>➕ 이 날 수업 등록</button>
        </div>
        {undated.length > 0 && <div className="lesson-group"><div className="lg-title">🗂️ 미지정 보관함 <span>{undated.length}개</span></div><div className="lesson-list">{undated.map(card)}</div></div>}
      </>
    );
  };

  return (
    <>
      <div className="lesson-hero">
        <h2><Icon name="room" size={34} /> 수업교실</h2>
        <div className="lesson-hero-bar">
          <div className="lesson-viewtog">
            <button className={`lvt-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>📋 목록</button>
            <button className={`lvt-btn${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>📅 달력</button>
          </div>
          <button className="lesson-new-btn" onClick={() => create(fmtISO(base))}>➕ 수업 등록</button>
        </div>
      </div>
      {view === 'calendar' ? calendar() : list()}
      {presenting && <Present lesson={presenting} onClose={() => setPresentId(null)} />}
    </>
  );
}

/** 준비 모드 (차시 입력). 입력하는 대로 저장되고, '완료'를 누르면 임시저장 표시가 빠진다 */
function Editor({ lesson: l, patch, onBack }: { lesson: Lesson; patch: (fn: (l: Lesson) => Lesson) => void; onBack: () => void }) {
  const cls = useCurrentClass();
  const [mat, setMat] = useState('');
  const set = (p: Partial<Lesson>) => patch((x) => ({ ...x, ...p }));
  const subjects = levelSubjects(cls);                           // 학급 과정(초·중·고)에 맞는 교과
  const vid = youtubeId(l.think.url);
  const lines = (key: 'objectives' | 'activity', placeholder: (i: number) => string) => (
    <>
      <div>
        {l[key].map((v, i) => (
          <div key={i} className="le-line">
            <span className="le-num">{i + 1}</span>
            <input value={v} placeholder={placeholder(i)} onChange={(e) => set({ [key]: l[key].map((x, k) => (k === i ? e.target.value : x)) })} />
            <button className="le-line-del" aria-label="삭제" onClick={() => { const next = l[key].filter((_, k) => k !== i); set({ [key]: next.length ? next : [''] }); }}>✕</button>
          </div>
        ))}
      </div>
      <button className="le-add" onClick={() => set({ [key]: [...l[key], ''] })}>+ {key === 'objectives' ? '목표' : '활동'} 추가</button>
    </>
  );

  return (
    <div className="lesson-editor">
      <div className="le-bar">
        <button className="le-back" onClick={onBack}><i className="ph-bold ph-arrow-left" /> 수업 목록</button>
        <span className="le-title-txt"><Icon name="prepTitle" size={24} /> 수업 입력{l.draft && <span className="le-draft-tag">임시저장</span>}</span>
        <button className="le-done" onClick={() => { set({ draft: false }); playSound('save'); toast('저장했어요 ✅', 'success'); onBack(); }}>✅ 완료</button>
      </div>
      <div className="le-basic">
        <select id="le-subject" aria-label="과목" value={l.subject} onChange={(e) => set({ subject: e.target.value })}>
          <option value="">과목 선택</option>
          {subjects.map((s) => <option key={s}>{s}</option>)}
          {l.subject && !subjects.includes(l.subject) && <option>{l.subject}</option>}
        </select>
        <input placeholder="단원 (예: 3단원 나의 미래)" aria-label="단원" value={l.unit} onChange={(e) => set({ unit: e.target.value })} />
        <input placeholder="수업 주제" aria-label="수업 주제" value={l.title} onChange={(e) => set({ title: e.target.value })} />
        <input className="le-period" placeholder="차시(선택)" aria-label="차시" value={l.period ?? ''} onChange={(e) => set({ period: e.target.value })} />
        <select aria-label="수업 모형" value={l.model} onChange={(e) => set({ model: e.target.value as LessonModel })}>
          {Object.entries(LESSON_MODELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="le-tpl-btn" onClick={() => {
          const t = LESSON_TEMPLATES[l.model];
          if (!confirm(`'${modelName(l.model)}' 모형 예시로 학습목표·오늘의 활동을 채울까요? (기존 내용은 덮어써요)`)) return;
          set({ objectives: [...t.objectives], activity: [...t.activity] });
          toast('예시를 넣었어요 ✨', 'success');
        }}>✨ 이 모형 예시 넣기</button>
        <div className="le-date-row">
          <span className="le-date-lbl">📅 수업 날짜</span>
          <input type="date" aria-label="수업 날짜" value={l.date} onChange={(e) => set({ date: e.target.value })} />
          <button className="le-date-clear" title="날짜 비우기(보관함)" onClick={() => set({ date: '' })}>비우기</button>
        </div>
      </div>
      <div className="le-card">
        <div className="le-card-h"><Icon name="think" size={24} /> 생각열기 <span className="le-card-sub">영상 링크와 질문을 입력하세요</span></div>
        <input placeholder="영상 링크 (유튜브 등, 비워도 됨)" aria-label="생각열기 영상 링크" value={l.think.url} onChange={(e) => set({ think: { ...l.think, url: e.target.value } })} />
        {vid && <img className="le-thumb" src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt="영상 미리보기" />}
        <textarea placeholder="생각 여는 질문 (예: 이 영상에서 무엇을 보았나요?)" aria-label="생각 여는 질문" value={l.think.question} onChange={(e) => set({ think: { ...l.think, question: e.target.value } })} />
      </div>
      <div className="le-card">
        <div className="le-card-h"><Icon name="review" size={24} /> 전시학습 상기 <span className="le-card-sub">지난 시간 떠올리기 · 링크 첨부 가능</span></div>
        <input placeholder="링크 (영상·웹사이트 등, 선택)" aria-label="전시학습 링크" value={l.reviewUrl ?? ''} onChange={(e) => set({ reviewUrl: e.target.value })} />
        <textarea placeholder="지난 시간에 배운 핵심이나 확인 질문" aria-label="전시학습 내용" value={l.review} onChange={(e) => set({ review: e.target.value })} />
      </div>
      <div className="le-card">
        <div className="le-card-h"><Icon name="objective" size={24} /> 학습목표 <span className="le-card-sub">'~할 수 있다'로</span></div>
        {lines('objectives', () => '~할 수 있다')}
      </div>
      <div className="le-card">
        <div className="le-card-h"><Icon name="materials" size={24} /> 준비물 <span className="le-card-sub">입력 후 엔터로 추가</span></div>
        <div className="le-chips">{l.materials.map((m, i) => <span key={`${m}-${i}`} className="le-chip">{m}<button aria-label="삭제" onClick={() => set({ materials: l.materials.filter((_, k) => k !== i) })}>✕</button></span>)}</div>
        <input placeholder="준비물 입력 후 엔터 ⏎" aria-label="준비물" autoComplete="off" value={mat} onChange={(e) => setMat(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); if (mat.trim()) { set({ materials: [...l.materials, mat.trim()] }); setMat(''); } } }} />
      </div>
      <div className="le-card">
        <div className="le-card-h"><Icon name="activity" size={24} /> 오늘의 활동 <span className="le-card-sub">전개 순서 미리보기</span></div>
        {lines('activity', (i) => `활동 ${i + 1}`)}
      </div>
    </div>
  );
}

/** 발표 모드: 학생용 전체 화면. ← → 로 넘기고, 마지막에서 '시작!'을 누르면 닫힌다 */
function Present({ lesson: l, onClose }: { lesson: Lesson; onClose: () => void }) {
  const steps = useMemo(() => presentSteps(l), [l]);
  const [i, setI] = useState(0);
  const s = steps[Math.min(i, steps.length - 1)];
  const color = STEP_COLORS[s.kind];
  const filled = (list: string[]) => list.filter((x) => x.trim());
  const stopSpeech = () => { try { window.speechSynthesis.cancel(); } catch { /* 음성을 지원하지 않는 기기 */ } };
  const go = (d: number) => {
    if (d > 0 && i === steps.length - 1) { stopSpeech(); onClose(); return; }   // 마지막 → 시작(닫기)
    const ni = Math.max(0, Math.min(steps.length - 1, i + d));
    if (ni !== i) { setI(ni); playSound('select'); stopSpeech(); }              // 단계를 넘기면 이전 낭독만 멈춘다 (자동 낭독은 하지 않음)
  };
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; stopSpeech(); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { stopSpeech(); onClose(); } else if (e.key === 'ArrowRight' || e.key === ' ') go(1); else if (e.key === 'ArrowLeft') go(-1); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  const video = (url: string | undefined) => youtubeId(url) && (
    <div className="lp-video"><iframe title="영상" src={`https://www.youtube-nocookie.com/embed/${youtubeId(url)}?rel=0`} allow="encrypted-media; fullscreen" allowFullScreen /></div>
  );
  const reviewUrl = (l.reviewUrl ?? '').trim();
  const body = {
    think: () => <>{video(l.think.url)}{l.think.question.trim() && <div className="lp-question">{l.think.question.trim()}</div>}</>,
    review: () => (
      <>
        {video(reviewUrl)}
        {l.review.trim() && <div className="lp-review" style={{ whiteSpace: 'pre-wrap' }}>{l.review}</div>}
        {reviewUrl && !youtubeId(reviewUrl) && /^https?:\/\//i.test(reviewUrl) && <a className="lp-link" href={reviewUrl} target="_blank" rel="noopener noreferrer">🔗 링크 열기</a>}
      </>
    ),
    obj: () => <div className="lp-obj">{filled(l.objectives).map((o, k) => <div key={k} className="lp-objcard"><span className="lp-objnum">{k + 1}</span><span className="lp-objtext">{o}</span></div>)}</div>,
    mat: () => <div className="lp-chips">{filled(l.materials).map((m, k) => <span key={k} className="lp-chip"><i className="ph-fill ph-check-circle" />{m}</span>)}</div>,
    act: () => <div className="lp-flow">{filled(l.activity).map((a, k) => <span key={k} style={{ display: 'contents' }}>{k > 0 && <span className="lp-flow-arrow">›</span>}<div className="lp-flow-card"><span className="lp-flow-num">{k + 1}</span><span className="lp-flow-text">{a}</span></div></span>)}</div>,
  }[s.kind];

  return createPortal(
    <div id="lesson-present">
      <div className="lp-top">
        <div className="lp-meta"><span className="lp-subject">{l.subject || '수업'}</span>{periodLabel(l.period) && `${periodLabel(l.period)} · `}{l.unit}{l.unit && ' · '}{l.title}</div>
        <div className="lp-rail">{steps.map((st, k) => <span key={st.kind} className={`lp-dot${k === i ? ' active' : ''}${k < i ? ' done' : ''}`}><i><Icon name={st.icon} size={24} /></i><b>{st.short}</b></span>)}</div>
        <button className="lp-close" aria-label="닫기" onClick={() => { stopSpeech(); onClose(); }}>✕</button>
      </div>
      <div className="lp-stage">
        <div className="lp-band" style={{ background: color.bg, color: color.c }}><Icon name={s.icon} size={34} /> {s.title}</div>
        <div className="lp-body" style={{ '--step': color.c, '--step-bg': color.bg } as React.CSSProperties}>{body()}</div>
      </div>
      <div className="lp-nav">
        <button disabled={i === 0} onClick={() => go(-1)}>‹ 이전</button>
        <span className="lp-progress">{i + 1} / {steps.length}</span>
        <button onClick={() => speak(s.speak)}>🔊 읽어주기</button>
        <button onClick={() => go(1)}>{i === steps.length - 1 ? '✅ 시작!' : '다음 ›'}</button>
      </div>
    </div>,
    document.body,
  );
}
