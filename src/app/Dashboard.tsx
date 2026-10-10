import { cardsOfColumn } from '@/features/registry';
import type { CardDef } from '@/features/types';

const COLUMNS: CardDef['col'][] = [0, 1, 2, 3];

// 대시보드 4열. 어떤 카드가 어디에 놓일지는 각 기능의 manifest 가 정한다.
export function Dashboard() {
  return (
    <main>
      {COLUMNS.map((col) => (
        <div className="col" key={col}>
          {cardsOfColumn(col).map(({ id, Component }) => <Component key={id} />)}
        </div>
      ))}
    </main>
  );
}
