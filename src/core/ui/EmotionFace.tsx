import { FacePhoto } from './FacePhoto';
export function EmotionFace({photo}: {photo?:string}) {
  return <svg className="emo-face-layer" viewBox="0 0 524 754" aria-hidden="true"><FacePhoto photo={photo} x={262} y={226} radius={95}/></svg>;
}
