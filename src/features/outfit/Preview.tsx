import { createRoot } from 'react-dom/client';
import { OutfitEditor } from './Editor';
import './preview.css';
import './outfit.css';
createRoot(document.getElementById('root')!).render(<main><header><h1>오늘은 어떤 옷?</h1><a href="/app.html?nocount">아침교실로 돌아가기 ↗</a></header><div className="outfit-shell outfit-preview-shell"><OutfitEditor onComplete={async () => { alert('시안이에요. 아침교실 카드에서 학생별로 저장할 수 있어요.'); }}/></div></main>);
