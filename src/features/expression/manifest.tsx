import { useState } from 'react';
import { CardCompact, CardFrame, CardTitle } from '@/core/ui/CardFrame';
import { isCompact } from '@/core/ui/slot';
import { ensureAudio } from '@/core/sound';
import { useDay } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { activeStudents, useCurrentClass } from '@/core/data/store';
import type { CardProps, FeatureManifest } from '../types';
import { TO_LABEL } from './data';
import { doneList, emptyExprBook, normalizeExprBook, pickExpr } from './model';
import { ExprWindow, SceneImage } from './ExprWindow';

// 오늘의 생활표현: 상황 그림을 보고, 모든 학생이 자기 수준으로 연습한다 — 문장 · 낱말은 말하고 녹음해 들어 보고, 그림 카드는 두 장 중 맞는 카드를 고른다.
// ✓ = 배치된 학생이 모두 따라 말하기를 마침.

const TITLE = { icon: 'ph-fill ph-chats-circle', tint: '#ccfbf1', color: '#0d9488' };

function ExpressionCard({ size }: CardProps) {
  const date = useDay((s) => s.date);
  const doneIds = doneList(useDay((s) => s.record.exprDone));
  const cls = useCurrentClass();
  const [saved] = useKv(`expr:${cls?.id ?? ''}`, emptyExprBook());
  const book = normalizeExprBook(saved);
  const placed = activeStudents(cls).filter((st) => book.levels[st.id]);
  const doneCount = placed.filter((st) => doneIds.includes(st.id)).length;
  const allDone = placed.length > 0 && doneCount === placed.length;
  const [open, setOpen] = useState(false);
  const { topic, situation: s, index } = pickExpr(date);
  const status = placed.length ? `따라 말하기 ${doneCount}/${placed.length}명` : s.title;
  return (
    <>
      <CardFrame id="expression" label="오늘의 생활표현" state="plain" className="ex-card" onOpen={() => { ensureAudio(); setOpen(true); }}>
        {isCompact(size) ? <CardCompact {...TITLE} title="오늘의 생활표현" done={allDone}>{status}</CardCompact> : <>
          <CardTitle {...TITLE} extra={allDone ? <span className="v3-check"><i className="ph-bold ph-check" /></span> : undefined}>오늘의 생활표현</CardTitle>
          <div className="ex-face">
            <em className="wd-chip ex-chip">{topic.name} · {TO_LABEL[s.to]}</em>
            <SceneImage s={s} className="face" />
            <span className="ex-face-scene">{size === 'large' ? s.scene : s.title}</span>
            <b>이럴 땐 뭐라고 말할까?</b>
            {placed.length > 0 && <span className="ex-face-status">{status}</span>}
          </div>
        </>}
      </CardFrame>
      {open && <ExprWindow topic={topic} today={index} date={date} onClose={() => setOpen(false)} />}
    </>
  );
}

const manifest: FeatureManifest = { id: 'expression', cards: [{ id: 'expression', title: '오늘의 생활표현', ...TITLE, Component: ExpressionCard }] };
export default manifest;
