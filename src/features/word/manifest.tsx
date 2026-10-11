import { useState } from 'react';
import { CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { ensureAudio } from '@/core/sound';
import { useDay } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { useCurrentClass } from '@/core/data/store';
import type { FeatureManifest } from '../types';
import { emptyBook, wordOfDay, type WordBook } from './model';
import { WordWindow } from './WordWindow';

// 오늘의 낱말: 날마다 낱말 하나를 뜻 · 문장과 함께 보고, 읽고 · 쓰고 · 말해 본다.

function WordCard() {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const [saved, setBook] = useKv<WordBook>(`words:${cls?.id ?? ''}`, emptyBook());
  const book = { ...emptyBook(), ...saved };
  const [open, setOpen] = useState(false);
  const word = wordOfDay(book, date);

  return (
    <>
      <CardFrame id="word" label="오늘의 낱말" state="plain" className="wd-card" onOpen={() => { ensureAudio(); setOpen(true); }}>
        <CardTitle icon="ph-fill ph-book-open-text" tint="#dcfce7" color="#16a34a">오늘의 낱말</CardTitle>
        {word ? (
          <div className="wd-face"><b className={word.word.length > 4 ? 'long' : ''}>{word.word}</b><span>{word.meaning}</span></div>
        ) : <div className="card-hint">터치해서 낱말을 정해요 👆</div>}
      </CardFrame>
      {open && <WordWindow book={book} date={date} onSave={setBook} onClose={() => setOpen(false)} />}
    </>
  );
}

const manifest: FeatureManifest = { id: 'word', cards: [{ id: 'word', col: 0, order: 2, Component: WordCard }] };
export default manifest;
