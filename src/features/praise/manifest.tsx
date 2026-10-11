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
  OWN_REASON_MAX, OWN_REWARD_MAX, PRAISE_SHAPES, PRAISE_SIZES, REASON_MAX, REWARD_MAX,
  claimReward, cleanOwn, clusterRows, givePraise, isFull, praiseConfigOf, reasonCounts, reasonsFor, rewardsFor, tallyOf, undoPraise,
} from '@/core/data/praise';
import type { PraiseConfig, PraiseLog, PraiseOwn, Student } from '@/core/data/types';
import { recordsOf } from '@/core/data/backupActions';
import type { CardProps, FeatureManifest } from '../types';
import { certFileName, downloadCanvas, drawCertificate, printImage, type CertData } from './certificate';

// 칭찬판: 학생마다 자기 판(포도 · 나무 · 별)을 칭찬 스티커로 채우고, 다 채우면 보상을 고른다.
// 스티커는 선생님만 준다 — 주기 전에 곱셈 문제로 확인하고, 한 번 맞히면 잠시 동안은 다시 묻지 않는다.
// (1인 1역할 "했어요"에 자동으로 주는 것은 설정에서 켠다.)

const TITLE = { icon: 'ph-fill ph-seal-check', tint: '#f3e8ff', color: '#7e22ce' };
/** 확인 문제를 맞힌 뒤 다시 묻지 않는 시간(ms) */
const UNLOCK_MS = 5 * 60 * 1000;
let unlockedUntil = 0;
const iconOf = (shape: PraiseConfig['shape']) => PRAISE_SHAPES.find((s) => s.id === shape)?.icon ?? '🍇';

/** 줄별 칸 수를 가운데가 넓게 나눈다 (별 판: 별 모양 틀 안의 밤하늘, 나무 판: 둥근 나무 머리에 맞춘 배치). 예: 10 → 3·4·3, 20 → 4·6·6·4 */
function midRows(n: number): number[] {
  const count = n <= 12 ? 3 : n <= 24 ? 4 : 5;
  const weights = Array.from({ length: count }, (_, i) => 1 + 0.5 * Math.sin(((i + 0.5) / count) * Math.PI));
  const total = weights.reduce((a, b) => a + b, 0);
  const rows = weights.map((w) => Math.floor((w / total) * n));
  // 남는 칸은 가운데 줄부터 위아래로 번갈아 더한다
  const order = weights.map((_, i) => i).sort((x, y) => Math.abs(x - (count - 1) / 2) - Math.abs(y - (count - 1) / 2) || x - y);
  for (let left = n - rows.reduce((a, b) => a + b, 0), k = 0; left > 0; left -= 1, k += 1) rows[order[k % count]] += 1;
  return rows;
}

/**
 * 받은 그림으로 그리는 판 (public/img/praise): 틀 그림 + 빈자리 하나 + 색이 다른 스티커 네 가지.
 * rows = 줄별 칸 수, area = 틀 안에서 스티커가 놓이는 자리의 너비 · 높이(틀 너비 = 100), colors = 스티커 색을 섞는 순서
 */
const ART: Partial<Record<PraiseConfig['shape'], { rows: (n: number) => number[]; area: [number, number]; pitch: number; colors: number[] }>> = {
  grape: { rows: clusterRows, area: [62, 66], pitch: 0.86, colors: [1, 2, 1, 3, 2, 1, 4, 1, 3, 2] },
  star: { rows: midRows, area: [60, 49], pitch: 1, colors: [1, 2, 1, 3, 1, 4, 1, 2, 3, 1] },
  // 나무: 잎(연두 · 초록)을 주로, 사이사이 꽃과 사과
  tree: { rows: midRows, area: [64, 35], pitch: 0.92, colors: [1, 2, 1, 3, 2, 1, 4, 1, 2, 3] },
};
/** 큰 판에서 스티커가 틀 안에 꼭 맞는 크기 (틀 너비 = 100cqw 기준) */
function artFit(shape: PraiseConfig['shape'], size: number): string {
  const art = ART[shape]!;
  const rows = art.rows(size);
  return `${Math.min(art.area[0] / Math.max(...rows), art.area[1] / (rows.length * art.pitch + (1 - art.pitch))).toFixed(2)}cqw`;
}

/** 판 하나: 모양에 맞춰 칸을 늘어놓고 모은 만큼 채운다 */
function Board({ shape, size, now, d }: { shape: PraiseConfig['shape']; size: number; now: number; d?: string }) {
  const dot = (i: number) => <i key={i} className={i < now ? 'on' : ''} />;
  const art = ART[shape];
  if (art) {
    let k = 0;
    const piece = (i: number) => (
      <img key={i} className={i < now ? 'on' : ''} alt="" draggable={false}
        src={i < now ? `/img/praise/${shape}-sticker-${art.colors[i % art.colors.length]}.webp` : `/img/praise/${shape}-empty.webp`} />
    );
    return (
      <div className={`pr-board art ${shape}`} role="img" aria-label={`${size}칸 중 ${Math.min(now, size)}칸`} style={d ? ({ '--d': d } as React.CSSProperties) : undefined}>
        {art.rows(size).map((w, r) => <div key={r}>{Array.from({ length: w }, () => piece(k++))}</div>)}
      </div>
    );
  }
  return (
    <div className={`pr-board ${shape}`} role="img" aria-label={`${size}칸 중 ${Math.min(now, size)}칸`}>
      <div className="pr-dots">{Array.from({ length: size }, (_, i) => dot(i))}</div>
    </div>
  );
}

/** 설정에서 눌러 넣는 예시 */
const REASON_IDEAS = ['바르게 앉기', '친구 돕기', '스스로 하기', '차례 지키기', '정리 정돈', '고운 말 쓰기', '인사 잘하기', '끝까지 하기'];
const REWARD_IDEAS = ['자유 시간 10분', '좋아하는 활동 고르기', '간식 고르기', '자리 고르기', '선생님 도우미 하기', '영상 한 편 보기'];
/** 학생별 맞춤에서 눌러 넣는 예시 (개별화 목표에 흔한 것) */
const OWN_REASON_IDEAS = ['눈 맞추고 인사하기', '도움 요청하기', '자리에 앉아 있기', '끝까지 듣기', '말로 표현하기', '기다리기'];
const OWN_REWARD_IDEAS = ['좋아하는 책 보기', '음악 듣기', '산책하기', '블록 놀이', '태블릿 5분'];
type OwnMap = Record<string, PraiseOwn>;
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

/**
 * 칭찬판 설정 (선생님). 두 쪽으로 나뉜다.
 *  · 우리 반 공통: 모양 → 칸 수 → 칭찬 이유 → 보상 → 1인 1역할 연결 (이것만 해도 바로 쓸 수 있다)
 *  · 학생별 맞춤: 학생을 고르고, 그 학생에게만 더해 줄 칭찬 이유와 보상을 적는다 (필요한 학생만)
 */
function PraiseSetup({ initial, initialOwn, students, focus, hasRoles, onSave, onBack }: {
  initial: PraiseConfig; initialOwn: OwnMap; students: Student[]; focus: string | null; hasRoles: boolean;
  onSave: (c: PraiseConfig, own: OwnMap) => void; onBack: () => void;
}) {
  const [c, setC] = useState<PraiseConfig>({ ...initial, reasons: [...initial.reasons], rewards: [...initial.rewards] });
  const [own, setOwn] = useState<OwnMap>(() => Object.fromEntries(Object.entries(initialOwn).map(([id, v]) => [id, { reasons: [...v.reasons], rewards: [...v.rewards] }])));
  const [tab, setTab] = useState<'common' | 'own'>(focus ? 'own' : 'common');
  const [who, setWho] = useState<string>(focus ?? students[0]?.id ?? '');
  const reasons = c.reasons.map((x) => x.trim()).filter(Boolean);
  const rewards = c.rewards.map((x) => x.trim()).filter(Boolean);
  const shape = PRAISE_SHAPES.find((x) => x.id === c.shape)!;
  const cleaned = cleanOwn(own, students.map((s) => s.id));
  const tailored = Object.keys(cleaned).length;
  const student = students.find((s) => s.id === who);
  const mine: PraiseOwn = own[who] ?? { reasons: [], rewards: [] };
  const setMine = (p: Partial<PraiseOwn>) => setOwn({ ...own, [who]: { ...mine, ...p } });
  const preview = { ...c, reasons, rewards };
  return (
    <div className="ps">
      <div className="ps-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'common'} className={tab === 'common' ? 'on' : ''} onClick={() => { setTab('common'); playSound('select'); }}>
          <i className="ph-fill ph-users-three" /><span><b>우리 반 공통</b><small>모두에게 똑같이 · 이것만 해도 돼요</small></span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'own'} className={tab === 'own' ? 'on own' : 'own'} onClick={() => { setTab('own'); playSound('select'); }}>
          <i className="ph-fill ph-user-focus" /><span><b>학생별 맞춤{tailored > 0 && <em>{tailored}명</em>}</b><small>한 학생에게만 더해 주는 칭찬 · 보상</small></span>
        </button>
      </div>

      {tab === 'common' ? (
        <div className="ps-cols" role="tabpanel">
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
            <Step n={3} title="모두에게 주는 칭찬 이유" help={`${REASON_MAX}개까지 · 적고 분명할수록 학생이 알기 쉬워요`}>
              <IdeaList values={c.reasons} max={REASON_MAX} ideas={REASON_IDEAS} placeholder="예: 바르게 앉기" onChange={(v) => setC({ ...c, reasons: v })} />
            </Step>
            <Step n={4} title="모두가 고를 수 있는 보상" help={`${REWARD_MAX}개까지 · 판을 다 채운 학생이 하나를 골라요`}>
              <IdeaList values={c.rewards} max={REWARD_MAX} ideas={REWARD_IDEAS} placeholder="예: 자유 시간 10분" onChange={(v) => setC({ ...c, rewards: v })} />
            </Step>
            <button type="button" className="ps-next" onClick={() => { setTab('own'); playSound('select'); }}>
              <i className="ph-fill ph-user-focus" /><span><b>학생마다 다르게 하고 싶다면</b><small>한 학생에게만 주는 칭찬 이유 · 보상을 더할 수 있어요</small></span><i className="ph-bold ph-caret-right" />
            </button>
          </div>
        </div>
      ) : (
        <div className="ps-own" role="tabpanel">
          <Step n={1} title="누구에게 맞출까요?" help="필요한 학생만 하면 돼요 · 공통으로 정한 것에 더해져서 그 학생에게만 보여요">
            <div className="ps-who" role="tablist" aria-label="학생 고르기">
              {students.map((s) => {
                const n = (cleaned[s.id]?.reasons.length ?? 0) + (cleaned[s.id]?.rewards.length ?? 0);
                return <button key={s.id} type="button" role="tab" aria-selected={s.id === who} className={`${s.id === who ? 'on' : ''}${n ? ' has' : ''}`} onClick={() => { setWho(s.id); playSound('select'); }}>{s.name}{n > 0 && <em>맞춤 {n}</em>}</button>;
              })}
            </div>
          </Step>
          {student && (
            <div className="ps-cols">
              <div className="ps-col">
                <Step n={2} title={`${student.name}에게만 주는 칭찬 이유`} help={`${OWN_REASON_MAX}개까지 · 이 학생의 개별 목표를 적어요`}>
                  <IdeaList values={mine.reasons} max={OWN_REASON_MAX} ideas={OWN_REASON_IDEAS.filter((x) => !reasons.includes(x))} placeholder="예: 눈 맞추고 인사하기" onChange={(v) => setMine({ reasons: v })} />
                </Step>
                <Step n={3} title={`${student.name}만 고를 수 있는 보상`} help={`${OWN_REWARD_MAX}개까지 · 이 학생이 특히 좋아하는 것`}>
                  <IdeaList values={mine.rewards} max={OWN_REWARD_MAX} ideas={OWN_REWARD_IDEAS.filter((x) => !rewards.includes(x))} placeholder="예: 좋아하는 책 보기" onChange={(v) => setMine({ rewards: v })} />
                </Step>
              </div>
              <div className="ps-col">
                <section className="ps-see">
                  <h3><i className="ph-fill ph-eye" /> {student.name}의 칭찬판에는 이렇게 나와요</h3>
                  <p>칭찬 이유</p>
                  <div>{reasonsFor(preview, mine).map((x) => <span key={x.text} className={x.own ? 'own' : ''}>{x.own && <em>맞춤</em>}{x.text}</span>)}{!reasonsFor(preview, mine).length && <span>칭찬해요</span>}</div>
                  <p>보상</p>
                  <div>{rewardsFor(preview, mine).map((x) => <span key={x.text} className={x.own ? 'own' : ''}>{x.own && <em>맞춤</em>}{x.text}</span>)}{!rewardsFor(preview, mine).length && <span>보상 받기</span>}</div>
                  {(mine.reasons.length > 0 || mine.rewards.length > 0) && (
                    <button type="button" onClick={() => { setOwn({ ...own, [who]: { reasons: [], rewards: [] } }); playSound('select'); }}>↺ {student.name}의 맞춤 모두 지우기</button>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="ps-summary" aria-live="polite">
        <b>{shape.icon} {shape.label} {c.size}칸</b>
        <span>공통 칭찬 이유 {reasons.length ? reasons.join(' · ') : '없음'}</span>
        <span>공통 보상 {rewards.length ? rewards.join(' · ') : '없음'}</span>
        <span>학생별 맞춤 {tailored ? `${tailored}명` : '없음'}</span>
      </div>
      <PopupActions>
        <button className="btn-cancel" onClick={onBack}>취소</button>
        <button className="btn-save" onClick={() => onSave({ ...c, reasons, rewards }, cleaned)}>💾 저장</button>
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
  /** 설정을 열 때 바로 보여 줄 학생 (칭찬판에서 '맞춤 설정'으로 들어온 경우) */
  const [focus, setFocus] = useState<string | null>(null);
  /** 방금 발급한 칭찬 인증서 (저장하지 않고 이 창에서만 보여 준다) */
  const [cert, setCert] = useState<{ data: CertData; cv: HTMLCanvasElement; url: string } | null>(null);
  const students = activeStudents(cls);
  const cfg = praiseConfigOf(cls);
  const tally = cls?.options.praiseTally;
  const ownAll = cleanOwn(cls?.options.praiseOwn, students.map((s) => s.id));
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
  /** 보상을 고르면: 이번 판에서 칭찬받은 일을 모아 인증서를 만들고, 새 판을 시작한다 */
  const claim = (s: Student, reward: string) => asTeacher(() => {
    void (async () => {
      const now = new Date();
      // 지난번 보상 뒤로 받은 스티커가 이번 판의 것 (기록을 읽지 못하면 칭찬받은 일 없이 만든다)
      const records = cls ? await recordsOf(cls.id).catch(() => []) : [];
      const since = records.flatMap((r) => r.praiseRewards ?? []).filter((x) => x.s === s.id).map((x) => x.at).sort().pop() ?? '';
      const data: CertData = {
        name: s.name, board: PRAISE_SHAPES.find((x) => x.id === cfg.shape)?.label ?? '칭찬판', size: cfg.size, shape: cfg.shape,
        nth: tallyOf(tally, s.id).boards + 1, reasons: reasonCounts(records.flatMap((r) => r.praise ?? []), s.id, since), reward, date: now,
        school: cls?.schoolName ?? '', className: cls?.className ?? '',
      };
      claimReward(s.id, reward);
      setLast(null);
      playSound('complete');
      speak(`${s.name}, 칭찬판을 다 채웠어요! 축하해요!`);
      try { const cv = await drawCertificate(data); setCert({ data, cv, url: cv.toDataURL('image/png') }); }
      catch { toast(`${s.name} — ${reward} 🎉`, 'success'); }
    })();
  });
  const save = (next: PraiseConfig, nextOwn: OwnMap) => {
    const now = useData.getState().classes.find((c) => c.id === cls?.id);
    if (now) void useData.getState().saveClass({ ...now, options: { ...now.options, praise: next, praiseOwn: nextOwn } });
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
            {/* 4명까지는 한 줄씩 막대로, 그보다 많으면 두 열로 나눠 8명까지 한눈에 보이게 한다 (칸 바탕이 진행 막대) */}
            <div className={`pr-mini${students.length > 4 ? ' two' : ''}`}>
              {students.map((s) => {
                const now = Math.min(tallyOf(tally, s.id).now, cfg.size);
                const pct = `${(now / cfg.size) * 100}%`;
                return students.length > 4
                  ? <div key={s.id} style={{ '--p': pct } as React.CSSProperties}><span>{s.name}</span><em>{now}</em></div>
                  : <div key={s.id}><span>{s.name}</span><i><b style={{ width: pct }} /></i><em>{now}</em></div>;
              })}
            </div>
            <div className="v3-sub">{icon} {status}</div>
          </>}
      </CardFrame>

      {view === 'board' && (
        <Popup title={`${icon} 칭찬판`} large onClose={() => setView(null)}
          headerExtra={<button className="wd-setup-btn" onClick={() => asTeacher(() => { setFocus(null); setView('setup'); })}><i className="ph-bold ph-sliders-horizontal" /> 칭찬판 설정</button>}>
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
              const myReasons = reasonsFor(cfg, ownAll[shown.id]);
              const myRewards = rewardsFor(cfg, ownAll[shown.id]);
              return (
                <div className={`pr-stage ${cfg.shape}${done ? ' full' : ''}`} role="tabpanel">
                  {ART[cfg.shape] ? (
                    // 그림이 있는 모양(포도 · 나무 · 별): 틀 그림 위에 스티커를 올리고, 팻말에 학생 이름을 적는다
                    <div className={`pr-art ${cfg.shape}`}>
                      <img className="pr-art-bg" src={`/img/praise/${cfg.shape}-bg.webp`} alt="" draggable={false} />
                      <div className="pr-art-sign">{shown.name}</div>
                      <div className="pr-art-fill"><Board shape={cfg.shape} size={cfg.size} now={t.now} d={artFit(cfg.shape, cfg.size)} /></div>
                    </div>
                  ) : <div className={`pr-stage-board n${cfg.size}`}><Board shape={cfg.shape} size={cfg.size} now={t.now} /></div>}
                  <div className="pr-stage-side">
                    <div className="pr-stage-name">
                      {shown.name}
                      <button type="button" className={`pr-tailor${ownAll[shown.id] ? ' has' : ''}`} title={`${shown.name}에게만 주는 칭찬 이유와 보상을 정해요`} onClick={() => asTeacher(() => { setFocus(shown.id); setView('setup'); })}>
                        <i className="ph-bold ph-user-focus" /> {ownAll[shown.id] ? '맞춤 고치기' : '맞춤 정하기'}
                      </button>
                    </div>
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
                        {(myRewards.length ? myRewards : [{ text: '보상 받기', own: false }]).map((r) => <button key={r.text} type="button" className={r.own ? 'own' : ''} onClick={() => claim(shown, r.text)}>{r.own && <em>맞춤</em>}{r.text}</button>)}
                      </div>
                    ) : (
                      <div className="pr-give">
                        <span>무엇을 칭찬할까요? <small>스티커는 선생님만 줄 수 있어요</small></span>
                        <div>{(myReasons.length ? myReasons : [{ text: '칭찬해요', own: false }]).map((r) => <button key={r.text} type="button" className={r.own ? 'own' : ''} onClick={() => give(shown, r.text)}>{icon} {r.text}{r.own && <em>맞춤</em>}</button>)}</div>
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
      {cert && (
        <Popup title="🏅 칭찬 인증서" large onClose={() => setCert(null)}>
          <div className="pc">
            <img className="pc-img" src={cert.url} alt={`${cert.data.name} 칭찬 인증서 — 보상: ${cert.data.reward}`} />
            <div className="pc-note">인증서는 저장되지 않아요. 필요하면 지금 인쇄하거나 그림으로 받아 두세요. 그림 파일에는 학생 이름이 들어 있어요.</div>
          </div>
          <PopupActions>
            <button className="btn-tool" onClick={() => { printImage(cert.url); playSound('select'); }}>🖨️ 인쇄</button>
            <button className="btn-tool" onClick={() => { void downloadCanvas(cert.cv, certFileName(cert.data)).then(() => toast('그림 파일로 받았어요', 'success'), () => toast('그림으로 만들지 못했어요', 'error')); playSound('select'); }}>⬇️ 이미지 저장</button>
            <span className="pa-divider" aria-hidden="true" />
            <button className="btn-save" onClick={() => setCert(null)}>✓ 닫기</button>
          </PopupActions>
        </Popup>
      )}
      {view === 'setup' && (
        <Popup title="⚙️ 칭찬판 설정" large onClose={() => setView(null)}>
          <PraiseSetup initial={cfg} initialOwn={ownAll} students={students} focus={focus} hasRoles={!!cls?.options.roles?.length} onSave={save} onBack={() => setView('board')} />
        </Popup>
      )}
    </>
  );
}

const manifest: FeatureManifest = { id: 'praise', cards: [{ id: 'praise', title: '칭찬판', ...TITLE, Component: PraiseCard }] };
export default manifest;
