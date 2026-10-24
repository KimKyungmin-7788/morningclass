import { useEffect, useRef, useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact, type SlotSize } from '@/core/ui/slot';
import { Popup } from '@/core/ui/Popup';
import { GpsIcon } from '@/core/ui/GpsIcon';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useDay } from '@/core/data/day';
import { DUST, FEEL, WEATHER, judgeWeather, wxFeel, wxTheme, type DustLevel, type WeatherKind, type WeatherValue } from './model';
import { geoDust, geoErrorText, geoWeather } from './geo';
import { WeatherScene } from './WeatherScene';
import { DustChip } from './DustCard';
import { WeatherSheet } from '@/features/worksheets/Worksheets';
import { WeatherTour } from './WeatherTour';
import { useOutfitWindow } from '@/core/data/outfitWindow';
import './weatherLinks.css';

// 오늘의 날씨: 직접 고르기 → (선택) GPS 로 정답 확인. 고르면 날씨 장면을 크게 보여 준다.

type Stage =
  | { at: 'closed' }
  | { at: 'pick' }
  | { at: 'reveal'; w: WeatherValue }
  | { at: 'result'; ans: WeatherValue; guess: WeatherKind; guessFeel: string | null; dustAns: DustLevel | null; guessDust: DustLevel | null; sample?: boolean }
  | { at: 'sheet' };

/** 날씨와 구분되도록 온도계 아이콘을 단 기온 패널 */
function Temp({ w, cls }: { w: WeatherValue; cls: string }) {
  const f = wxFeel(w);
  if (!f) return null;
  return (
    <div className={cls}>
      <i className="ph-fill ph-thermometer-simple wxt-ico" aria-hidden="true" />
      {w.temp != null && <b>{Math.round(w.temp)}°</b>}
      <span className={`wx-feel ${f.k}`}>{f.emoji} {f.label}</span>
    </div>
  );
}

const TITLE = { icon: 'ph-fill ph-sun-horizon', tint: '#fef3c7', color: '#d97706' };

export function WeatherCard({ size }: { size: SlotSize }) {
  const compact = isCompact(size);
  const dustNow = useDay((s) => s.record.dust) as DustLevel | null;
  const w = useDay((s) => s.record.weather) as WeatherValue | null;
  const update = useDay((s) => s.update);
  const [stage, setStage] = useState<Stage>({ at: 'closed' });
  const [pick, setPick] = useState<number | null>(null);
  const [feel, setFeel] = useState<string | null>(null);
  const [dust, setDust] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const close = () => setStage({ at: 'closed' });

  // 처음 안내가 정답 확인 화면을 예시로 띄웠다가 되돌린다 (기록은 바꾸지 않는다)
  const picked = useRef({ pick, feel, dust });
  picked.current = { pick, feel, dust };
  const tourScreen = useRef({
    showSample: () => {
      const { pick: p, feel: f, dust: d } = picked.current;
      const guess = WEATHER[p ?? 0];
      const guessDust = d != null ? DUST[d] : null;
      setStage({ at: 'result', ans: { ...guess, ...(f ? { feel: f } : {}) }, guess, guessFeel: f, dustAns: guessDust ?? DUST[0], guessDust, sample: true });
    },
    backToPick: () => setStage((s) => (s.at === 'result' && s.sample ? { at: 'pick' } : s)),
  }).current;
  const t = w ? wxTheme(w) : null;
  const feelNow = wxFeel(w);

  // 날씨 장면은 잠깐 보여 주고 스스로 닫힌다
  useEffect(() => {
    if (stage.at !== 'reveal') return;
    const timer = setTimeout(close, 4200);
    return () => clearTimeout(timer);
  }, [stage]);

  const open = () => { ensureAudio(); setPick(null); setFeel(null); setDust(null); setStage({ at: 'pick' }); };
  /** 날씨 창에서 미세먼지도 골랐으면 함께 기록한다 (고르지 않았으면 그대로 둔다) */
  const saveDust = () => { if (dust != null) update((r) => { r.dust = { ...DUST[dust] }; }); };

  const save = () => {
    if (pick == null) { toast('날씨를 먼저 골라요', 'error'); return; }
    const value: WeatherValue = { ...WEATHER[pick], ...(feel ? { feel } : {}) };
    update((r) => { r.weather = { ...value }; });
    saveDust();
    playSound('select');
    const th = wxTheme(value);
    const f = wxFeel(value);
    toast(`날씨: ${value.label} ${value.emoji}`, 'success');
    speak(`오늘 날씨는 ${value.label} 입니다. ${f ? `${f.label}. ${f.say}. ` : ''}${th.say}`);
    setStage({ at: 'reveal', w: value });
  };

  const check = async () => {
    if (pick == null) { toast('날씨를 먼저 골라요 👆', 'error'); return; }
    ensureAudio();
    setChecking(true);
    try {
      // 날씨와 함께 미세먼지 정답도 불러온다 (미세먼지만 못 불러오면 날씨만 확인한다)
      const [ans, dustRes] = await Promise.all([geoWeather(), geoDust().catch(() => null)]);
      const dustAns = dustRes?.d ?? null;
      const guessDust = dust != null ? DUST[dust] : null;
      const guess = WEATHER[pick];
      const { wOk, fOk, allOk } = judgeWeather(guess.label, feel, ans);
      ans.guess = { label: guess.label, feel, wOk, fOk };
      update((r) => { r.weather = { ...ans }; });
      if (dustAns) update((r) => { r.dust = { ...dustAns }; }); else saveDust();   // 정답을 불러왔으면 정답을, 아니면 고른 것을 기록한다
      playSound(allOk && (!guessDust || !dustAns || guessDust.level === dustAns.level) ? 'correct' : 'wrong');
      const af = wxFeel(ans);
      // 맞음·틀림 평가 없이 정답 날씨만 읽어 준다
      speak(`오늘 날씨는 ${ans.label}${ans.temp != null ? `, ${Math.round(ans.temp)}도` : ''}${af ? `, ${af.label}` : ''} 입니다.${dustAns ? ` 미세먼지는 ${dustAns.label} 입니다.` : ''}`);
      setStage({ at: 'result', ans, guess, guessFeel: feel, dustAns, guessDust });
    } catch (e) {
      toast(geoErrorText(e, '아래 버튼으로 저장해요'), 'error');
    } finally {
      setChecking(false);
    }
  };

  const resultCard = (icon: string, name: string, mine: { emoji: string; label: string } | null, ok: boolean | null) => (
    <div className={`wxres-card ${ok === true ? 'ok' : ok === false ? 'no' : ''}`}>
      {ok !== null && <span className={`wx-mark big ${ok ? 'ok' : 'no'}`} role="img" aria-label={ok ? '맞아요' : '틀렸어요'} />}
      <div className="wxres-ct"><i className={`ph-fill ${icon}`} />{name}</div>
      {mine ? <><div className="em">{mine.emoji}</div><div className="lb">{mine.label}</div></> : <div className="lb none">고르지 않았어요</div>}
    </div>
  );

  return (
    <>
      <CardFrame id="weather" label="날씨 선택" state={w ? 'filled' : 'empty'} className={`v3${!compact && w && t ? ` wxc wxc-${t.k}` : ''}`} onOpen={open}>
        {compact ? (
          <CardCompact {...TITLE} title="오늘의 날씨" done={!!w}>
            {w ? `${w.label}${w.temp != null ? ` ${Math.round(w.temp)}°` : ''}${dustNow ? ` · 미세먼지 ${dustNow.label}` : ''}` : '날씨를 골라요'}
          </CardCompact>
        ) : <>
        {w && t && <WeatherScene kind={t.k} />}
        <CardTitle {...TITLE}
          extra={w ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 날씨</CardTitle>
        {w && t && size === 'large' ? (
          // 큰 칸: 날씨 한마디와 옷차림 · 미세먼지 도움말까지 보여 준다
          <div className="card-result wx-result wx-large">
            <i className={`ph-fill ${t.ph} wx-ico`} /><div className="label">{w.label}</div><div className="wx-title">{t.title}</div>
            <Temp w={w} cls="wx-temp" />
            <div className="wx-say">{t.say}</div>
            <div className="wx-tips">
              {feelNow && <div className="wx-tip"><span role="img" aria-label={feelNow.label}>{feelNow.emoji}</span>{feelNow.say}</div>}
              {dustNow && <div className={`wx-tip dust-${dustNow.level}`}><span role="img" aria-label={`미세먼지 ${dustNow.label}`}>{dustNow.emoji}</span>{dustNow.hint}</div>}
            </div>
          </div>
        ) : w && t ? (
          <div className="card-result wx-result">
            <i className={`ph-fill ${t.ph} wx-ico`} /><div className="label">{w.label}</div><div className="wx-title">{t.title}</div>
            <Temp w={w} cls="wx-temp" />
          </div>
        ) : <div className="card-hint">터치해서 날씨를 선택해요 👆</div>}
        <DustChip />
        </>}
      </CardFrame>

      {(stage.at === 'pick' || (stage.at === 'result' && stage.sample)) && <WeatherTour {...tourScreen} />}
      {stage.at === 'pick' && (
        <Popup title="오늘 날씨는 어때요?" onClose={close}>
          <div className="wxp-sec temp">
            <div className="wxp-h"><i className="ph-fill ph-thermometer-simple" />기온 <small>(고르지 않아도 돼요)</small></div>
            <div className="feel-row">
              {FEEL.map((f) => (
                <button key={f.k} className={`feel-chip ${f.k}${feel === f.k ? ' on' : ''}`} aria-pressed={feel === f.k}
                  onClick={() => { if (feel === f.k) setFeel(null); else { setFeel(f.k); speak(f.label); } }}>
                  <span className="em">{f.emoji}</span>{f.label}<span className="rg">{f.rng}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="wxp-sec">
            <div className="wxp-h sky"><i className="ph-fill ph-cloud-sun" />날씨 <small>(하나 골라요)</small></div>
            <div className="choice-grid cols-3">
              {WEATHER.map((x, i) => (
                <button key={x.label} className={`choice-item${pick === i ? ' on' : ''}`} aria-pressed={pick === i}
                  onClick={() => { setPick(i); playSound('select'); speak(x.label); }}>
                  <span className="em" role="img" aria-label={x.label}>{x.emoji}</span><span className="lb">{x.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="wxp-sec dust">
            <div className="wxp-h dust"><i className="ph-fill ph-wind" />미세먼지 <small>(고르지 않아도 돼요 · GPS로 확인하면 함께 불러와요)</small></div>
            <div className="feel-row dust-row">
              {DUST.map((x, i) => (
                <button key={x.label} className={`feel-chip dust-${x.level}${dust === i ? ' on' : ''}`} aria-pressed={dust === i}
                  onClick={() => { if (dust === i) setDust(null); else { setDust(i); playSound('select'); speak(`미세먼지 ${x.label}`); } }}>
                  <span className="em">{x.emoji}</span>{x.label}<span className="rg">{x.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <button className="auto-fetch-btn" style={{ marginBottom: 6 }} disabled={checking} onClick={() => void check()}>
            <GpsIcon size={24} /> {checking ? '정답 확인 중...' : 'GPS로 정답 확인하기'}
          </button>
          <button className="wx-skip" onClick={save}>GPS 없이 내 선택 그대로 저장</button>
        </Popup>
      )}

      {stage.at === 'reveal' && (() => {
        const th = wxTheme(stage.w);
        return (
          <Popup title={`${stage.w.emoji} 오늘의 날씨`} onClose={close}>
            <div className={`wx-reveal wxc-${th.k}`} onClick={close}>
              <WeatherScene kind={th.k} big />
              <div className="wxr-inner">
                <i className={`ph-fill ${th.ph} wxr-ico`} />
                <div className="wxr-label">{stage.w.label}</div><div className="wxr-title">{th.title}</div>
                <div className="wxr-say">{th.say}</div><Temp w={stage.w} cls="wxr-temp" />
              </div>
            </div>
          </Popup>
        );
      })()}

      {stage.at === 'result' && (() => {
        const { ans, guess, guessFeel, dustAns, guessDust, sample } = stage;
        const dOk = guessDust && dustAns ? guessDust.level === dustAns.level : null;   // 미세먼지는 고르고, 정답도 불러왔을 때만 맞춰 본다
        const th = wxTheme(ans);
        const gf = FEEL.find((f) => f.k === guessFeel) ?? null;
        const { wOk, fOk, allOk } = judgeWeather(guess.label, guessFeel, ans);
        return (
          <Popup title="오늘 날씨 정답 확인" onClose={close}
            headerExtra={(
              // 정답을 확인한 뒤에만 활동지로 갈 수 있다
              <button className="hdr-icon-btn labeled" type="button" title="날씨 활동지 만들기" aria-label="날씨 활동지 만들기" onClick={() => setStage({ at: 'sheet' })}>
                <i className="ph-fill ph-notepad" style={{ fontSize: 24 }} />날씨 활동지
              </button>
            )}>
            <div className={`wxres-head ${allOk && dOk !== false ? 'ok' : 'no'}`}>{sample ? '👀 예시 화면이에요' : allOk && dOk !== false ? '🎉 모두 맞았어요!' : '🤔 정답을 확인해요'}</div>
            <div className="wxres-grid three">
              {resultCard('ph-cloud-sun', '날씨', guess, wOk)}
              {resultCard('ph-thermometer-simple', '기온', gf, gf ? fOk : null)}
              {resultCard('ph-wind', '미세먼지', guessDust, dOk)}
            </div>
            <div className="wxres-ans">정답</div>
            <div className={`wx-reveal sm wxc-${th.k}`}>
              <WeatherScene kind={th.k} big />
              {/* 왼쪽에 날씨 그림과 이름, 오른쪽에 기온과 미세먼지를 위아래로 */}
              <div className="wxr-inner wxr-split">
                <div className="wxr-sky"><i className={`ph-fill ${th.ph} wxr-ico`} /><div className="wxr-label">{ans.label}</div></div>
                <div className="wxr-facts">
                  <Temp w={ans} cls="wxr-temp" />
                  {dustAns
                    ? <div className={`wxr-dust dust-${dustAns.level}`}><i className="ph-fill ph-wind wxt-ico" aria-hidden="true" /><span>미세먼지</span><b><em role="img" aria-label={dustAns.label}>{dustAns.emoji}</em> {dustAns.label}</b><small>{dustAns.hint}</small></div>
                    : <div className="wxr-dust none"><i className="ph-fill ph-wind wxt-ico" aria-hidden="true" /><span>미세먼지</span><small>불러오지 못했어요</small></div>}
                </div>
              </div>
            </div>
            {!sample && <div className="wx-outfit-link"><button onClick={() => { close(); useOutfitWindow.getState().show(); }}>👕 오늘은 어떤 옷? →</button></div>}
            <button className="auto-fetch-btn" style={{ margin: '12px 0 0' }} onClick={close}>확인</button>
          </Popup>
        );
      })()}
      {stage.at === 'sheet' && <WeatherSheet onClose={close} />}
    </>
  );
}
