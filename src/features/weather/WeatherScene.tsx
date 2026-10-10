import { useMemo } from 'react';
import type { CSSProperties } from 'react';

// 날씨 장면(움직이는 배경) — 카드와 선택 연출에서 함께 쓴다. 빗방울·눈송이 위치는 처음 한 번만 정한다.

const rnd = (a: number, b: number) => (a + Math.random() * (b - a)).toFixed(2);

export function WeatherScene({ kind, big }: { kind: string; big?: boolean }) {
  const inner = useMemo(() => {
    const n = big ? 1.8 : 1;
    const drops = (cnt: number) => Array.from({ length: Math.round(cnt * n) }, (_, i) => (
      <i key={`d${i}`} className="wx-drop" style={{ left: `${rnd(0, 100)}%`, animationDelay: `-${rnd(0, 1.2)}s`, animationDuration: `${rnd(0.7, 1.1)}s` }} />
    ));
    const flakes = (cnt: number) => Array.from({ length: Math.round(cnt * n) }, (_, i) => (
      <i key={`f${i}`} className="wx-flake" style={{ left: `${rnd(0, 100)}%`, fontSize: `${rnd(9, 17)}px`, animationDelay: `-${rnd(0, 6)}s`, animationDuration: `${rnd(4.5, 8)}s` }}>❄</i>
    ));
    const cloud = (cls: string, top: number, dur: number, delay: number, scale: number) => (
      <i key={`c${top}`} className={`wx-cloud ${cls}`} style={{ top: `${top}%`, animationDuration: `${dur}s`, animationDelay: `-${delay}s`, '--s': scale } as CSSProperties} />
    );
    switch (kind) {
      case 'sunny': return <i className="wx-rays" />;
      case 'partly': return <><i className="wx-rays soft" />{cloud('', 18, 16, 2, 1)}{cloud('', 55, 22, 11, 0.8)}</>;
      case 'cloudy': return <>{cloud('grey', 10, 26, 3, 1.2)}{cloud('grey', 38, 20, 12, 1)}{cloud('grey', 62, 30, 20, 1.3)}</>;
      case 'rain': return <>{cloud('dark', 4, 30, 5, 1.2)}{drops(16)}<i className="wx-puddle" /><i className="wx-puddle p2" /></>;
      case 'storm': return <>{cloud('dark', 2, 34, 4, 1.3)}{drops(18)}<i className="wx-flash" /><i className="wx-bolt">⚡</i></>;
      case 'snow': return <>{flakes(16)}<i className="wx-ground" /></>;
      default: return null;
    }
  }, [kind, big]);
  return <div className="wx-scene" aria-hidden="true">{inner}</div>;
}
