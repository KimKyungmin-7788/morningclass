import type { Season, Weather } from './model';
import './backdrop.css';

/** 날씨 효과를 겹치지 않고 계절·날씨가 함께 그려진 풍경을 고른다. */
export function OutfitBackdrop({season, weather}: {season: Season|'all'; weather: Weather}) {
  // 전체는 옷장 필터다. 배경은 현재 계절을 보여 준다.
  const currentSeason = Math.floor((new Date().getMonth() + 10) % 12 / 3);
  const index = season === 'all' ? currentSeason : ['봄','여름','가을','겨울'].indexOf(season);
  const dryWinter = index === 3 && weather !== '비' && weather !== '눈';
  const file = dryWinter ? 'winter-clear' : weather === '비' ? 'rain-seasons' : weather === '눈' ? 'snow-seasons' : 'seasons';
  return <div className="outfit-backdrop" aria-hidden="true">
    <div className="season-landscape" style={{backgroundImage:`url('/img/outfit/backgrounds/${file}.png')`,backgroundSize:dryWinter ? '100% 100%' : '200% 200%',backgroundPosition:`${index % 2 * 100}% ${Math.floor(index / 2) * 100}%`}}/>
    <div className="avatar-clearing"/>
  </div>;
}
