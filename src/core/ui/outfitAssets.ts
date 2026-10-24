import { outfitBase } from './outfitVariants';
import type { CSSProperties } from 'react';
import registration from './outfitRegistration.json';

/** 저장된 아이템 ID는 그대로 두고 표시용 화풍만 바꾼다. */
const fileName = (name: string) => name === 'girl' ? 'girl-v2' : name === 'jacket' ? 'jacket-v2' : name === 'pink-cardigan' ? 'pink-cardigan-v2' : name;
export const outfitAsset = (name: string) => `/img/outfit/storybook/${fileName(name)}.png`;
/** 새 그림을 원본 캔버스 좌표로 등록한다. PNG 원본은 수정하지 않는다. */
export function outfitRegistration(name: string): CSSProperties {
  const [x,y,sx,sy] = registration[fileName(outfitBase(name)) as keyof typeof registration];
  return {'--asset-fit': `translate(${x}%,${y}%) scale(${sx},${sy})`} as CSSProperties;
}
