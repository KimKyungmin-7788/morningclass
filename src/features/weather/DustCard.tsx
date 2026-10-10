import { useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { Popup } from '@/core/ui/Popup';
import { GpsIcon } from '@/core/ui/GpsIcon';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useDay } from '@/core/data/day';
import { DUST, type DustLevel } from './model';
import { geoDust, geoErrorText } from './geo';

// 오늘의 미세먼지: 직접 고르거나 GPS 로 불러온다.
export function DustCard() {
  const d = useDay((s) => s.record.dust) as DustLevel | null;
  const update = useDay((s) => s.update);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const apply = (level: DustLevel, how: string) => {
    update((r) => { r.dust = { ...level }; });
    playSound('select');
    toast(how, 'success');
    speak(`오늘 미세먼지는 ${level.label} 입니다. ${level.hint}`);
    setOpen(false);
  };
  const auto = async () => {
    ensureAudio();
    setLoading(true);
    try {
      const { d: level, pm10 } = await geoDust();
      apply(level, `미세먼지 (GPS): ${level.label} · PM10 ${Math.round(pm10)}`);
    } catch (e) {
      toast(geoErrorText(e, '직접 선택해 주세요'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardFrame id="dust" label="미세먼지 선택" state={d ? 'filled' : 'empty'} onOpen={() => { ensureAudio(); setOpen(true); }}>
        <CardTitle icon="ph-fill ph-wind" tint="#f3e8ff" color="#9333ea"
          extra={d ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 미세먼지</CardTitle>
        {d ? (
          <div className="card-result">
            <div className="emoji" role="img" aria-label={d.label}>{d.emoji}</div><div className="label">{d.label}</div><div className="v3-pill">{d.hint}</div>
          </div>
        ) : <div className="card-hint">터치해서 미세먼지를 확인해요 👆</div>}
      </CardFrame>
      {open && (
        <Popup title="오늘 미세먼지는 어때요?" onClose={() => setOpen(false)}>
          <div className="choice-grid cols-4">
            {DUST.map((x) => (
              <button key={x.label} className={`choice-item dust-${x.level}`} onClick={() => apply(x, `미세먼지: ${x.label}`)}>
                <span className="em" role="img" aria-label={x.label}>{x.emoji}</span><span className="lb">{x.label}</span><span className="sb">{x.hint}</span>
              </button>
            ))}
          </div>
          <div className="choice-divider">— 또는 GPS로 불러와요 —</div>
          <button className="auto-fetch-btn" style={{ marginBottom: 0 }} disabled={loading} onClick={() => void auto()}>
            <GpsIcon size={24} /> {loading ? '위치 확인 중...' : 'GPS로 미세먼지 불러오기'}
          </button>
        </Popup>
      )}
    </>
  );
}
