import type { OutfitAvatar, OutfitClothes, OutfitItem, DayRecord } from '@/core/data/types';
export type Avatar = OutfitAvatar;
export type Slot = 'top' | 'bottom' | 'outer' | 'shoes' | 'hat' | 'neck' | 'hand';
export type Category = 'all' | 'top' | 'bottom' | 'outer' | 'accessory';
export type Item = OutfitItem;
export type Season = '봄' | '여름' | '가을' | '겨울';
export type Weather = '맑음' | '비' | '눈' | '바람';
export interface Garment { id: Item; slot: Slot; name: string; sub: string; seasons: Season[]; weather?: Weather[]; image: string; base?: boolean }
const ALL: Season[] = ['봄','여름','가을','겨울'];
export const ITEMS: Garment[] = [
  {id:'spring-flower-shirt',slot:'top',name:'꽃무늬 반팔',sub:'',seasons:['봄'],image:'spring-flower-shirt'},
  {id:'spring-mint-knit',slot:'top',name:'민트 줄무늬 니트',sub:'',seasons:['봄'],image:'spring-mint-knit'},
  {id:'spring-lavender-pants',slot:'bottom',name:'연보라 면바지',sub:'',seasons:['봄'],image:'spring-lavender-pants'},
  {id:'spring-yellow-cardigan',slot:'outer',name:'노란 꽃 카디건',sub:'',seasons:['봄'],image:'spring-yellow-cardigan'},
  {id:'summer-ocean-shirt',slot:'top',name:'바다색 반팔',sub:'',seasons:['여름'],image:'summer-ocean-shirt'},
  {id:'summer-watermelon-shirt',slot:'top',name:'수박 반팔',sub:'',seasons:['여름'],image:'summer-watermelon-shirt'},
  {id:'summer-coral-shorts',slot:'bottom',name:'산호색 반바지',sub:'',seasons:['여름'],image:'summer-coral-shorts'},
  {id:'summer-sky-jacket',slot:'outer',name:'하늘색 얇은 점퍼',sub:'',seasons:['여름'],image:'summer-sky-jacket'},
  {id:'autumn-burgundy-knit',slot:'top',name:'와인색 니트',sub:'',seasons:['가을'],image:'autumn-burgundy-knit'},
  {id:'autumn-check-top',slot:'top',name:'갈색 체크 긴팔',sub:'',seasons:['가을'],image:'autumn-check-top'},
  {id:'autumn-brown-cargo',slot:'bottom',name:'갈색 카고바지',sub:'',seasons:['가을'],image:'autumn-brown-cargo'},
  {id:'autumn-cream-jacket',slot:'outer',name:'크림색 재킷',sub:'',seasons:['가을'],image:'autumn-cream-jacket'},
  {id:'winter-snow-knit',slot:'top',name:'파란 눈꽃 니트',sub:'',seasons:['겨울'],image:'winter-snow-knit'},
  {id:'winter-red-knit',slot:'top',name:'빨간 꽈배기 니트',sub:'',seasons:['겨울'],image:'winter-red-knit'},
  {id:'winter-gray-pants',slot:'bottom',name:'회색 기모바지',sub:'',seasons:['겨울'],image:'winter-gray-pants'},
  {id:'winter-camel-coat',slot:'outer',name:'갈색 떡볶이코트',sub:'',seasons:['겨울'],image:'winter-camel-coat'},

  {id:'pink-sneakers',slot:'shoes',name:'분홍 벨크로 운동화',sub:'',seasons:ALL,image:'pink-sneakers'},
  {id:'sandals',slot:'shoes',name:'민트 샌들',sub:'',seasons:['여름'],weather:['맑음'],image:'sandals'},
  {id:'winter-shoes',slot:'shoes',name:'갈색 방한화',sub:'',seasons:['겨울'],weather:['눈'],image:'winter-shoes'},
  {id:'umbrella',slot:'hand',name:'노란 우산',sub:'',seasons:ALL,weather:['비'],image:'umbrella'},
  {id:'base-shirt',slot:'top',name:'크림 티셔츠',sub:'기본 반팔',seasons:['봄','여름','가을'],image:'boy',base:true},
  {id:'shirt',slot:'top',name:'산호색 티셔츠',sub:'가벼운 반팔',seasons:['봄','여름','가을'],image:'shirt'},
  {id:'sweater',slot:'top',name:'포근한 스웨터',sub:'따뜻한 긴팔',seasons:['봄','가을','겨울'],image:'sweater'},
  {id:'shorts',slot:'bottom',name:'반바지',sub:'시원한 기본 바지',seasons:['여름'],image:'boy',base:true},
  {id:'pants',slot:'bottom',name:'긴바지',sub:'다리를 따뜻하게',seasons:['봄','가을','겨울'],image:'pants'},
  {id:'jacket',slot:'outer',name:'민트 재킷',sub:'가볍게 걸치는 겉옷',seasons:['봄','가을'],weather:['바람'],image:'jacket-v2'},
  {id:'puffer',slot:'outer',name:'겨울 패딩',sub:'추운 날의 겉옷',seasons:['겨울'],weather:['눈','바람'],image:'puffer'},
  {id:'sneakers',slot:'shoes',name:'운동화',sub:'편안하게 걷기',seasons:ALL,image:'sneakers'},
  {id:'stripe-shirt',slot:'top',name:'하늘색 줄무늬 티셔츠',sub:'',seasons:['봄','여름','가을'],image:'stripe-shirt'},
  {id:'pink-cardigan',slot:'outer',name:'분홍 카디건',sub:'',seasons:['봄','가을'],weather:['바람'],image:'pink-cardigan-v2'},
  {id:'chinos',slot:'bottom',name:'베이지 면바지',sub:'',seasons:['봄','가을'],image:'chinos'},
  {id:'spring-cap',slot:'hat',name:'초록 모자',sub:'',seasons:['봄','여름','가을'],weather:['맑음'],image:'spring-cap'},
  {id:'spring-scarf',slot:'neck',name:'물방울 스카프',sub:'',seasons:['봄','가을'],weather:['바람'],image:'spring-scarf'},
  {id:'lemon-shirt',slot:'top',name:'레몬 티셔츠',sub:'',seasons:['여름'],image:'lemon-shirt'},
  {id:'summer-shorts',slot:'bottom',name:'하늘색 청반바지',sub:'',seasons:['여름'],image:'summer-shorts'},
  {id:'sun-hat',slot:'hat',name:'리본 밀짚모자',sub:'',seasons:['여름'],weather:['맑음'],image:'sun-hat'},
  {id:'rust-sweatshirt',slot:'top',name:'단풍 맨투맨',sub:'',seasons:['가을','겨울'],image:'rust-sweatshirt'},
  {id:'denim-jacket',slot:'outer',name:'파란 청재킷',sub:'',seasons:['가을'],weather:['바람'],image:'denim-jacket'},
  {id:'cargo-pants',slot:'bottom',name:'카키 카고바지',sub:'',seasons:['가을','겨울'],image:'cargo-pants'},
  {id:'winter-coat',slot:'outer',name:'남색 떡볶이코트',sub:'',seasons:['겨울'],weather:['눈','바람'],image:'winter-coat'},
  {id:'knit-hat',slot:'hat',name:'자주색 방울모자',sub:'',seasons:['겨울'],weather:['눈','바람'],image:'knit-hat'},
  {id:'wool-scarf',slot:'neck',name:'청록 니트목도리',sub:'',seasons:['겨울'],weather:['눈','바람'],image:'wool-scarf'},
  {id:'boots',slot:'shoes',name:'장화',sub:'비 오는 날에',seasons:ALL,weather:['비'],image:'boots'},
];
export const garment = (id: Item): Garment => ITEMS.find(i=>i.id===id)!;
export type Outfit = OutfitClothes;
export interface OutfitState { avatar: Avatar; outfits: Record<Avatar, Outfit> }
const basic = (): Outfit => ({top:'base-shirt',bottom:'shorts'});
export const initialState = (): OutfitState => ({ avatar:'boy',outfits:{boy:basic(),girl:basic()} });
/** 같은 부위만 교체한다. 기본 상·하의는 항상 남는다. */
export function dress(state: OutfitState, item: Item, on: boolean): OutfitState {
  const slot=garment(item).slot;
  const current=state.outfits[state.avatar];
  if (!on && current[slot]!==item) return state;
  const next={...current};
  if(on) next[slot]=item;
  else if(slot==='top') next.top='base-shirt';
  else if(slot==='bottom') next.bottom='shorts';
  else delete next[slot];
  return {...state,outfits:{...state.outfits,[state.avatar]:next}};
}
export function wornItems(outfit: Outfit): Item[] {
  return (['top','bottom','outer','shoes','hat','neck','hand'] as const).flatMap(slot=>outfit[slot]?[outfit[slot]!]:[]);
}
export function layers(outfit: Outfit): Item[] {
  return (['bottom','top','outer','shoes','hat','neck','hand'] as const).flatMap(slot=>outfit[slot]&&!garment(outfit[slot]!).base?[outfit[slot]!]:[]);
}
/** 날씨를 바꿔도 신발 → 모자 → 목도리 → 우산 위치를 유지한다. */
const ACCESSORY_ORDER: Item[] = ['sneakers','pink-sneakers','sandals','boots','winter-shoes','spring-cap','sun-hat','knit-hat','spring-scarf','wool-scarf','umbrella'];
export function visibleItems(season: Season|'all',category: Category,weather: Weather): Garment[] {
  return ITEMS.filter(i=>(season==='all'||i.seasons.includes(season))&&(category==='all'||(category==='accessory' ? ['shoes','hat','neck','hand'].includes(i.slot) : i.slot===category)))
    .sort((a,b)=>category==='accessory'
      ? ACCESSORY_ORDER.indexOf(a.id)-ACCESSORY_ORDER.indexOf(b.id)
      : Number(!!b.weather?.includes(weather))-Number(!!a.weather?.includes(weather)));
}

/** 보관된 학생은 마지막 완료 후보에서 제외한다. */
export function lastCompleted(record: DayRecord, studentIds: string[]): string | undefined {
  const ids = studentIds.filter(id => record.outfits?.[id]);
  if (record.lastOutfitStudentId && ids.includes(record.lastOutfitStudentId)) return record.lastOutfitStudentId;
  return ids.sort((a,b) => record.outfits![b].completedAt.localeCompare(record.outfits![a].completedAt))[0];
}
