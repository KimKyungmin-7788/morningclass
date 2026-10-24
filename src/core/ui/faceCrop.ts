export interface Crop { x: number; y: number; zoom: number }
export const INITIAL_CROP: Crop = {x: 0, y: 0, zoom: 1};
/** 정사각형을 빈틈없이 채우고 사진 밖으로 이동하지 않게 제한한다. */
export function cropGeometry(width: number, height: number, crop: Crop) {
  const zoom = Math.max(1, Math.min(4, crop.zoom));
  const scale = zoom / Math.min(width, height);
  const w = width * scale, h = height * scale;
  const x = Math.max(-(w-1)/2, Math.min((w-1)/2, crop.x));
  const y = Math.max(-(h-1)/2, Math.min((h-1)/2, crop.y));
  return {left: (1-w)/2+x, top: (1-h)/2+y, width: w, height: h, crop: {x,y,zoom}};
}
