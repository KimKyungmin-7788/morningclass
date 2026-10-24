import { emptyRecord, type StudentOutfit } from '@/core/data/types';
import { describe, expect, it } from 'vitest';
import { lastCompleted, dress, initialState, layers, visibleItems, wornItems } from './model';
describe('옷입히기 레이어와 옷장', () => {
  it('티셔츠 위에 재킷이 쌓이고 재킷만 벗겨도 티셔츠가 남는다', () => {
    const shirt=dress(initialState(),'shirt',true);
    const jacket=dress(shirt,'jacket',true);
    expect(layers(jacket.outfits.boy)).toEqual(['shirt','jacket']);
    expect(layers(dress(jacket,'jacket',false).outfits.boy)).toEqual(['shirt']);
    expect(shirt.outfits.boy.outer).toBeUndefined();
  });
  it('바지와 신발을 독립적으로 바꾸며 기본 반바지로 되돌린다', () => {
    const dressed=dress(dress(dress(initialState(),'shirt',true),'pants',true),'sneakers',true);
    const boots=dress(dressed,'boots',true);
    expect(layers(boots.outfits.boy)).toEqual(['pants','shirt','boots']);
    const shorts=dress(boots,'shorts',true);
    expect(layers(shorts.outfits.boy)).toEqual(['shirt','boots']);
    expect(shorts.outfits.boy.bottom).toBe('shorts');
    expect(dressed.outfits.boy.shoes).toBe('sneakers');
  });
  it('재킷을 패딩으로 교체해도 스웨터·바지·신발은 남는다', () => {
    let s=initialState();
    for(const item of ['sweater','pants','boots','jacket'] as const) s=dress(s,item,true);
    const winter=dress(s,'puffer',true);
    expect(layers(winter.outfits.boy)).toEqual(['pants','sweater','puffer','boots']);
    expect(layers(dress(winter,'puffer',false).outfits.boy)).toEqual(['pants','sweater','boots']);
  });
  it('남학생과 여학생의 옷차림을 따로 유지한다', () => {
    const boy=dress(initialState(),'pants',true);
    const girl=dress({...boy,avatar:'girl'},'boots',true);
    expect(girl.outfits.boy.bottom).toBe('pants');
    expect(girl.outfits.boy.shoes).toBeUndefined();
    expect(girl.outfits.girl.bottom).toBe('shorts');
    expect(girl.outfits.girl.shoes).toBe('boots');
  });
  it('계절·부위로 옷을 고르고 비 오는 날에는 장화를 먼저 보여준다', () => {
    expect(visibleItems('여름','bottom','맑음').map(i=>i.id)).toEqual(['summer-coral-shorts','shorts','summer-shorts']);
    expect(visibleItems('겨울','outer','눈').map(i=>i.id)).toEqual(['puffer','winter-coat','winter-camel-coat']);
    expect(visibleItems('all','outer','맑음').filter(i=>i.slot==='outer')).toHaveLength(9);
    expect(visibleItems('가을','accessory','비').map(i=>i.id)).toEqual(expect.arrayContaining(['boots','umbrella']));
  });
  it('옷장 필터를 바꿔도 입은 옷과 기본 상·하의는 유지한다', () => {
    const s=dress(initialState(),'shirt',true);
    visibleItems('겨울','outer','눈');
    expect(wornItems(s.outfits.boy)).toEqual(['shirt','shorts']);
    expect(dress(s,'shirt',false).outfits.boy.top).toBe('base-shirt');
    expect(dress(s,'pants',false)).toBe(s);
  });
});

it('마지막 완료 학생만 고르며 보관·다른 날짜의 학생은 제외한다',()=>{
 const record=emptyRecord('c','20261023');
 const value:StudentOutfit={avatar:'boy',clothes:{top:'shirt',bottom:'pants'},season:'가을',weather:'맑음',completedAt:'2026-10-23T01:00:00Z'};
 record.outfits={a:value,b:{...value,completedAt:'2026-10-23T02:00:00Z'}};
 record.lastOutfitStudentId='a';
 expect(lastCompleted(record,['a','b'])).toBe('a');
 expect(lastCompleted(record,['b'])).toBe('b');
 expect(lastCompleted(emptyRecord('c','20261024'),['a','b'])).toBeUndefined();
});

it('봄 소품은 신발과 분리되고 모자와 스카프를 함께 입힌다',()=>{
 let state=initialState();for(const item of ['stripe-shirt','pink-cardigan','chinos','spring-cap','spring-scarf','sneakers'] as const) state=dress(state,item,true);
 expect(state.outfits.boy.hat).toBe('spring-cap');expect(state.outfits.boy.neck).toBe('spring-scarf');
 expect(layers(state.outfits.boy)).toEqual(['chinos','stripe-shirt','pink-cardigan','sneakers','spring-cap','spring-scarf']);
 expect(dress(state,'spring-cap',false).outfits.boy.neck).toBe('spring-scarf');
 expect(visibleItems('봄','accessory','바람').map(i=>i.id)).toEqual(['sneakers','pink-sneakers','boots','spring-cap','spring-scarf','umbrella']);
 expect(visibleItems('봄','accessory','맑음').some(i=>i.slot==='shoes')).toBe(true);
});

it('여름·가을·겨울 전용 아이템을 해당 계절에서만 보여준다',()=>{
 const summer=visibleItems('여름','all','맑음').map(i=>i.id);
 const autumn=visibleItems('가을','all','바람').map(i=>i.id);
 const winter=visibleItems('겨울','all','눈').map(i=>i.id);
 expect(summer).toEqual(expect.arrayContaining(['lemon-shirt','summer-shorts','sun-hat']));
 expect(autumn).toEqual(expect.arrayContaining(['rust-sweatshirt','denim-jacket','cargo-pants']));
 expect(winter).toEqual(expect.arrayContaining(['winter-coat','knit-hat','wool-scarf']));
 expect(summer).not.toContain('winter-coat');expect(winter).not.toContain('summer-shorts');expect(autumn).not.toContain('sun-hat');
 const state=dress(dress(initialState(),'rust-sweatshirt',true),'winter-coat',true);
 expect(dress(state,'winter-coat',false).outfits.boy.top).toBe('rust-sweatshirt');
});

it('우산은 신발·모자와 함께 착용하고 독립적으로 벗는다',()=>{
 let state=initialState();for(const item of ['boots','spring-cap','umbrella'] as const) state=dress(state,item,true);
 expect(layers(state.outfits.boy)).toEqual(['boots','spring-cap','umbrella']);
 expect(dress(state,'umbrella',false).outfits.boy).toEqual({top:'base-shirt',bottom:'shorts',shoes:'boots',hat:'spring-cap'});
 expect(visibleItems('all','accessory','비').map(i=>i.id)).toEqual(visibleItems('all','accessory','맑음').map(i=>i.id));
});

it('모든 기존 옷과 아바타가 새 화풍 파일·좌표에 연결된다',async()=>{
 const {outfitAsset,outfitRegistration}=await import('@/core/ui/outfitAssets');
 const {ITEMS}=await import('./model');
 const {existsSync}=await import('node:fs');
 for(const name of ['boy','girl',...ITEMS.map(i=>i.image)]){
   expect(existsSync(`public${outfitAsset(name)}`)).toBe(true);
   expect(JSON.stringify(outfitRegistration(name))).not.toContain('NaN');
 }
});

it('새 신발은 기존 바지와 상의를 보존하며 교체되고 계절에 맞게 표시된다',()=>{
 let state=dress(dress(initialState(),'pants',true),'shirt',true);
 for(const shoe of ['pink-sneakers','sandals','winter-shoes'] as const){state=dress(state,shoe,true);expect(state.outfits.boy).toEqual({top:'shirt',bottom:'pants',shoes:shoe});}
 expect(visibleItems('여름','accessory','맑음').map(i=>i.id)).toContain('sandals');
 expect(visibleItems('겨울','accessory','눈').map(i=>i.id)).not.toContain('sandals');
 expect(visibleItems('겨울','accessory','눈').map(i=>i.id)).toContain('winter-shoes');
});


it('계절별 새 옷 4벌씩 모두 독립적으로 입고 벗을 수 있다',async()=>{
 const {OUTFIT_VARIANTS}=await import('@/core/ui/outfitVariants');
 const {ITEMS}=await import('./model');
 const {GARMENT_RIGS}=await import('@/core/ui/outfitRig');
 for(const season of ['봄','여름','가을','겨울'] as const){
  const added=ITEMS.filter(i=>i.id in OUTFIT_VARIANTS&&i.seasons.includes(season));
  expect(added).toHaveLength(4);
  expect(added.map(i=>i.slot)).toEqual(['top','top','bottom','outer']);
  for(const item of added){
   expect(GARMENT_RIGS[item.id].length).toBeGreaterThan(0);
   const state=dress(initialState(),item.id,true);
   expect(state.outfits.boy[item.slot]).toBe(item.id);
   expect(dress(state,item.id,false).outfits.boy[item.slot]).not.toBe(item.id);
  }
 }
});
