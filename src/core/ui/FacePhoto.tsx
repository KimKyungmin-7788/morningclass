import { isFacePhoto } from '@/core/data/facePhoto';
import { useId } from 'react';
/** 원본 그림과 같은 좌표계 안에서 얼굴만 원형으로 덮는다. */
export function FacePhoto({photo, x, y, radius}: {photo?: string; x: number; y: number; radius: number}) {
  const id = useId();
  if (!isFacePhoto(photo)) return null;
  return <g><defs><clipPath id={id}><circle cx={x} cy={y} r={radius}/></clipPath></defs><image href={photo} x={x-radius} y={y-radius} width={radius*2} height={radius*2} clipPath={`url(#${id})`}/></g>;
}
