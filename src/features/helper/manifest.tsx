import { useMemo, useRef, useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { InclToggles } from '@/core/ui/InclToggles';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { attIncludeOf, eligibleStudents, isIncluded } from '@/core/data/eligible';
import type { Student } from '@/core/data/types';
import type { FeatureManifest } from '../types';

// 도우미 카드: 🎲 오늘의 도우미 / 🍀 행운의 주인공 두 가지 모드 (학급별 저장)

type Mode = 'helper' | 'lucky';

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function HelperCard() {
  const cls = useCurrentClass();
  const saveClass = useData((s) => s.saveClass);
  const record = useDay((s) => s.record);
  const students = activeStudents(cls);
  const mode: Mode = cls?.options.helperMode === 'lucky' ? 'lucky' : 'helper';
  const lucky = mode === 'lucky';
  const [open, setOpen] = useState(false);
  const title = lucky ? '행운의 주인공' : '오늘의 도우미';
  const inc = attIncludeOf(cls);
  // 뽑힌 뒤 지각·결석으로 바뀌어 제외된 학생은 카드에서 뺀다
  const picked = (lucky ? record.lucky.ids : record.helpers.ids)
    .map((id) => students.find((s) => s.id === id)).filter((s): s is Student => !!s && isIncluded(record.attendance[s.id]?.status, 'help', inc));

  const toggle = cls && (
    <button className={`hm-toggle ${mode}`} title="모드 바꾸기" aria-label="도우미·행운 모드 바꾸기"
      onClick={(e) => { e.stopPropagation(); void saveClass({ ...cls, options: { ...cls.options, helperMode: lucky ? 'helper' : 'lucky' } }); playSound(lucky ? 'select' : 'sparkle'); }}>
      <span className="hm-opt h">🎲 도우미</span><span className="hm-opt l">🍀 행운</span>
    </button>
  );
  const chip = lucky
    ? <div className="v3-title"><span className="v3-ico lk-ico"><i className="ph-fill ph-clover" /></span>{title}{toggle}</div>
    : <CardTitle icon="ph-duotone ph-dice-five" tint="#ede9fe" color="#7c3aed" extra={toggle}>{title}</CardTitle>;
  const stars = lucky && <><span className="lk-star s1">✦</span><span className="lk-star s2">✧</span><span className="lk-star s3">✦</span></>;
  const style = { flex: '0 0 auto', minHeight: 170 };

  if (!students.length) {
    return (
      <CardFrame id="helper" label="오늘의 도우미 뽑기" className={lucky ? 'lucky-card' : ''} style={{ ...style, cursor: 'default' }}>
        {chip}<div className="card-hint" style={{ fontSize: 15 }}>⚙️ 설정에서 학생을 등록해 주세요</div>
      </CardFrame>
    );
  }
  return (
    <>
      <CardFrame id="helper" label="오늘의 도우미 뽑기" state={picked.length ? 'filled' : 'empty'} className={lucky ? 'lucky-card' : ''} style={style}
        onOpen={() => { ensureAudio(); setOpen(true); }}>
        {chip}
        {picked.length ? (
          <div className="helper-winners">
            {picked.map((s) => (lucky
              ? <div key={s.id} className="lucky-winner"><span className="lw-crown">👑</span><span className="lw-nm">{s.name}</span></div>
              : <div key={s.id} className="helper-winner"><span className="hw-em"><i className="ph-fill ph-star" /></span><span className="hw-nm">{s.name}</span></div>))}
          </div>
        ) : <div className="card-hint" style={{ fontSize: 16 }}>{lucky ? '✨ 터치해서 행운의 주인공을 뽑아요' : '🎯 터치해서 오늘의 도우미를 뽑아요'}</div>}
        {stars}
      </CardFrame>
      {open && <DrawWindow mode={mode} onClose={() => setOpen(false)} />}
    </>
  );
}

/** 뽑기 창. 도우미는 최대 6명·슬롯 연출, 행운은 최대 3명·밤하늘 무대와 폭죽 */
function DrawWindow({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const lucky = mode === 'lucky';
  const cls = useCurrentClass();
  const record = useDay((s) => s.record);
  const update = useDay((s) => s.update);
  const all = activeStudents(cls);
  const eligible = eligibleStudents(cls, record, 'help');
  const pool = eligible.length ? eligible : all;                 // 모두 제외되면 전체에서 뽑는다
  const max = Math.min(pool.length, lucky ? 3 : 6);
  const savedIds = lucky ? record.lucky.ids : record.helpers.ids;
  const [count, setCount] = useState(Math.max(savedIds.length, 1));
  const n = Math.min(count, max);
  const [rolling, setRolling] = useState<string[] | null>(null);  // 돌아가는 동안 보여 줄 이름
  const stageRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const winners = savedIds.map((id) => all.find((s) => s.id === id)?.name).filter((x): x is string => !!x);
  const stars = useMemo(() => Array.from({ length: 18 }, (_, i) => (
    <i key={i} className="ls-star" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${(Math.random() * 2).toFixed(2)}s` }} />
  )), []);

  const burst = () => {                                           // 무대 안 반짝이 폭죽
    const st = stageRef.current;
    if (!st || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cols = ['#fde047', '#facc15', '#f472b6', '#c084fc', '#fff', '#fb923c'];
    for (let i = 0; i < 46; i += 1) {
      const s = document.createElement('i');
      s.className = 'ls-spark';
      const a = Math.random() * Math.PI * 2; const r = 90 + Math.random() * 170;
      s.style.cssText = `--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.15}s`;
      st.appendChild(s);
      setTimeout(() => s.remove(), 1500);
    }
  };

  const roll = () => {
    if (rolling) return;
    const final = shuffle(pool).slice(0, n);
    const totalTicks = lucky ? 26 : 16 + n * 2;
    let ticks = 0;
    if (lucky) speak('두구두구두구');
    const tick = () => {
      if (!alive.current) return;                                 // 창을 닫았으면 멈춘다
      ticks += 1;
      setRolling(Array.from({ length: lucky ? 1 : n }, () => pool[Math.floor(Math.random() * pool.length)].name));
      playSound(lucky ? 'drum' : 'check');
      if (ticks < totalTicks) { setTimeout(tick, (lucky ? 55 : 60) + (ticks / totalTicks) ** 3 * (lucky ? 420 : 340)); return; }   // 점점 느려짐
      const ids = final.map((s) => s.id);
      const names = final.map((s) => s.name).join(', ');
      const at = new Date().toISOString();
      update((r) => { if (lucky) r.lucky = { ids, pickedAt: at }; else r.helpers = { ids, pickedAt: at }; });
      setRolling(null);
      if (lucky) {
        burst(); playSound('fanfare'); toast(`행운의 주인공: ${names} 👑`, 'success');
        setTimeout(() => speak(`오늘의 행운의 주인공은, ${names} 입니다! 축하해요!`, { pitch: 1.15 }), 450);
      } else {
        playSound('complete'); toast(`오늘의 도우미: ${names} 🌟`, 'success'); speak(`오늘의 도우미는, ${names} 입니다.`);
      }
    };
    tick();
  };

  return (
    <Popup title={lucky ? '🍀 행운의 주인공' : '🎲 오늘의 도우미 뽑기'} onClose={() => { alive.current = false; onClose(); }}>
      <div className="helper-setup">
        <div className="helper-count-label">몇 명 뽑을까요?</div>
        <div className="helper-count">
          {Array.from({ length: max }, (_, i) => i + 1).map((c) => (
            <button key={c} className={`hc-btn${lucky ? ' lk' : ''}${c === n ? ' active' : ''}`} disabled={!!rolling} onClick={() => setCount(c)}>{c}명</button>
          ))}
        </div>
        <div className="helper-pool-note">후보 {pool.length}명</div>
      </div>
      {lucky ? (
        <div className="lucky-stage" ref={stageRef}>
          {stars}
          <div className="ls-inner">
            {rolling ? <><div className="ls-drum">두구두구…</div><div className="ls-roll">{rolling[0]}</div></>
              : winners.length ? <><div className="ls-title">🎉 오늘의 행운의 주인공 🎉</div><div className="ls-winners">{winners.map((w) => <div key={w} className="ls-winner"><span className="lw-crown">👑</span><span className="lw-nm">{w}</span></div>)}</div></>
              : <div className="ls-wait">✨<br />누가 오늘의 행운의 주인공일까요?</div>}
          </div>
        </div>
      ) : (
        <div className="helper-stage">
          {rolling ? rolling.map((w, i) => <div key={i} className="helper-winner big rolling"><span className="hw-em">🎰</span><span className="hw-nm">{w}</span></div>)
            : winners.length ? winners.map((w) => <div key={w} className="helper-winner big"><span className="hw-em">🌟</span><span className="hw-nm">{w}</span></div>)
            : <div className="helper-placeholder">🎲<br />뽑기 버튼을 눌러주세요</div>}
        </div>
      )}
      <PopupActions>
        <button className="btn-cancel" onClick={() => { alive.current = false; onClose(); }}>닫기</button>
        <button className={`btn-save${lucky ? ' lk-roll' : ''}`} disabled={!!rolling} onClick={roll}>
          {lucky ? `🍀 ${winners.length ? '다시 뽑기' : '행운 뽑기'}` : `🎲 ${winners.length ? '다시 뽑기' : '뽑기'}`}
        </button>
      </PopupActions>
      <InclToggles kind="help" disabled={!!rolling} />
    </Popup>
  );
}

const manifest: FeatureManifest = { id: 'helper', cards: [{ id: 'helper', col: 2, order: 2, Component: HelperCard }] };
export default manifest;
