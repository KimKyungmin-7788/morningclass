import { describe, it, expect } from 'vitest';
import { cropGeometry, INITIAL_CROP } from './faceCrop';
describe('얼굴 사진 자르기',()=>{
 it('가로·세로 사진을 가운데에서 빈틈없이 채운다',()=>{
  expect(cropGeometry(800,400,INITIAL_CROP)).toMatchObject({left:-.5,top:0,width:2,height:1});
  expect(cropGeometry(400,800,INITIAL_CROP)).toMatchObject({left:0,top:-.5,width:1,height:2});
 });
 it('확대하고 이동해도 사진 바깥이 드러나지 않는다',()=>{
  for(const [w,h] of [[400,800],[800,400],[400,400]])for(const zoom of [0,1,2,10]){
   const g=cropGeometry(w,h,{zoom,x:99,y:-99});
   expect(g.left).toBeLessThanOrEqual(0);expect(g.top).toBeLessThanOrEqual(0);
   expect(g.left+g.width).toBeGreaterThanOrEqual(1);expect(g.top+g.height).toBeGreaterThanOrEqual(1);
   expect(g.crop.zoom).toBeGreaterThanOrEqual(1);expect(g.crop.zoom).toBeLessThanOrEqual(4);
  }
 });
});
