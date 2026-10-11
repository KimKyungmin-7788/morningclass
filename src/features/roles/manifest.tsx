import { useEffect, useRef, useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact } from '@/core/ui/slot';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { givePraise, praiseConfigOf, undoRolePraise } from '@/core/data/praise';
import { newId, type RoleItem, type Student } from '@/core/data/types';
import type { CardProps, FeatureManifest } from '../types';
import { ROLE_ICONS, ROLE_PRESETS, cleanRoles, dealRoles, roleProgress, roleViews, rotateRoles, toggleDone, toggleMember, withoutRole, type RoleView } from './model';

// 1인 1역할: 학생마다 맡은 학급 일을 보여 주고, 한 학생이 자기 이름을 눌러 "오늘 했어요"를 남긴다.
// 역할과 맡은 학생은 학급 설정에 두어 선생님이 바꿀 때까지 그대로 가고, 했어요 기록은 날마다 그날 기록에 남는다.

const TITLE = { icon: 'ph-fill ph-identification-badge', tint: '#ccfbf1', color: '#0f766e' };
type Member = RoleView['members'][number];

/** 역할판: 역할마다 그림 · 이름 · 맡은 학생 이름표. 이름표를 누르면 했어요가 켜지고, 역할을 누르면 읽어 준다 */
function RoleBoard({ views, onMark }: { views: RoleView[]; onMark: (role: RoleItem, m: Member) => void }) {
  return (
    <div className="rl-board">
      {views.map(({ role, members }) => {
        const todo = members.filter((m) => !m.absent);
        return (
          <div key={role.id} className={`rl-role${todo.length > 0 && todo.every((m) => m.done) ? ' done' : ''}`}>
            <button type="button" className="rl-head" aria-label={`${role.name} 읽어 주기`}
              onClick={() => { ensureAudio(); speak(`${role.name}. ${role.desc}${members.length ? `. ${members.map((m) => m.name).join(', ')}` : ''}`, { rate: 0.9 }); }}>
              <span className="rl-ico" role="img" aria-hidden="true">{role.icon}</span>
              <span className="rl-txt"><b>{role.name}</b>{role.desc && <small>{role.desc}</small>}</span>
            </button>
            <div className="rl-members">
              {members.length === 0 && <span className="rl-none">맡은 친구가 없어요</span>}
              {members.map((m) => (
                <button key={m.id} type="button" className={`rl-m${m.done ? ' done' : ''}${m.absent ? ' absent' : ''}`} disabled={m.absent} aria-pressed={m.done}
                  aria-label={`${m.name} ${m.absent ? '결석' : m.done ? '했어요 (누르면 취소)' : '했어요 누르기'}`} onClick={() => onMark(role, m)}>
                  <i className={m.done ? 'ph-fill ph-check-circle' : 'ph-bold ph-circle'} />{m.name}{m.absent && <small>결석</small>}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * 역할 정하기 (선생님): ① 역할을 눌러 고르고 ② 역할마다 맡을 친구를 눌러 고른다.
 * 맨 위 줄에 지금 상태(역할 수 · 역할을 맡은 친구 · 아직 없는 친구)를 늘 보여 준다.
 */
function RoleSetup({ initial, students, onSave, onBack }: { initial: RoleItem[]; students: Student[]; onSave: (roles: RoleItem[]) => void; onBack: () => void }) {
  const [roles, setRoles] = useState<RoleItem[]>(() => initial.map((r) => ({ ...r, students: [...r.students] })));
  const [iconFor, setIconFor] = useState<string | null>(null);
  const [before, setBefore] = useState<RoleItem[] | null>(null);   // 한꺼번에 바꾸기 직전 (되돌리기 한 번)
  const [added, setAdded] = useState('');                           // 방금 넣은 역할 — 그 카드가 보이게 화면을 옮긴다
  const [leaving, setLeaving] = useState(false);                    // 저장하지 않고 닫으려는지 한 번 더 묻는 중
  const box = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(roles) !== JSON.stringify(initial);
  useEffect(() => {
    if (added) box.current?.querySelector(`[data-role="${added}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [added]);
  /** 여러 칸을 한꺼번에 바꾸는 일(골고루 나누기 · 돌리기 · 역할 빼기)은 되돌릴 수 있게 직전 모습을 남긴다 */
  const bulk = (next: RoleItem[]) => { setBefore(roles); setRoles(next); setLeaving(false); playSound('select'); };
  const patch = (id: string, p: Partial<RoleItem>) => setRoles(roles.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const add = (p: { icon: string; name: string; desc: string }) => { const id = newId('r'); setRoles([...roles, { id, ...p, students: [] }]); setAdded(id); playSound('select'); };
  const remove = (r: RoleItem) => (r.students.length ? bulk(roles.filter((x) => x.id !== r.id)) : setRoles(roles.filter((x) => x.id !== r.id)));
  const picked = (name: string) => roles.find((r) => r.name.trim() === name);
  /** 자주 쓰는 역할은 누를 때마다 넣었다 뺐다 한다 */
  const togglePreset = (p: (typeof ROLE_PRESETS)[number]) => {
    const now = picked(p.name);
    if (now) { remove(now); playSound('select'); } else add(p);
  };
  const save = () => {
    const nameless = roles.find((r) => !r.name.trim());
    if (nameless) {   // 이름 없는 역할은 저장되지 않으므로 먼저 알려 준다
      toast('이름이 없는 역할이 있어요. 이름을 적거나 🗑 로 빼 주세요', 'error');
      box.current?.querySelector<HTMLInputElement>(`[data-role="${nameless.id}"] input.nm`)?.focus();
      return;
    }
    onSave(cleanRoles(roles, students.map((s) => s.id)));
    if (empty > 0) toast(`맡은 친구가 없는 역할이 ${empty}개 있어요. "역할 정하기"에서 언제든 정할 수 있어요`);
  };
  const free = withoutRole(roles, students);
  const empty = roles.filter((r) => !r.students.some((id) => students.some((s) => s.id === id))).length;
  const roleCount = (id: string) => roles.filter((r) => r.students.includes(id)).length;
  return (
    <div className="rl-setup" ref={box}>
      <div className="rl-sum" role="status">
        <span>역할 <b>{roles.length}</b>개</span>
        <span>맡은 친구 <b>{students.length - free.length}</b>/{students.length}명</span>
        {roles.length === 0 ? <span className="tip">① 역할을 고르고 ② 맡을 친구를 정한 뒤 저장해요</span>
          : free.length ? <span className="warn" title={free.map((s) => s.name).join(', ')}>아직 없는 친구: <b>{free.map((s) => s.name).join(', ')}</b></span>
          : empty > 0 ? <span className="warn">맡은 친구가 없는 역할 <b>{empty}</b>개</span>
          : <span className="ok">모든 친구가 역할을 맡았어요 👍</span>}
      </div>

      <section className="rl-sec">
        <h3><i>1</i>역할 고르기 <small>누르면 들어가고, 다시 누르면 빠져요</small></h3>
        <div className="rl-presets">
          {ROLE_PRESETS.map((p) => {
            const on = !!picked(p.name);
            return (
              <button key={p.name} type="button" className={on ? 'on' : ''} aria-pressed={on} title={p.desc} onClick={() => togglePreset(p)}>
                <span role="img" aria-hidden="true">{p.icon}</span>{p.name}{on && <i className="ph-bold ph-check" />}
              </button>
            );
          })}
          <button type="button" className="blank" onClick={() => add({ icon: '⭐', name: '', desc: '' })}><span aria-hidden="true">＋</span>직접 만들기</button>
        </div>
      </section>

      <section className="rl-sec">
        <h3><i>2</i>맡을 친구 정하기 <small>이름을 눌러요 · 한 역할을 여럿이 맡아도 돼요</small>
          <span className="rl-tools">
            {before && <button type="button" className="undo" title="방금 한꺼번에 바꾼 것을 되돌려요" onClick={() => { setRoles(before); setBefore(null); playSound('select'); }}><i className="ph-bold ph-arrow-counter-clockwise" /> 되돌리기</button>}
            <button type="button" disabled={!roles.length || !students.length} title="모든 친구가 역할을 하나씩 맡도록 처음부터 다시 나눠요" onClick={() => { bulk(dealRoles(roles, students.map((s) => s.id))); toast('명단 순서대로 골고루 나눴어요'); }}><i className="ph-bold ph-shuffle" /> 골고루 나누기</button>
            <button type="button" disabled={roles.length < 2} title="맡은 친구들을 다음 역할로 한 칸씩 옮겨요" onClick={() => bulk(rotateRoles(roles))}><i className="ph-bold ph-arrows-clockwise" /> 한 칸씩 돌리기</button>
          </span>
        </h3>
        {roles.length === 0 && <div className="rl-empty">☝️ 위에서 역할을 먼저 골라 주세요</div>}
        <div className="rl-edits">
          {roles.map((r) => {
            const mine = students.filter((s) => r.students.includes(s.id));
            return (
              <div key={r.id} data-role={r.id} className={`rl-edit${mine.length ? '' : ' none'}`}>
                <div className="rl-edit-top">
                  <button type="button" className="rl-ico-btn" title="그림 바꾸기" aria-label="역할 그림 바꾸기" aria-expanded={iconFor === r.id} onClick={() => setIconFor(iconFor === r.id ? null : r.id)}>{r.icon}<i className="ph-bold ph-pencil-simple" /></button>
                  <div className="rl-edit-txt">
                    <input className="nm" aria-label="역할 이름" placeholder="역할 이름을 적어요" maxLength={16} value={r.name} autoFocus={!r.name} onChange={(e) => patch(r.id, { name: e.target.value })} />
                    <input aria-label="하는 일" placeholder="하는 일 (예: 아침에 화분에 물을 줘요)" maxLength={40} value={r.desc} onChange={(e) => patch(r.id, { desc: e.target.value })} />
                  </div>
                  <button type="button" className="del" title="역할 빼기" aria-label={`${r.name || '역할'} 빼기`} onClick={() => remove(r)}><i className="ph-bold ph-trash" /></button>
                </div>
                {iconFor === r.id && (
                  <div className="rl-icons">{ROLE_ICONS.map((ic) => <button key={ic} type="button" className={ic === r.icon ? 'on' : ''} onClick={() => { patch(r.id, { icon: ic }); setIconFor(null); }}>{ic}</button>)}</div>
                )}
                <div className="rl-who">{mine.length ? <>맡은 친구 <b>{mine.length}명</b></> : <em>맡을 친구를 골라 주세요</em>}</div>
                <div className="rl-chips">
                  {students.map((s) => {
                    const on = r.students.includes(s.id);
                    const other = roleCount(s.id) - (on ? 1 : 0);
                    return (
                      <button key={s.id} type="button" className={`${on ? 'on' : ''}${other ? ' busy' : ''}`} aria-pressed={on} title={other ? `${s.name}: 다른 역할 ${other}개를 맡고 있어요` : undefined}
                        onClick={() => { setRoles(toggleMember(roles, r.id, s.id)); playSound('select'); }}>
                        {on && <i className="ph-bold ph-check" />}{s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {roles.length > 1 && <p className="rl-note">흐린 점선 이름은 이미 다른 역할을 맡은 친구예요. 눌러서 이 역할도 함께 맡길 수 있어요.</p>}
      </section>
      <PopupActions>
        <button className="btn-cancel" onClick={() => { if (dirty && !leaving) { setLeaving(true); toast('바꾼 내용이 있어요. 한 번 더 누르면 저장하지 않고 닫아요'); } else onBack(); }}>{leaving ? '저장 안 하고 닫기' : '취소'}</button>
        <button className="btn-save" onClick={save}>💾 저장</button>
      </PopupActions>
    </div>
  );
}

function RolesCard({ size }: CardProps) {
  const cls = useCurrentClass();
  const attendance = useDay((s) => s.record.attendance);
  const done = useDay((s) => s.record.roleDone);
  const update = useDay((s) => s.update);
  const [view, setView] = useState<null | 'today' | 'setup'>(null);
  const students = activeStudents(cls);
  const roles = cls?.options.roles ?? [];
  const views = roleViews(roles, students, done, (id) => attendance[id]?.status === 'absent');
  const { total, done: n } = roleProgress(views);
  const allDone = total > 0 && n === total;
  const big = size === 'large';

  const mark = (role: RoleItem, m: Member) => {
    ensureAudio();
    update((r) => { r.roleDone = toggleDone(r.roleDone, role.id, m.id); });
    // 칭찬판 설정에서 켜 두었으면 "했어요"에 칭찬 스티커를 하나 주고, 취소하면 그 스티커도 되돌린다
    const sticker = praiseConfigOf(cls).autoRole;
    if (m.done) { if (sticker) undoRolePraise(role.id, m.id); playSound('select'); return; }
    if (sticker) givePraise(m.id, role.name, role.id);
    playSound('correct');
    speak(`${m.name}, ${role.name} 했어요! 잘했어요!${sticker ? ' 칭찬 스티커 하나!' : ''}`);
  };
  const save = (next: RoleItem[]) => {
    const now = useData.getState().classes.find((c) => c.id === cls?.id);
    if (now) void useData.getState().saveClass({ ...now, options: { ...now.options, roles: next } });
    playSound('save'); toast('역할을 저장했어요', 'success');
    setView(next.length && !big ? 'today' : null);
  };
  const open = (v: 'today' | 'setup') => { ensureAudio(); playSound('select'); setView(v); };
  const status = !students.length ? '학생을 등록해 주세요' : !roles.length ? '역할을 정해요' : !total ? '맡은 친구를 정해요' : allDone ? '모두 했어요!' : `${n}/${total} 했어요`;
  const check = allDone ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined;

  return (
    <>
      <CardFrame id="roles" label="1인 1역할" state={allDone ? 'filled' : 'empty'}
        onOpen={!students.length || (big && roles.length) ? undefined : () => open(roles.length ? 'today' : 'setup')}>
        {isCompact(size) ? <CardCompact {...TITLE} title="1인 1역할" done={allDone}>{status}</CardCompact>
          : !students.length ? <><CardTitle {...TITLE}>1인 1역할</CardTitle><div className="card-hint">⚙️ 설정에서 학생을 등록해 주세요</div></>
          : !roles.length ? <><CardTitle {...TITLE}>1인 1역할</CardTitle><div className="card-hint">터치해서 우리 반 역할을 정해요 👆</div></>
          : big ? <>
            <CardTitle {...TITLE} extra={(
              <span className="tl-side">
                {check}
                <button title="역할 정하기" aria-label="역할 정하기" onClick={() => open('setup')}><i className="ph-bold ph-sliders-horizontal" /></button>
              </span>
            )}>1인 1역할</CardTitle>
            <RoleBoard views={views} onMark={mark} />
          </> : <>
            <CardTitle {...TITLE} extra={check}>1인 1역할</CardTitle>
            <div className="rl-mini">
              {views.map(({ role, members }) => (
                <div key={role.id}><span role="img" aria-label={role.name}>{role.icon}</span>
                  <span>{members.length ? members.map((m) => <em key={m.id} className={m.done ? 'done' : m.absent ? 'absent' : ''}>{m.name}</em>) : <em className="absent">-</em>}</span>
                </div>
              ))}
            </div>
            <div className="v3-sub">{status}</div>
          </>}
      </CardFrame>
      {view === 'today' && (
        <Popup title="🙋 1인 1역할" large onClose={() => setView(null)}
          headerExtra={<button className="wd-setup-btn" onClick={() => setView('setup')}><i className="ph-bold ph-pencil-simple-line" /> 역할 정하기</button>}>
          <div className="rl-today">
            <div className="rl-today-hint">내 이름을 눌러 <b>오늘 했어요</b>를 남겨요 · <b>{status}</b></div>
            <RoleBoard views={views} onMark={mark} />
          </div>
        </Popup>
      )}
      {view === 'setup' && (
        <Popup title="✏️ 역할 정하기" large onClose={() => setView(null)}>
          <RoleSetup initial={roles} students={students} onSave={save} onBack={() => setView(roles.length && !big ? 'today' : null)} />
        </Popup>
      )}
    </>
  );
}

const manifest: FeatureManifest = { id: 'roles', cards: [{ id: 'roles', title: '1인 1역할', ...TITLE, Component: RolesCard }] };
export default manifest;
