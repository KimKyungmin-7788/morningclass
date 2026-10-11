import { useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact } from '@/core/ui/slot';
import { ensureAudio } from '@/core/sound';
import { useDay } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { useCurrentClass } from '@/core/data/store';
import type { CardProps, FeatureManifest } from '../types';
import { emptyBook, wordOfDay, type WordBook } from './model';
import { WordWindow } from './WordWindow';

// 오늘의 낱말: 날마다 낱말 하나를 뜻 · 문장과 함께 보고, 읽고 · 쓰고 · 말해 본다.

const TITLE = { icon: 'ph-fill ph-book-open-text', tint: '#dcfce7', color: '#16a34a' };

function WordCard({ size }: CardProps) {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const [saved, setBook] = useKv<WordBook>(`words:${cls?.id ?? ''}`, emptyBook());
  const book = { ...emptyBook(), ...saved };
  const [open, setOpen] = useState(false);
  const word = wordOfDay(book, date);
  const done = useDay((s) => s.record.wordDone === true);   // 다같이 써보기를 마쳤는지

  return (
    <>
      <CardFrame id="word" label="오늘의 낱말" state="plain" className="wd-card" onOpen={() => { ensureAudio(); setOpen(true); }}>
        {isCompact(size) ? <CardCompact {...TITLE} title="오늘의 낱말" done={done}>{word ? word.word : '낱말을 정해요'}</CardCompact> : <>
        <CardTitle {...TITLE} extra={done ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 낱말</CardTitle>
        {word ? (
          <div className="wd-face"><b className={word.word.length > 4 ? 'long' : ''}>{word.word}</b><span>{word.meaning}</span>{size === 'large' && word.sentence && <q className="wd-sentence">{word.sentence}</q>}</div>
        ) : <div className="card-hint">터치해서 낱말을 정해요 👆</div>}
        </>}
      </CardFrame>
      {open && <WordWindow book={book} date={date} onSave={setBook} onClose={() => setOpen(false)} />}
    </>
  );
}

const manifest: FeatureManifest = { id: 'word', cards: [{ id: 'word', title: '오늘의 낱말', ...TITLE, Component: WordCard }] };
export default manifest;
