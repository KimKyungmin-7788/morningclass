import { useEffect, useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup } from '@/core/ui/Popup';
import { GpsIcon } from '@/core/ui/GpsIcon';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useDay } from '@/core/data/day';
import { FEEL, WEATHER, judgeWeather, wxFeel, wxTheme, type WeatherKind, type WeatherValue } from './model';
import { geoErrorText, geoWeather } from './geo';
import { WeatherScene } from './WeatherScene';
import { WeatherSheet } from '@/features/worksheets/Worksheets';

// 오늘의 날씨: 직접 고르기 → (선택) GPS 로 정답 확인. 고르면 날씨 장면을 크게 보여 준다.

type Stage =
  | { at: 'closed' }
  | { at: 'pick' }
  | { at: 'reveal'; w: WeatherValue }
  | { at: 'result'; ans: WeatherValue; guess: WeatherKind; guessFeel: string | null }
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

export function WeatherCard() {
  const w = useDay((s) => s.record.weather) as WeatherValue | null;
  const update = useDay((s) => s.update);
  const [stage, setStage] = useState<Stage>({ at: 'closed' });
  const [pick, setPick] = useState<number | null>(null);
  const [feel, setFeel] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const close = () => setStage({ at: 'closed' });
  const t = w ? wxTheme(w) : null;

  // 날씨 장면은 잠깐 보여 주고 스스로 닫힌다
  useEffect(() => {
    if (stage.at !== 'reveal') return;
    const timer = setTimeout(close, 4200);
    return () => clearTimeout(timer);
  }, [stage]);

  const open = () => { ensureAudio(); setPick(null); setFeel(null); setStage({ at: 'pick' }); };

  const save = () => {
    if (pick == null) { toast('날씨를 먼저 골라요', 'error'); return; }
    const value: WeatherValue = { ...WEATHER[pick], ...(feel ? { feel } : {}) };
    update((r) => { r.weather = { ...value }; });
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
      const ans = await geoWeather();
      const guess = WEATHER[pick];
      const { wOk, fOk, allOk } = judgeWeather(guess.label, feel, ans);
      ans.guess = { label: guess.label, feel, wOk, fOk };
      update((r) => { r.weather = { ...ans }; });
      playSound(allOk ? 'correct' : 'wrong');
      const af = wxFeel(ans);
      // 맞음·틀림 평가 없이 정답 날씨만 읽어 준다
      speak(`오늘 날씨는 ${ans.label}${ans.temp != null ? `, ${Math.round(ans.temp)}도` : ''}${af ? `, ${af.label}` : ''} 입니다.`);
      setStage({ at: 'result', ans, guess, guessFeel: feel });
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
      <CardFrame id="weather" label="날씨 선택" state={w ? 'filled' : 'empty'} className={`v3${w && t ? ` wxc wxc-${t.k}` : ''}`} onOpen={open}>
        {w && t && <WeatherScene kind={t.k} />}
        <CardTitle icon="ph-fill ph-sun-horizon" tint="#fef3c7" color="#d97706"
          extra={w ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 날씨</CardTitle>
        {w && t ? (
          <div className="card-result wx-result">
            <i className={`ph-fill ${t.ph} wx-ico`} /><div className="label">{w.label}</div><div className="wx-title">{t.title}</div>
            <Temp w={w} cls="wx-temp" />
          </div>
        ) : <div className="card-hint">터치해서 날씨를 선택해요 👆</div>}
      </CardFrame>

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
        const { ans, guess, guessFeel } = stage;
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
            <div className={`wxres-head ${allOk ? 'ok' : 'no'}`}>{allOk ? '🎉 모두 맞았어요!' : '🤔 정답을 확인해요'}</div>
            <div className="wxres-grid">
              {resultCard('ph-cloud-sun', '날씨', guess, wOk)}
              {resultCard('ph-thermometer-simple', '기온', gf, gf ? fOk : null)}
            </div>
            <div className="wxres-ans">정답</div>
            <div className={`wx-reveal sm wxc-${th.k}`}>
              <WeatherScene kind={th.k} big />
              <div className="wxr-inner">
                <i className={`ph-fill ${th.ph} wxr-ico`} /><div className="wxr-label">{ans.label}</div><Temp w={ans} cls="wxr-temp" />
              </div>
            </div>
            <button className="auto-fetch-btn" style={{ margin: '12px 0 0' }} onClick={close}>확인</button>
          </Popup>
        );
      })()}
      {stage.at === 'sheet' && <WeatherSheet onClose={close} />}
    </>
  );
}
