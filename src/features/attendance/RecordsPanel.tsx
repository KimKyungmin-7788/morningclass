import { useState } from 'react';
import { Popup } from '@/core/ui/Popup';
import { useCurrentClass } from '@/core/data/store';
import { useRecordsOf } from '@/core/data/records';
import { EMO_ZONES, emotionOf } from '@/core/data/emotions';
import type { DayRecord } from '@/core/data/types';
import { STATUS_LABEL } from './model';

// 이전 기록 보기: 지금 학급의 날짜별 기록 목록과 상세. 기록 하나를 지울 수 있다.

type Wx = { emoji?: string; label?: string; temp?: number } | null;

export function RecordsPanel({ onClose }: { onClose: () => void }) {
  const cls = useCurrentClass();
  const { records, remove } = useRecordsOf(cls?.id ?? '');
  const [picked, setPicked] = useState<string | null>(null);
  const list = [...(records ?? [])].reverse();                    // 최근 날짜 먼저
  const r = list.find((x) => x.date === picked);
  const nameOf = (id: string) => cls?.students.find((s) => s.id === id)?.name ?? '(알 수 없는 학생)';
  const names = (ids: string[]) => ids.map(nameOf).join(', ');

  const detail = (rec: DayRecord) => {
    const w = rec.weather as Wx; const d = rec.dust as Wx;
    const att = Object.entries(rec.attendance).map(([id, a]) => `${nameOf(id)}: ${STATUS_LABEL[a.status]}${a.reason ? ` (${a.reason})` : ''}`).join(', ');
    const ems = Object.entries(rec.emotions).map(([id, e]) => `${nameOf(id)}: ${e.items.length
      ? e.items.map((it) => { const em = emotionOf(it.k); return `${em?.e ?? ''}${em?.l ?? it.k}(${EMO_ZONES[it.zone] ?? ''})`; }).join(' ')
      : `${e.legacy?.emoji ?? ''} ${e.legacy?.label ?? ''}`}`).join(' · ');
    return (
      <div className="record-detail">
        <h4>날씨</h4><div className="row">{w ? `${w.emoji ?? ''} ${w.label ?? ''}${w.temp != null ? ` ${Math.round(w.temp)}°` : ''}` : '-'}</div>
        <h4>미세먼지</h4><div className="row">{d ? `${d.emoji ?? ''} ${d.label ?? ''}` : '-'}</div>
        <h4>출석</h4><div className="row">{att || '-'}</div>
        <h4>오늘의 도우미</h4><div className="row">{names(rec.helpers.ids) || '-'}</div>
        {rec.lucky.ids.length > 0 && <><h4>행운의 주인공</h4><div className="row">👑 {names(rec.lucky.ids)}</div></>}
        <h4>감정</h4><div className="row">{ems || '-'}</div>
        <h4>유의사항</h4><div className="row" style={{ whiteSpace: 'pre-wrap' }}>{rec.notes || '-'}</div>
        <h4>급식</h4><div className="row" style={{ whiteSpace: 'pre-wrap' }}>{rec.meal?.dishes.map((x) => x.name).join('\n') || '-'}</div>
        <button className="btn-test" style={{ background: 'var(--danger)', marginTop: 10 }}
          onClick={() => { if (confirm('정말 삭제할까요?')) { setPicked(null); void remove(rec.date); } }}>🗑️ 이 기록 삭제</button>
      </div>
    );
  };

  return (
    <Popup title="📂 이전 기록 보기" onClose={onClose}>
      {records == null ? <div className="card-hint">기록을 불러오는 중...</div>
        : !list.length ? <div className="card-hint">아직 저장된 기록이 없어요 📭</div>
        : (
          <>
            <div className="records-list">
              {list.map((x) => (
                <div key={x.date} className="record-item" role="button" tabIndex={0} aria-pressed={x.date === picked}
                  style={x.date === picked ? { borderColor: 'var(--primary)' } : undefined}
                  onClick={() => setPicked(x.date)} onKeyDown={(e) => { if (e.key === 'Enter') setPicked(x.date); }}>
                  <div className="dt">{x.date.slice(0, 4)}-{x.date.slice(4, 6)}-{x.date.slice(6, 8)}</div>
                  <div className="sm">{(x.weather as Wx)?.emoji ?? ''} {(x.dust as Wx)?.emoji ?? ''}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>{r && detail(r)}</div>
          </>
        )}
    </Popup>
  );
}
