import { describe, expect, it } from 'vitest';
import { affine, BODY, fittedPatches, GARMENT_RIGS, type Point } from './outfitRig';
const transform=(m:number[],[x,y]:Point)=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]];
describe('공통 몸 기준 옷 합성',()=>{
  it('세 기준점을 정확히 연결하며 뒤집히거나 무너지는 조각이 없다',()=>{
    for(const item of Object.keys(GARMENT_RIGS)) for(const boots of [false,true]) for(const p of fittedPatches(item,boots)) {
      const m=affine(p.source,p.target);
      expect(m.every(Number.isFinite),item).toBe(true);
      expect(m[0]*m[3]-m[1]*m[2],item).toBeGreaterThan(0);
      p.source.forEach((point,i)=>{const actual=transform(m,point);expect(actual[0]).toBeCloseTo(p.target[i][0],7);expect(actual[1]).toBeCloseTo(p.target[i][1],7);});
    }
  });
  it('이웃 조각은 같은 기준점을 공유하여 소매와 몸통이 갈라지지 않는다',()=>{
    for(const patches of Object.values(GARMENT_RIGS)) {
      const points=new Map<string,Point>();
      for(const p of patches) p.source.forEach((point,i)=>{
        const key=point.join(',');
        if(points.has(key)) expect(p.target[i]).toEqual(points.get(key));
        points.set(key,p.target[i]);
      });
    }
  });
  it('장화 조합은 무릎 위를 보존하고 바짓단만 입구 쪽으로 모은다',()=>{
    for(const item of ['pants','chinos','cargo-pants']) {
      const base=GARMENT_RIGS[item], tucked=fittedPatches(item,true);
      base.forEach((p,i)=>p.target.forEach(([x,y],j)=>{
        const [tx,ty]=tucked[i].target[j]; expect(ty).toBe(y);
        if(y<=1000) expect(tx).toBe(x);
        else {const center=x<512?BODY.ankleLeft[0]:BODY.ankleRight[0];expect(Math.abs(tx-center)).toBeLessThanOrEqual(Math.abs(x-center));}
      }));
    }
    expect(fittedPatches('summer-shorts',true)).toBe(GARMENT_RIGS['summer-shorts']);
  });
  it('기준점이 겹치면 잘못된 변환을 만들지 않는다',()=>{
    expect(()=>affine([[0,0],[1,1],[2,2]],[[0,0],[1,0],[0,1]])).toThrow();
  });
});
