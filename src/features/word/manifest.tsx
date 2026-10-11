import { useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact } from '@/core/ui/slot';
import { ensureAudio, playSound } from '@/core/sound';
import { useDay } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { useCurrentClass } from '@/core/data/store';
import type { CardProps, FeatureManifest } from '../types';
import { emptyBook, normalizeBook, pickOfDay, type WordBook, type WordLevel } from './model';
import { LevelToggle, WordWindow } from './WordWindow';

// 오늘의 어휘: 날마다 낱말 하나를 뜻 · 문장과 함께 보고, 읽고 · 쓰고 · 말해 본다.
// 카드에서 바로 단계(가 · 나 · 다)를 바꿀 수 있다.

const TITLE = { icon: 'ph-fill ph-book-open-text', tint: '#dcfce7', color: '#16a34a' };

function WordCard({ size }: CardProps) {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const [saved, setBook] = useKv<WordBook>(`words:${cls?.id ?? ''}`, emptyBook());
  const book = normalizeBook(saved);
  const [open, setOpen] = useState(false);
  const pick = pickOfDay(book, date);
  const word = pick?.entry;
  const done = useDay((s) => s.record.wordDone === true);   // 다같이 써보기를 마쳤는지
  const setLevel = (level: WordLevel) => {
    ensureAudio(); playSound('select');
    setBook({ ...book, level });
  };

  return (
    <>
      <CardFrame id="word" label="오늘의 어휘" state="plain" className="wd-card" onOpen={() => { ensureAudio(); setOpen(true); }}>
        {isCompact(size) ? <CardCompact {...TITLE} title="오늘의 어휘" done={done}>{word ? word.word : '어휘를 정해요'}</CardCompact> : <>
        <CardTitle {...TITLE} extra={<><LevelToggle level={book.level} onChange={setLevel} />{done && <span className="v3-check"><i className="ph-bold ph-check" /></span>}</>}>오늘의 어휘</CardTitle>
        {word ? (
          <div className="wd-face">
            {size === 'large' && pick.topic && <em className="wd-chip">{pick.topic}</em>}
            <b className={word.word.length > 4 ? 'long' : ''}>{word.word}</b><span>{word.meaning}</span>{size === 'large' && word.sentence && <q className="wd-sentence">{word.sentence}</q>}
          </div>
        ) : <div className="card-hint">터치해서 어휘를 정해요 👆</div>}
        </>}
      </CardFrame>
      {open && <WordWindow book={book} date={date} onSave={setBook} onClose={() => setOpen(false)} />}
    </>
  );
}

const manifest: FeatureManifest = { id: 'word', cards: [{ id: 'word', title: '오늘의 어휘', ...TITLE, Component: WordCard }] };
export default manifest;
