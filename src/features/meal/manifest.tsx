import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup, PopupActions } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { usePrefs } from '@/core/prefs';
import { activeStudents, useCurrentClass, useData } from '@/core/data/store';
import { dateKeyOf, patchRecord, useDay } from '@/core/data/day';
import { setMealImage, useMealImages } from '@/core/data/mealImages';
import { fetchMealRows, pickLunch } from '@/core/net/neis';
import type { ClassRoom, Dish } from '@/core/data/types';
import type { FeatureManifest } from '../types';
import { ALLERGENS, dishAlerts, dishKey, mealAlertNames, parseMealRow, renameDish, shownDishes, simplifyDishQueries } from './model';
import { autoMealImages, searchImages, shrinkImage, type ImageHit } from './images';

// 오늘의 급식: 카드에는 메뉴 요약과 알레르기 주의, 창에서는 메뉴 목록(그림+글자 / 글자만)

const CHIP = { icon: 'ph-fill ph-bowl-food', tint: '#ffedd5', color: '#ea580c' };
type View = null | 'meal' | 'allergy';

function MealCard() {
  const cls = useCurrentClass();
  const dishes = useDay((s) => s.record.meal?.dishes) ?? [];
  const [view, setView] = useState<View>(null);
  const shown = shownDishes(dishes, cls?.options.mealHidden);
  const alerts = mealAlertNames(dishes, cls);
  return (
    <>
      <CardFrame id="meal" label="오늘의 급식" state={dishes.length ? 'filled' : 'empty'} style={{ flex: 1.1, minHeight: 160 }}
        onOpen={() => { ensureAudio(); playSound('select'); setView('meal'); }}>
        <CardTitle {...CHIP} extra={dishes.length ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 급식</CardTitle>
        {dishes.length ? (
          <>
            <div className="meal-summary">{shown.length ? shown.map((d) => d.name).join(' · ') : '숨긴 메뉴만 있어요'}</div>
            {alerts.length > 0 && <div className="meal-alert-line">⚠️ 알레르기 주의: {alerts.join(', ')}</div>}
          </>
        ) : <div className="card-hint">🍱 터치해서 오늘 급식을 알아봐요</div>}
      </CardFrame>
      {view === 'meal' && cls && <MealWindow cls={cls} onClose={() => setView(null)} onAllergy={() => setView('allergy')} />}
      {view === 'allergy' && cls && <AllergyWindow cls={cls} onBack={() => setView('meal')} />}
    </>
  );
}

type Phase = { at: 'loading' } | { at: 'list' } | { at: 'msg'; text: React.ReactNode };
const SPIN = ['🍳', '🍚', '🍲', '🥗', '🍱'];
const wait = (ms: number) => new Promise<void>((r) => { setTimeout(r, ms); });

function MealWindow({ cls, onClose, onAllergy }: { cls: ClassRoom; onClose: () => void; onAllergy: () => void }) {
  const date = useDay((s) => s.date);
  const dishes = useDay((s) => s.record.meal?.dishes) ?? [];
  const view = usePrefs((s) => s.mealView);
  const setPrefs = usePrefs((s) => s.set);
  const [phase, setPhase] = useState<Phase>({ at: 'loading' });
  const [spin, setSpin] = useState(0);
  const alive = useRef(true);

  const load = async (force: boolean) => {
    setPhase({ at: 'loading' });
    const minWait = wait(700);                                    // 불러오는 화면이 잠깐은 보이도록
    if (dishes.length && !force) { await minWait; if (alive.current) setPhase({ at: 'list' }); return; }
    if (!cls.neis.atptCode || !cls.neis.schoolCode) { await minWait; if (alive.current) setPhase({ at: 'msg', text: '⚙️ 설정에서 학교를 검색해 등록해 주세요' }); return; }
    const key = dateKeyOf(date);                                  // 요청한 학급·날짜 (응답 전에 학급이 바뀌어도 섞이지 않게)
    try {
      const [rows] = await Promise.all([fetchMealRows(cls.neis.atptCode, cls.neis.schoolCode, key, cls.neis.key), minWait]);
      const lunch = pickLunch(rows);
      if (!lunch) { if (alive.current) setPhase({ at: 'msg', text: '🏖️ 오늘은 급식이 없는 날이에요' }); return; }
      const { dishes: next, nutri } = parseMealRow(lunch);
      await patchRecord(cls.id, key, (r) => { r.meal = { dishes: next, nutri: nutri as never, loadedAt: new Date().toISOString() }; });
      if (!alive.current) return;
      playSound('complete');
      speak(`오늘 급식 메뉴는, ${shownDishes(next, cls.options.mealHidden).map((d) => d.name).join(', ')} 입니다.`);
      setPhase({ at: 'list' });
    } catch {
      await minWait;
      if (alive.current) setPhase({ at: 'msg', text: <>🍽️ 급식을 가져올 수 없어요<br /><span style={{ fontSize: 16 }}>🔄 다시 불러오기를 눌러요</span></> });
    }
  };
  // 창을 열면 한 번 불러온다
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { alive.current = true; void load(false); return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (phase.at !== 'loading') return;
    const t = setInterval(() => setSpin((n) => n + 1), 400);
    return () => clearInterval(t);
  }, [phase.at]);

  return (
    <Popup title="🍱 오늘의 급식" large onClose={onClose}
      headerExtra={(
        <div className="mv-toggle" role="group" aria-label="보기 방식">
          <button className={view === 'pic' ? 'on' : ''} aria-pressed={view === 'pic'} onClick={() => { setPrefs({ mealView: 'pic' }); playSound('select'); }}>🖼️ 그림 + 글자</button>
          <button className={view === 'text' ? 'on' : ''} aria-pressed={view === 'text'} onClick={() => { setPrefs({ mealView: 'text' }); playSound('select'); }}>🔤 글자만</button>
        </div>
      )}>
      <div className="meal-modal">
        <div className="mm-body" id="mm-body">
          {phase.at === 'loading' && <div className="meal-loading"><div className="spinner">{SPIN[spin % SPIN.length]}</div><div className="text">급식 메뉴를 불러오는 중...</div></div>}
          {phase.at === 'msg' && <div className="card-hint" style={{ fontSize: 20, padding: '40px 0' }}>{phase.text}</div>}
          {phase.at === 'list' && <DishList cls={cls} dishes={dishes} text={view === 'text'} />}
        </div>
        <div className="mm-tools">
          <button onClick={() => void load(true)}><i className="ph-bold ph-arrows-clockwise" /> 다시 불러오기</button>
          <button onClick={onAllergy}>🧒 알레르기 설정</button>
          <button className="soon" disabled title="7단계(나)에서 옮겨요">📝 학습지 제작 <span className="soon-tag">옮기는 중</span></button>
        </div>
      </div>
    </Popup>
  );
}

/** 메뉴 목록: 한 줄에 메뉴 하나(번호 · 그림 · 이름 · 알레르기 경고). 급식표 순서 그대로, 3개부터 두 열 */
function DishList({ cls, dishes, text }: { cls: ClassRoom; dishes: Dish[]; text: boolean }) {
  const update = useDay((s) => s.update);
  const saveClass = useData((s) => s.saveClass);
  const images = useMealImages();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [searchFor, setSearchFor] = useState<string | null>(null);
  const [still, setStill] = useState(false);                     // 처음 한 번만 줄이 차례로 나타난다
  const hidden = cls.options.mealHidden ?? [];
  const list = dishes.map((d, i) => ({ d, i })).filter((x) => !hidden.includes(x.d.name.trim()));   // i = 급식 기록에서의 원래 순서(이름 고치기용)
  const hiddenNames = [...new Set(dishes.map((d) => d.name.trim()).filter((n) => hidden.includes(n)))];
  const names = dishes.map((d) => d.name).join('|');

  useEffect(() => { if (editing == null) void autoMealImages(names.split('|').filter(Boolean)); }, [names, editing]);
  useEffect(() => { const t = setTimeout(() => setStill(true), 900); return () => clearTimeout(t); }, []);

  const setHidden = (name: string, on: boolean) => {
    const next = on ? [...new Set([...hidden, name.trim()])] : hidden.filter((n) => n !== name.trim());
    void saveClass({ ...cls, options: { ...cls.options, mealHidden: next } });
    playSound('select');
    if (on) toast(`'${name.trim()}' 메뉴를 숨겼어요. 다음에도 숨겨져요`, 'success');
  };
  const finish = (save: boolean) => {
    if (editing == null) return;
    const next = save ? renameDish(dishes, editing, draft) : null;
    if (next) { update((r) => { if (r.meal) r.meal.dishes = next; }); playSound('select'); }
    setEditing(null);
  };

  const row = ({ d, i }: { d: Dish; i: number }, k: number) => {
    const src = images[dishKey(d.name)]?.src;
    const alerts = dishAlerts(d, cls);
    return (
      <div key={`${i}-${d.name}`} className={`ml-row${alerts.length ? ' alert' : ''}`} style={{ animationDelay: `${k * 0.06}s` }}>
        <span className="ml-num">{k + 1}</span>
        <span className="ml-img">
          {src ? <img src={src} alt={d.name} referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span>🍽️</span>}
          <button className="ml-zoom" title="그림 바꾸기" aria-label={`${d.name} 그림 바꾸기`} onClick={() => setSearchFor(d.name)}><i className="ph-bold ph-arrows-clockwise" /><span>바꾸기</span></button>
        </span>
        <div className="ml-main">
          {editing === i ? (
            <div className="ml-name">
              <input className="ml-name-input" autoFocus maxLength={40} aria-label={`${k + 1}번 메뉴 이름`} value={draft} onChange={(e) => setDraft(e.target.value)}
                onFocus={(e) => e.currentTarget.select()} onBlur={() => finish(true)}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;              // 한글 조합 중 Enter 는 글자 확정용 — 마지막 글자가 빠지지 않게
                  if (e.key === 'Enter') { e.preventDefault(); finish(true); }
                  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }   // 급식 창은 닫지 않는다
                }} />
            </div>
          ) : (
            <div className="ml-name" tabIndex={0} role="button" title="눌러서 이름 고치기" onClick={() => { setDraft(d.name); setEditing(i); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDraft(d.name); setEditing(i); } }}>{d.name}</div>
          )}
          {alerts.length > 0 && (
            <div className="ml-warn">
              {alerts.map((a) => <span key={a.student.id} className="md-alert" title={a.hits.map((c) => ALLERGENS[c]).join(', ')}>⚠️ {a.student.name}<small>{a.hits.map((c) => ALLERGENS[c]).join('·')}</small></span>)}
            </div>
          )}
        </div>
        <button className="ml-hide" title="이 메뉴 숨기기" aria-label={`${d.name} 숨기기`} onClick={() => setHidden(d.name, true)}><i className="ph-bold ph-eye-slash" /></button>
      </div>
    );
  };

  const two = list.length >= 3;                                  // 3개부터 두 열 — 줄 수를 줄여 그림을 크게
  const half = Math.ceil(list.length / 2);
  const rows = two ? half : list.length;
  return (
    <>
      <div className={`meal-list${two ? ' two' : ''}${text ? ' text' : ''}${still ? ' still' : ''}`}
        style={{ '--rows': Math.max(rows, 1), ...(hiddenNames.length ? { '--bar': '44px' } : {}) } as React.CSSProperties}>
        {!list.length ? <div className="card-hint">보이는 메뉴가 없어요. 아래 숨긴 메뉴를 눌러 다시 보이게 해요.</div>
          : two ? (
            <>
              <div className="ml-col">{list.slice(0, half).map((x, k) => row(x, k))}</div>
              <div className="ml-divider" aria-hidden="true" />
              <div className="ml-col">{list.slice(half).map((x, k) => row(x, k + half))}</div>
            </>
          ) : <div className="ml-col">{list.map(row)}</div>}
      </div>
      {hiddenNames.length > 0 && (
        <div className="ml-hidden">
          <span>🙈 숨긴 메뉴</span>
          {hiddenNames.map((n) => {
            const d = dishes.find((x) => x.name.trim() === n)!;
            return <button key={n} title="다시 보이기" aria-label={`${n} 다시 보이기`} onClick={() => setHidden(n, false)}>{dishAlerts(d, cls).length ? '⚠️ ' : ''}{n} <i className="ph-bold ph-eye" /></button>;
          })}
        </div>
      )}
      {searchFor && <ImageSearch name={searchFor} current={images[dishKey(searchFor)]?.src} onClose={() => setSearchFor(null)} />}
    </>
  );
}

/** 그림 다시 찾기: 급식 창 위에 작은 창을 띄워 검색 후보(최대 6개) 중에서 고른다 / 내 파일 / 그림 없애기 */
function ImageSearch({ name, current, onClose }: { name: string; current?: string; onClose: () => void }) {
  const [q, setQ] = useState(name);
  const [state, setState] = useState<{ at: 'loading' } | { at: 'done'; items: ImageHit[]; commons: boolean }>({ at: 'loading' });
  const seq = useRef(0);
  const find = async (query: string) => {
    const my = (seq.current += 1);
    setState({ at: 'loading' });
    const r = await searchImages(query.trim() || name);
    if (my === seq.current) setState({ at: 'done', items: r.items.slice(0, 6), commons: r.src === 'commons' });
  };
  const save = (src: string, full?: string) => {
    setMealImage(dishKey(name), { src, ...(full ? { full } : {}) });
    playSound('select'); toast(`'${name}' 그림을 저장했어요`, 'success'); onClose();
  };
  // 열자마자 메뉴 이름으로 후보를 찾아 보여 준다. Esc 는 이 작은 창만 닫고 급식 창은 그대로 둔다
  useEffect(() => {
    void find(name);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => { seq.current += 1; window.removeEventListener('keydown', onKey, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div className="isub" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="isub-card" role="dialog" aria-modal="true" aria-label="그림 다시 찾기">
        <div className="isub-head">
          <div className="isub-title">🔍 그림 다시 찾기 — {name}</div>
          <button className="popup-close" aria-label="닫기" onClick={onClose}>✕</button>
        </div>
        <div className="dp-search">
          <input value={q} placeholder="검색어" aria-label="검색어" onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); void find(q); } }} />
          <button onClick={() => void find(q)}>🔍 찾기</button>
          <label className="dp-file">📁 내 파일
            <input type="file" accept="image/*" hidden onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) shrinkImage(f).then((src) => save(src)).catch(() => toast('그림 파일을 읽을 수 없어요', 'error'));
            }} />
          </label>
        </div>
        <div className="isub-sugg">
          <span className="lb">💡 추천 검색어</span>
          {simplifyDishQueries(name).map((s) => <button key={s} className="sg" onClick={() => { setQ(s); void find(s); }}>{s}</button>)}
          {current && <button className="dp-clear" onClick={() => { setMealImage(dishKey(name), { src: '', none: true }); toast('그림을 없앴어요', 'success'); onClose(); }}>그림 없애기</button>}
        </div>
        <div className="isub-tip">
          <div className="t">💡 원하는 그림이 안 나오면 <b>검색어를 단순화</b>해 보세요</div>
          <div className="ex"><span className="from">코코넛대왕새우튀김</span><span className="arrow">→</span><span className="to">새우튀김</span></div>
        </div>
        <div className="dp-cands isub-cands">
          {state.at === 'loading' ? <div className="card-hint">🔍 찾는 중...</div>
            : !state.items.length ? <div className="card-hint">검색 결과가 없어요. 검색어를 바꾸거나 📁 내 파일로 넣어 주세요</div>
            : (
              <>
                {state.items.map((it, i) => (
                  <button key={it.thumb} className="dp-cand" onClick={() => save(it.thumb, it.link)}>
                    <span className="dp-thumb"><img src={it.thumb} alt="" referrerPolicy="no-referrer" loading="lazy" /></span><span>후보 {i + 1} 선택</span>
                  </button>
                ))}
                {state.commons && <div className="hint" style={{ gridColumn: '1/-1' }}>※ 이미지 검색 키가 연결되지 않아 위키미디어 공용 그림에서 찾았어요</div>}
              </>
            )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** 학생별 알레르기 설정 (학급 설정에 저장) — 급식 창에서 열고, 닫으면 급식 창으로 돌아간다 */
function AllergyWindow({ cls, onBack }: { cls: ClassRoom; onBack: () => void }) {
  const saveClass = useData((s) => s.saveClass);
  const students = activeStudents(cls);
  const [al, setAl] = useState<Record<string, number[]>>(() => structuredClone(cls.allergies));
  const toggle = (id: string, c: number) => setAl((cur) => {
    const mine = cur[id] ?? [];
    const next = mine.includes(c) ? mine.filter((x) => x !== c) : [...mine, c].sort((a, b) => a - b);
    const out = { ...cur, [id]: next };
    if (!next.length) delete out[id];
    return out;
  });
  return (
    <Popup title="🧒 알레르기 설정" large onClose={onBack}>
      {students.length ? (
        <>
          <div className="hint" style={{ marginBottom: 12 }}>학생마다 알레르기가 있는 음식을 눌러 주세요. 급식 메뉴에 같은 알레르기 번호가 있으면 메뉴 카드에 학생 이름이 <b style={{ color: 'var(--danger)' }}>⚠️ 경고</b>로 표시돼요.</div>
          <div className="al-list">
            {students.map((s) => {
              const mine = al[s.id] ?? [];
              return (
                <div key={s.id} className={`al-row${mine.length ? ' has' : ''}`}>
                  <div className="al-name">{s.name}{mine.length > 0 && <span className="al-cnt">{mine.length}</span>}</div>
                  <div className="al-chips">
                    {ALLERGENS.map((nm, c) => c > 0 && <button key={c} className={`al-chip${mine.includes(c) ? ' on' : ''}`} aria-pressed={mine.includes(c)} onClick={() => toggle(s.id, c)}>{c}. {nm}</button>)}
                  </div>
                </div>
              );
            })}
          </div>
          <PopupActions>
            <button className="btn-cancel" onClick={onBack}>취소</button>
            <button className="btn-save" onClick={() => {
              // 보관된 학생의 알레르기 정보는 건드리지 않고 그대로 둔다
              const ids = new Set(students.map((s) => s.id));
              void saveClass({ ...cls, allergies: { ...Object.fromEntries(Object.entries(cls.allergies).filter(([id]) => !ids.has(id))), ...al } });
              playSound('save'); toast('알레르기 정보를 저장했어요', 'success'); onBack();
            }}>💾 저장</button>
          </PopupActions>
        </>
      ) : (
        <>
          <div className="card-hint" style={{ padding: 30 }}>⚙️ 설정에서 학생을 먼저 등록해 주세요</div>
          <PopupActions><button className="btn-cancel" onClick={onBack}>돌아가기</button></PopupActions>
        </>
      )}
    </Popup>
  );
}

const manifest: FeatureManifest = { id: 'meal', cards: [{ id: 'meal', col: 3, order: 1, Component: MealCard }] };
export default manifest;
