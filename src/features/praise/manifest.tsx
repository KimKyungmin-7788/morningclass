import { useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact } from '@/core/ui/slot';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { makeGate, type Gate } from '@/core/gate';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import {
  PRAISE_SHAPES, PRAISE_SIZES, REASON_MAX, REWARD_MAX, claimReward, clusterRows, givePraise, isFull, praiseConfigOf, tallyOf, undoPraise,
} from '@/core/data/praise';
import type { PraiseConfig, PraiseLog, Student } from '@/core/data/types';
import type { CardProps, FeatureManifest } from '../types';

// 칭찬판: 학생마다 자기 판(포도 · 나무 · 별)을 칭찬 스티커로 채우고, 다 채우면 보상을 고른다.
// 스티커는 선생님만 준다 — 주기 전에 곱셈 문제로 확인하고, 한 번 맞히면 잠시 동안은 다시 묻지 않는다.
// (1인 1역할 "했어요"에 자동으로 주는 것은 설정에서 켠다.)

const TITLE = { icon: 'ph-fill ph-seal-check', tint: '#f3e8ff', color: '#7e22ce' };
/** 확인 문제를 맞힌 뒤 다시 묻지 않는 시간(ms) */
const UNLOCK_MS = 5 * 60 * 1000;
let unlockedUntil = 0;
const iconOf = (shape: PraiseConfig['shape']) => PRAISE_SHAPES.find((s) => s.id === shape)?.icon ?? '🍇';

/** 포도알 그림: 빈자리 하나와 색이 다른 알 네 가지 (public/img/praise). 알마다 색을 섞어 송이가 단조롭지 않게 한다 */
const GRAPE_EMPTY = '/img/praise/grape-empty.webp';
const GRAPE_COLORS = [1, 2, 1, 3, 2, 1, 4, 1, 3, 2];
const grapeSrc = (i: number) => `/img/praise/grape-sticker-${GRAPE_COLORS[i % GRAPE_COLORS.length]}.webp`;
/** 큰 포도판에서 송이가 덩굴 틀 안에 꼭 맞는 알 크기 (틀 너비 = 100cqw 기준) */
const grapeFit = (size: number) => { const rows = clusterRows(size); return `${Math.min(62 / rows[0], 66 / (rows.length * 0.86 + 0.14)).toFixed(2)}cqw`; };

/** 판 하나: 모양에 맞춰 칸을 늘어놓고 모은 만큼 채운다 */
function Board({ shape, size, now, d }: { shape: PraiseConfig['shape']; size: number; now: number; d?: string }) {
  const dot = (i: number) => <i key={i} className={i < now ? 'on' : ''} />;
  if (shape === 'grape') {
    let k = 0;
    const grape = (i: number) => <img key={i} className={i < now ? 'on' : ''} src={i < now ? grapeSrc(i) : GRAPE_EMPTY} alt="" draggable={false} />;
    return (
      <div className="pr-board grape" role="img" aria-label={`${size}칸 중 ${Math.min(now, size)}칸`} style={d ? ({ '--d': d } as React.CSSProperties) : undefined}>
        {clusterRows(size).map((w, r) => <div key={r}>{Array.from({ length: w }, () => grape(k++))}</div>)}
      </div>
    );
  }
  return (
    <div className={`pr-board ${shape}`} role="img" aria-label={`${size}칸 중 ${Math.min(now, size)}칸`}>
      <div className="pr-dots">{Array.from({ length: size }, (_, i) => dot(i))}</div>
      {shape === 'tree' && <span className="pr-trunk" aria-hidden="true" />}
    </div>
  );
}

/** 설정에서 눌러 넣는 예시 */
const REASON_IDEAS = ['바르게 앉기', '친구 돕기', '스스로 하기', '차례 지키기', '정리 정돈', '고운 말 쓰기', '인사 잘하기', '끝까지 하기'];
const REWARD_IDEAS = ['자유 시간 10분', '좋아하는 활동 고르기', '간식 고르기', '자리 고르기', '선생님 도우미 하기', '영상 한 편 보기'];
const SIZE_HELP: Record<number, [string, string]> = { 10: ['빨리 채워요', '처음 시작할 때 · 어려운 목표'], 20: ['보통이에요', '2~3주에 한 판'], 30: ['오래 모아요', '익숙해진 뒤에'] };

/** 설정의 한 단계: 번호 · 제목 · 한 줄 설명 */
function Step({ n, title, help, children }: { n: number; title: string; help: string; children: React.ReactNode }) {
  return (
    <section className="ps-step">
      <header><span>{n}</span><div><h3>{title}</h3><p>{help}</p></div></header>
      {children}
    </section>
  );
}

/** 적어 넣는 목록(칭찬 이유 · 보상): 번호가 붙은 칸에 적거나, 아래 예시를 눌러서 넣는다 */
function IdeaList({ values, max, ideas, placeholder, onChange }: { values: string[]; max: number; ideas: string[]; placeholder: string; onChange: (v: string[]) => void }) {
  const left = max - values.length;
  const unused = ideas.filter((x) => !values.some((v) => v.trim() === x));
  return (
    <div className="ps-list">
      {values.map((v, i) => (
        <div key={i} className="ps-item">
          <b>{i + 1}</b>
          <input value={v} maxLength={20} placeholder={placeholder} aria-label={`${i + 1}번째`} onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))} />
          <button type="button" aria-label={`${v || `${i + 1}번째`} 지우기`} onClick={() => onChange(values.filter((_, j) => j !== i))}><i className="ph-bold ph-x" /></button>
        </div>
      ))}
      {left > 0 ? (
        <div className="ps-ideas">
          <button type="button" className="write" onClick={() => onChange([...values, ''])}><i className="ph-bold ph-pencil-simple" /> 직접 쓰기</button>
          {unused.map((x) => <button key={x} type="button" onClick={() => { onChange([...values, x]); playSound('select'); }}>＋ {x}</button>)}
          <small>{left}개 더 넣을 수 있어요</small>
        </div>
      ) : <div className="ps-full">{max}개를 다 채웠어요. 바꾸려면 하나를 지워 주세요.</div>}
    </div>
  );
}

/** 칭찬판 설정 (선생님): 모양 → 칸 수 → 칭찬 이유 → 보상 → 1인 1역할 연결 순서로 고른다 */
function PraiseSetup({ initial, hasRoles, onSave, onBack }: { initial: PraiseConfig; hasRoles: boolean; onSave: (c: PraiseConfig) => void; onBack: () => void }) {
  const [c, setC] = useState<PraiseConfig>({ ...initial, reasons: [...initial.reasons], rewards: [...initial.rewards] });
  const reasons = c.reasons.map((x) => x.trim()).filter(Boolean);
  const rewards = c.rewards.map((x) => x.trim()).filter(Boolean);
  const shape = PRAISE_SHAPES.find((x) => x.id === c.shape)!;
  return (
    <div className="ps">
      <div className="ps-cols">
        <div className="ps-col">
          <Step n={1} title="판 모양" help="학생마다 이 모양의 판을 하나씩 채워요">
            <div className="ps-tiles shapes">
              {PRAISE_SHAPES.map((x) => (
                <button key={x.id} type="button" className={c.shape === x.id ? 'on' : ''} aria-pressed={c.shape === x.id} onClick={() => { setC({ ...c, shape: x.id }); playSound('select'); }}>
                  <span className="ps-pic"><Board shape={x.id} size={10} now={6} /></span>
                  <b>{x.label}</b>
                </button>
              ))}
            </div>
          </Step>
          <Step n={2} title="한 판의 칸 수" help="칸이 적을수록 보상을 빨리 받아요">
            <div className="ps-tiles sizes">
              {PRAISE_SIZES.map((n) => (
                <button key={n} type="button" className={c.size === n ? 'on' : ''} aria-pressed={c.size === n} onClick={() => { setC({ ...c, size: n }); playSound('select'); }}>
                  <b>{n}<small>칸</small></b><span>{SIZE_HELP[n]?.[0]}</span><em>{SIZE_HELP[n]?.[1]}</em>
                </button>
              ))}
            </div>
          </Step>
          <Step n={5} title="1인 1역할과 이어 주기" help="학생이 역할을 하고 ‘오늘 했어요’를 누르면 스티커를 하나 줘요">
            <button type="button" className={`ps-switch${c.autoRole ? ' on' : ''}`} role="switch" aria-checked={c.autoRole} onClick={() => { setC({ ...c, autoRole: !c.autoRole }); playSound('select'); }}>
              <i /><span><b>{c.autoRole ? '자동으로 줘요' : '주지 않아요'}</b><small>{c.autoRole ? '이 스티커만은 선생님 확인 없이 학생이 받아요' : '스티커는 선생님만 줄 수 있어요'}{!hasRoles && ' · 아직 정한 역할이 없어요'}</small></span>
            </button>
          </Step>
        </div>
        <div className="ps-col">
          <Step n={3} title="칭찬하는 이유" help={`${REASON_MAX}개까지 · 적고 분명할수록 학생이 알기 쉬워요`}>
            <IdeaList values={c.reasons} max={REASON_MAX} ideas={REASON_IDEAS} placeholder="예: 바르게 앉기" onChange={(v) => setC({ ...c, reasons: v })} />
          </Step>
          <Step n={4} title="판을 다 채우면 받는 보상" help={`${REWARD_MAX}개까지 · 다 채운 학생이 이 중에서 하나를 골라요`}>
            <IdeaList values={c.rewards} max={REWARD_MAX} ideas={REWARD_IDEAS} placeholder="예: 자유 시간 10분" onChange={(v) => setC({ ...c, rewards: v })} />
          </Step>
        </div>
      </div>
      <div className="ps-summary" aria-live="polite">
        <b>{shape.icon} {shape.label} {c.size}칸</b>
        <span>칭찬 이유 {reasons.length ? reasons.join(' · ') : '없음 (‘칭찬해요’ 하나로 줘요)'}</span>
        <span>보상 {rewards.length ? rewards.join(' · ') : '없음 (‘보상 받기’ 하나로 나와요)'}</span>
      </div>
      <PopupActions>
        <button className="btn-cancel" onClick={onBack}>취소</button>
        <button className="btn-save" onClick={() => onSave({ ...c, reasons, rewards })}>💾 저장</button>
      </PopupActions>
    </div>
  );
}

function PraiseCard({ size }: CardProps) {
  const cls = useCurrentClass();
  const today = useDay((s) => s.record.praise) ?? [];
  const [view, setView] = useState<null | 'board' | 'setup'>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [gate, setGate] = useState<{ q: Gate; then: () => void } | null>(null);
  const [last, setLast] = useState<PraiseLog | null>(null);
  const students = activeStudents(cls);
  const cfg = praiseConfigOf(cls);
  const tally = cls?.options.praiseTally;
  const icon = iconOf(cfg.shape);
  const full = students.filter((s) => isFull(tally, s.id, cfg.size));
  const todayOf = (id: string) => today.filter((p) => p.s === id).length;

  /** 선생님만 할 수 있는 일: 확인 문제를 맞힌 뒤에 한다 (맞히고 나면 잠시 동안은 바로 한다) */
  const asTeacher = (then: () => void) => { if (Date.now() < unlockedUntil) then(); else setGate({ q: makeGate(), then }); };
  const answer = (n: number) => {
    if (!gate) return;
    if (n !== gate.q.answer) { playSound('wrong'); toast('답이 달라요. 다시 눌러 주세요'); setGate(null); return; }
    unlockedUntil = Date.now() + UNLOCK_MS;
    playSound('correct');
    const { then } = gate;
    setGate(null);
    then();
  };
  const give = (s: Student, reason: string) => asTeacher(() => {
    ensureAudio();
    setLast(givePraise(s.id, reason));
    playSound('sparkle');
    speak(`${s.name}, ${reason}! 칭찬해요!`);
  });
  const claim = (s: Student, reward: string) => asTeacher(() => {
    claimReward(s.id, reward);
    setLast(null);
    playSound('complete');
    speak(`${s.name}, 칭찬판을 다 채웠어요! 축하해요!`);
    toast(`${s.name} — ${reward} 🎉`, 'success');
  });
  const save = (next: PraiseConfig) => {
    const now = useData.getState().classes.find((c) => c.id === cls?.id);
    if (now) void useData.getState().saveClass({ ...now, options: { ...now.options, praise: next } });
    playSound('save'); toast('칭찬판을 저장했어요', 'success');
    setView('board');
  };
  const open = () => { ensureAudio(); playSound('select'); setGate(null); setView('board'); };
  const status = !students.length ? '학생을 등록해 주세요' : full.length ? `${full.map((s) => s.name).join(', ')} 완성! 🎉` : `오늘 칭찬 ${today.length}개`;
  /** 아래에 크게 보여 줄 학생 (고르지 않았으면 첫 학생) */
  const shown = students.find((s) => s.id === picked) ?? students[0];

  return (
    <>
      <CardFrame id="praise" label="칭찬판" state={today.length ? 'filled' : 'empty'} onOpen={students.length ? open : undefined}>
        {isCompact(size) ? <CardCompact {...TITLE} title="칭찬판" done={full.length > 0}>{status}</CardCompact>
          : !students.length ? <><CardTitle {...TITLE}>칭찬판</CardTitle><div className="card-hint">⚙️ 설정에서 학생을 등록해 주세요</div></>
          : size === 'large' ? <>
            <CardTitle {...TITLE}>칭찬판</CardTitle>
            <div className="pr-grid">
              {students.map((s) => (
                <div key={s.id} className={`pr-tile${isFull(tally, s.id, cfg.size) ? ' full' : ''}`}>
                  <Board shape={cfg.shape} size={cfg.size} now={tallyOf(tally, s.id).now} />
                  <b>{s.name}</b><small>{Math.min(tallyOf(tally, s.id).now, cfg.size)}/{cfg.size}</small>
                </div>
              ))}
            </div>
            <div className="v3-sub">{status}</div>
          </> : <>
            <CardTitle {...TITLE}>칭찬판</CardTitle>
            <div className="pr-mini">
              {students.map((s) => {
                const now = Math.min(tallyOf(tally, s.id).now, cfg.size);
                return <div key={s.id}><span>{s.name}</span><i><b style={{ width: `${(now / cfg.size) * 100}%` }} /></i><em>{now}</em></div>;
              })}
            </div>
            <div className="v3-sub">{icon} {status}</div>
          </>}
      </CardFrame>

      {view === 'board' && (
        <Popup title={`${icon} 칭찬판`} large onClose={() => setView(null)}
          headerExtra={<button className="wd-setup-btn" onClick={() => asTeacher(() => setView('setup'))}><i className="ph-bold ph-sliders-horizontal" /> 칭찬판 설정</button>}>
          <div className="pr-window">
            {/* 위: 학생과 칭찬 수를 간단히. 누르면 아래에 그 학생의 칭찬판이 크게 나온다 */}
            <div className="pr-strip" role="tablist" aria-label="학생 고르기">
              {students.map((s) => {
                const t = tallyOf(tally, s.id);
                const done = isFull(tally, s.id, cfg.size);
                return (
                  <button key={s.id} type="button" role="tab" aria-selected={shown?.id === s.id} className={`pr-chip${shown?.id === s.id ? ' on' : ''}${done ? ' full' : ''}`}
                    onClick={() => { playSound('select'); setPicked(s.id); setGate(null); }}>
                    <b>{s.name}</b>
                    <span>{icon} {Math.min(t.now, cfg.size)}<small>/{cfg.size}</small></span>
                    {done ? <em>완성 🎉</em> : todayOf(s.id) > 0 ? <em>오늘 +{todayOf(s.id)}</em> : t.boards > 0 ? <em>🏆 {t.boards}</em> : null}
                  </button>
                );
              })}
            </div>
            {shown && (() => {
              const t = tallyOf(tally, shown.id);
              const done = isFull(tally, shown.id, cfg.size);
              return (
                <div className={`pr-stage ${cfg.shape}${done ? ' full' : ''}`} role="tabpanel">
                  {cfg.shape === 'grape' ? (
                    // 포도: 덩굴 틀 그림 위에 송이를 올리고, 팻말에 학생 이름을 적는다
                    <div className="pr-art">
                      <img className="pr-art-bg" src="/img/praise/grape-bg.webp" alt="" draggable={false} />
                      <div className="pr-art-sign">{shown.name}</div>
                      <div className="pr-art-fill"><Board shape="grape" size={cfg.size} now={t.now} d={grapeFit(cfg.size)} /></div>
                    </div>
                  ) : <div className={`pr-stage-board n${cfg.size}`}><Board shape={cfg.shape} size={cfg.size} now={t.now} /></div>}
                  <div className="pr-stage-side">
                    <div className="pr-stage-name">{shown.name}</div>
                    <div className="pr-stage-count"><b>{Math.min(t.now, cfg.size)}</b> / {cfg.size}{t.boards > 0 && <span>🏆 완성한 판 {t.boards}개</span>}</div>
                    {gate ? (
                      <div className="pr-gate" role="group" aria-label="선생님 확인 문제">
                        <span><i className="ph-fill ph-lock-key" /> 선생님 확인</span>
                        <b aria-live="polite">{gate.q.a} × {gate.q.b} = ?</b>
                        <div>{gate.q.choices.map((n) => <button key={n} type="button" className="lay-btn num" onClick={() => answer(n)}>{n}</button>)}</div>
                        <button type="button" className="lay-btn" onClick={() => setGate(null)}>취소</button>
                      </div>
                    ) : done ? (
                      <div className="pr-reward">
                        <span>🎉 다 채웠어요! 보상을 골라요</span>
                        {(cfg.rewards.length ? cfg.rewards : ['보상 받기']).map((r) => <button key={r} type="button" onClick={() => claim(shown, r)}>{r}</button>)}
                      </div>
                    ) : (
                      <div className="pr-give">
                        <span>무엇을 칭찬할까요? <small>스티커는 선생님만 줄 수 있어요</small></span>
                        <div>{(cfg.reasons.length ? cfg.reasons : ['칭찬해요']).map((r) => <button key={r} type="button" onClick={() => give(shown, r)}>{icon} {r}</button>)}</div>
                      </div>
                    )}
                    {last && last.s === shown.id && !gate && (
                      <button type="button" className="pr-undo" onClick={() => { undoPraise(last.id); setLast(null); playSound('select'); toast('방금 준 스티커를 되돌렸어요'); }}>↩ 방금 준 것 취소</button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </Popup>
      )}
      {view === 'setup' && (
        <Popup title="⚙️ 칭찬판 설정" large onClose={() => setView(null)}>
          <PraiseSetup initial={cfg} hasRoles={!!cls?.options.roles?.length} onSave={save} onBack={() => setView('board')} />
        </Popup>
      )}
    </>
  );
}

const manifest: FeatureManifest = { id: 'praise', cards: [{ id: 'praise', title: '칭찬판', ...TITLE, Component: PraiseCard }] };
export default manifest;
