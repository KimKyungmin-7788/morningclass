import type { ComponentType } from 'react';

// 기능(feature) = src/features/<이름>/ 폴더 하나.
// 폴더의 manifest.ts(x) 가 대시보드 카드 등을 등록하면 자동으로 화면에 붙는다.

export interface CardDef {
  /** 카드 고유 이름 (예: 'weather') */
  id: string;
  /** 대시보드 열 (0~3) */
  col: 0 | 1 | 2 | 3;
  /** 열 안에서의 순서 (작을수록 위) */
  order: number;
  /** 카드 내용. <CardFrame> 으로 감싸서 그린다. */
  Component: ComponentType;
}

export interface FeatureManifest {
  id: string;
  cards?: CardDef[];
}
