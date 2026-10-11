import { useState } from 'react';
import { Popup } from '@/core/ui/Popup';
import { GpsIcon } from '@/core/ui/GpsIcon';
import { toast } from '@/core/ui/toast';
import { ensureAudio, playSound } from '@/core/sound';
import { speak } from '@/core/tts';
import { useDay } from '@/core/data/day';
import { DUST, type DustLevel } from './model';
import { geoDust, geoErrorText } from './geo';

// 오늘의 미세먼지: 직접 고르거나 GPS 로 불러온다. 날씨 카드 아래쪽에 한 줄로 들어간다 (누르면 미세먼지 창이 열린다).
export function DustChip() {
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
    // 날씨 카드 안에 있으므로, 여기서 누른 것이 카드까지 올라가 날씨 창이 열리지 않게 막는다 (창 안의 누르기도 마찬가지)
    <div className="dust-wrap" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button className={`dust-chip${d ? ` on dust-${d.level}` : ''}`} aria-label="미세먼지 선택" onClick={() => { ensureAudio(); setOpen(true); }}>
        <i className="ph-fill ph-wind" /><span>미세먼지</span>
        {d ? <b><em role="img" aria-label={d.label}>{d.emoji}</em> {d.label}</b> : <b className="none">눌러서 확인 👆</b>}
      </button>
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
    </div>
  );
}
