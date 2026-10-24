import { OUTFIT_VARIANTS, outfitBase } from './outfitVariants';
/** 1024×1536 원본 몸 좌표. 남녀는 머리만 다르고 같은 몸을 사용한다. */
export type Point = readonly [number, number];
export type Triangle = readonly [Point, Point, Point];
export const BODY = {
  neck: [512, 550], shoulderLeft: [390, 575], shoulderRight: [634, 575],
  wristLeft: [265, 875], wristRight: [759, 875], waist: [512, 890],
  ankleLeft: [395, 1360], ankleRight: [629, 1360], floor: 1500,
} as const;
export type Patch = { source: Triangle; target: Triangle };
/** 대응하는 세 점으로 원본 그림의 위치·기울기·크기를 결정한다. */
export function affine(source: Triangle, target: Triangle): number[] {
  const [[x0,y0],[x1,y1],[x2,y2]] = source;
  const det = (x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
  if (Math.abs(det)<1e-8) throw new Error('겹치는 옷 기준점');
  const solve = (axis: 0|1) => {
    const d1=target[1][axis]-target[0][axis], d2=target[2][axis]-target[0][axis];
    const a=(d1*(y2-y0)-d2*(y1-y0))/det, b=((x1-x0)*d2-(x2-x0)*d1)/det;
    return [a,b,target[0][axis]-a*x0-b*y0];
  };
  const [a,c,e]=solve(0),[b,d,f]=solve(1); return [a,b,c,d,e,f];
}
function grid(xs:number[], ys:number[], tx:number[], ty:number[], cuff=false, cuffSource?:number): Patch[] {
  const p=(x:number,y:number):Point=>[xs[x],cuffSource!==undefined&&y===ys.length-2&&(x===0||x===xs.length-1)?cuffSource:ys[y]];
  const q=(x:number,y:number):Point=>[tx[x],ty[y]-(cuff && y===ys.length-2 && (x===0||x===xs.length-1)?40:0)];
  const result:Patch[]=[];
  for(let y=0;y<ys.length-1;y++) for(let x=0;x<xs.length-1;x++) {
    result.push({source:[p(x,y),p(x+1,y),p(x,y+1)],target:[q(x,y),q(x+1,y),q(x,y+1)]},
      {source:[p(x+1,y),p(x+1,y+1),p(x,y+1)],target:[q(x+1,y),q(x+1,y+1),q(x,y+1)]});
  }
  return result;
}
function shortTop(top:number, shoulder:number, cuff:number, hem:number) {
  return grid([0,240,512,784,1024],[0,top,shoulder,cuff,hem,1536], [295,395,512,629,729],[0,540,578,726,900,1100]);
}
function longTop(top:number, shoulder:number, pit:number, hem:number, collar=540, cuffSource=hem) {
  return grid([0,300,512,724,1024],[0,top,shoulder,pit,hem,1536], [218,380,512,644,806],[0,collar,585,725,905,1150],true,cuffSource);
}
function bottom(xs:number[], waist:number, crotch:number, hem:number) {
  return grid(xs,[0,waist,crotch,hem,1536],[190,335,465,512,559,689,834],[600,880,1000,1390,1510]);
}
function footwear(source: [number,number,number,number], target:[number,number,number,number]) {
  const [x,y,w,h]=source,[tx,ty,tw,th]=target;
  return grid([x,x+w],[y,y+h],[tx,tx+tw],[ty,ty+th]);
}
export const GARMENT_RIGS: Record<string,Patch[]> = {
  shirt:shortTop(340,420,750,1170), 'stripe-shirt':shortTop(330,410,750,1220), 'lemon-shirt':shortTop(315,400,740,1210),
  sweater:longTop(500,550,760,1110,540,1103), 'rust-sweatshirt':longTop(430,500,760,1100,540,1059),
  jacket:longTop(400,500,735,1020,525,959), 'pink-cardigan':longTop(420,500,750,1020,540,972),
  'denim-jacket':longTop(385,510,780,1105,525,1044), puffer:longTop(480,585,820,1115,520,1047),
  'winter-coat':longTop(420,555,840,1080,525,978),
  pants:bottom([0,260,440,512,590,770,1024],375,620,1410),
  chinos:bottom([0,195,440,525,620,875,1024],145,475,1465),
  'cargo-pants':bottom([0,210,430,512,590,815,1024],170,450,1390),
  'summer-shorts':grid([0,150,500,525,540,875,1024],[0,720,1010,1195,1536],[190,350,498,512,526,674,834],[500,880,1000,1070,1250]),
  sneakers:[...footwear([85,1110,390,390],[285,1348,170,157]),...footwear([575,1110,380,390],[569,1348,170,157])],
  boots:[...footwear([175,950,305,540],[300,1280,160,225]),...footwear([555,950,305,540],[564,1280,160,225])],
};

// 새 낮은 신발은 기존 운동화와 같은 발목·바닥 기준을 사용한다.
GARMENT_RIGS['pink-sneakers'] = [...footwear([85,1090,395,400],[285,1348,170,157]),...footwear([575,1090,390,400],[569,1348,170,157])];
GARMENT_RIGS.sandals = [...footwear([40,1060,450,430],[285,1348,170,157]),...footwear([535,1060,450,430],[569,1348,170,157])];
GARMENT_RIGS['winter-shoes'] = [...footwear([80,1070,405,420],[285,1348,170,157]),...footwear([555,1070,405,420],[569,1348,170,157])];

for (const [id, parent] of Object.entries(OUTFIT_VARIANTS)) GARMENT_RIGS[id] = GARMENT_RIGS[parent];

// 새 디자인은 생성 후 측정한 목·소매 끝·허리·신발 입구를 별도로 대응한다.
GARMENT_RIGS['spring-rain-jacket'] = longTop(385,490,735,1040,525,975);
GARMENT_RIGS['autumn-orange-windbreaker'] = longTop(370,480,710,985,525,930);
GARMENT_RIGS['winter-teal-puffer'] = longTop(415,535,770,1060,520,1005);
GARMENT_RIGS['autumn-olive-pants'] = bottom([0,195,420,512,600,830,1024],110,400,1390);
GARMENT_RIGS['spring-frog-boots'] = [...footwear([75,690,405,710],[300,1280,160,225]),...footwear([550,690,405,710],[564,1280,160,225])];
GARMENT_RIGS['summer-slippers'] = [...footwear([40,1075,470,370],[285,1348,170,157]),...footwear([530,1075,460,370],[569,1348,170,157])];
GARMENT_RIGS['winter-cream-boots'] = [...footwear([35,895,470,525],[285,1315,170,190]),...footwear([540,895,465,525],[569,1315,170,190])];

/** 긴 바지는 장화 입구 안으로 들어가도록 무릎 아래만 좁힌다. */
export function fittedPatches(item:string, boots:boolean): Patch[] {
  const patches=GARMENT_RIGS[item];
  if(!boots||!['pants','chinos','cargo-pants'].includes(outfitBase(item))) return patches;
  const fit=([x,y]:Point):Point=>{
    const amount=Math.max(0,Math.min(1,(y-1000)/280));
    const center=x<512?395:629;
    return [x+(center-x)*.28*amount,y];
  };
  return patches.map(p=>({...p,target:[fit(p.target[0]),fit(p.target[1]),fit(p.target[2])]}));
}
