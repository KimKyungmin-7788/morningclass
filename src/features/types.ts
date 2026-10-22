import type { ComponentType } from 'react';
import type { SlotSize } from '@/core/ui/slot';

// 기능(feature) = src/features/<이름>/ 폴더 하나.
// 폴더의 manifest.ts(x) 가 대시보드 카드 등을 등록한다. 어느 칸에 놓일지는 배치표(layout/model.ts)가 정한다.

export interface CardDef {
  /** 카드 고유 이름 (예: 'weather') */
  id: string;
  /** 보관함에 보이는 이름과 아이콘 (카드 제목 줄과 같게) */
  title: string;
  icon: string;
  tint: string;
  color: string;
  /** 카드 내용. <CardFrame> 으로 감싸서 그린다. 놓인 칸의 크기를 받아 모습을 바꾼다. */
  Component: ComponentType<CardProps>;
}

export interface CardProps {
  /** 카드가 놓인 칸의 크기 */
  size: SlotSize;
}

export interface FeatureManifest {
  id: string;
  cards?: CardDef[];
  /** 헤더 자리와 전역 창: 대시보드 카드 없이 등록할 수 있다. */
  Header?: ComponentType;
  Overlay?: ComponentType;
}
