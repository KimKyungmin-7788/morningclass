import type { OptionKey } from './store';

// 판서 도구 목록. 새 도구는 여기에 한 줄을 더하면 왼쪽 도구 상자에 단추가 생긴다.
// 칠판은 도구 이름이 아니라 behavior(누르고 끌 때 하는 일)만 보고 움직인다.

export type ToolId = 'select' | 'hand' | 'pen' | 'highlighter' | 'eraser';
export type ToolBehavior = 'select' | 'pan' | 'draw' | 'erase';

export interface ToolDef {
  id: ToolId;
  name: string;
  /** 칠판 위에서의 마우스 모양 */
  cursor: string;
  /** 옵션 카드에 보일 것. 비어 있으면 옵션이 없는 도구(로고가 회색) */
  options: OptionKey[];
  behavior: ToolBehavior;
}

export const TOOLS: ToolDef[] = [
  { id: 'select', name: '선택', cursor: 'default', options: [], behavior: 'select' },
  { id: 'hand', name: '손', cursor: 'grab', options: [], behavior: 'pan' },
  { id: 'pen', name: '펜', cursor: 'crosshair', options: ['color', 'size', 'style'], behavior: 'draw' },
  { id: 'highlighter', name: '형광펜', cursor: 'crosshair', options: ['color', 'size'], behavior: 'draw' },
  { id: 'eraser', name: '지우개', cursor: 'none', options: ['size'], behavior: 'erase' },   // 지우개는 크기를 보여 주는 동그라미가 마우스 모양을 대신한다
];

export const getTool = (id: ToolId): ToolDef => TOOLS.find((t) => t.id === id) ?? TOOLS[0];
