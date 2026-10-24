import { create } from 'zustand';

/** 카드와 날씨 결과에서 같은 옷입히기 창을 연다. 저장 자료와 분리한다. */
export const useOutfitWindow = create<{open:boolean; show:()=>void; close:()=>void}>(set=>({open:false,show:()=>set({open:true}),close:()=>set({open:false})}));
