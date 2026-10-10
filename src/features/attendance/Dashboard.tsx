import { useMemo, useState } from 'react';
import { Popup } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { useData } from '@/core/data/store';
import { useDay } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { useRecordsOf } from '@/core/data/records';
import { MONTH_ORDER, aggregate, periodOf, rowsOf, schoolYearOf, schoolYearsOf, stepMonth, totalsOf, type Aggregate, type Row } from './model';
import { buildXlsx, type XlsxCell } from './xlsx';

// 출결 대시보드: 학년도·달·기간별 집계, 학생별 날짜 칸, 엑셀 저장, 인쇄

const WN = ['일', '월', '화', '수', '목', '금', '토'];
const ST: Record<string, [string, string]> = { late: ['late', '지각'], early: ['early', '조퇴'], absent: ['absent', '결석'] };
const dayLabel = (key: string) => {
  const y = Number(key.slice(0, 4)); const m = Number(key.slice(4, 6)); const d = Number(key.slice(6, 8));
  return { md: `${m}/${d}`, wn: WN[new Date(y, m - 1, d).getDay()] };
};
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function AttendanceDashboard({ onClose }: { onClose: () => void }) {
  const classes = useData((s) => s.classes);
  const base = useDay((s) => s.date);
  const [classId, setClassId] = useState(useData.getState().currentClassId);
  const [sy, setSy] = useState(schoolYearOf(base));
  const [month, setMonth] = useState(String(base.getMonth() + 1));
  const [range, setRange] = useState(periodOf(sy, month));
  const [view, setView] = useState<'all' | 'student'>('all');
  const [studentId, setStudentId] = useState('');
  const { records } = useRecordsOf(classId);
  const cls = classes.find((c) => c.id === classId);
  const [override, setOverride] = useKv<number | undefined>(`sd:${classId}_${range.start}_${range.end}`, undefined);

  const agg = useMemo(() => aggregate(cls, records ?? [], range.start, range.end), [cls, records, range]);
  const schoolDays = override != null ? Math.max(0, override) : agg.autoSchoolDays;
  const rows = rowsOf(agg, schoolDays);
  const tot = totalsOf(rows, schoolDays);
  const preset = (y: number, m: string) => { setSy(y); setMonth(m); setRange(periodOf(y, m)); };
  const step = (dir: 1 | -1) => { const next = stepMonth(month, dir); if (next) preset(sy, next); else toast('이 학년도의 처음/마지막 달이에요', 'error'); };
  const fmt = (iso: string) => `${Number(iso.slice(5, 7))}. ${Number(iso.slice(8, 10))}`;
  const title = `${cls?.schoolName ?? ''} ${cls?.className ?? ''}`.trim();

  const saveExcel = () => {
    const H = (v: string): XlsxCell => ({ v, s: 1 }); const C = (v: string | number): XlsxCell => ({ v, s: 2 });
    const L = (v: string): XlsxCell => ({ v, s: 3 }); const T = (v: string | number): XlsxCell => ({ v, s: 5 });
    const sum: XlsxCell[][] = [[{ v: `${title} 출결 현황`, s: 4 }], [{ v: '기간', s: 6 }, `${range.start} ~ ${range.end}`], [{ v: '수업일수', s: 6 }, schoolDays], [],
      ['번호', '이름', '출석일수', '지각', '조퇴', '결석', '출석률(%)'].map(H)];
    rows.forEach((r) => sum.push([C(r.no), L(r.name + (r.archived ? ' (보관)' : '')), C(r.attend), C(r.late), C(r.early), C(r.absent), { v: Math.round(r.rate * 10) / 10, s: 7 }]));
    sum.push([T('합계/평균'), T(''), T(tot.attend), T(tot.late), T(tot.early), T(tot.absent), { v: Math.round(tot.avg * 10) / 10, s: 7 }]);
    const det: XlsxCell[][] = [[{ v: '날짜별 출결 (○ 출석)', s: 4 }], [], [H('번호'), H('이름'), ...agg.days.map((d) => { const l = dayLabel(d.date); return H(`${l.md}(${l.wn})`); })]];
    // 결석 사유를 고른 날은 "결석(질병)"처럼 함께 적는다
    agg.students.forEach((st, i) => det.push([C(i + 1), L(st.name), ...agg.days.map((d) => { const a = d.att[st.id]; const lb = ST[a?.status ?? '']?.[1]; return C(lb ? (a?.reason ? `${lb}(${a.reason})` : lb) : '○'); })]));
    const blob = buildXlsx([{ name: '출결 현황', rows: sum, widths: [10, 14, 12, 9, 9, 9, 12] }, { name: '날짜별 출결', rows: det, widths: [8, 14, ...agg.days.map(() => 11)] }]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `출결_${(cls?.className || '학급').replace(/[\\/:*?"<>|\s]/g, '')}_${range.start}_${range.end}.xlsx`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    playSound('save'); toast('엑셀 파일(.xlsx)로 저장했어요 📊', 'success');
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) { toast('팝업이 차단됐어요. 팝업을 허용해 주세요', 'error'); return; }
    const trs = rows.map((r) => `<tr><td>${r.no}</td><td class="l">${esc(r.name)}</td><td>${r.attend}</td><td>${r.late}</td><td>${r.early}</td><td>${r.absent}</td><td>${Math.round(r.rate)}%</td></tr>`).join('');
    w.document.write(`<html><head><meta charset="utf-8"><title>출결 ${esc(cls?.className ?? '')}</title>
      <style>body{font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;padding:24px;color:#1e293b}h2{margin:0 0 4px;font-size:20px}.meta{color:#64748b;font-size:13px;margin-bottom:14px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:7px 9px;font-size:13px;text-align:center}th{background:#f1f5f9}.l{text-align:left}tfoot td{font-weight:800;background:#f8fafc}@media print{body{padding:0}}</style>
      </head><body><h2>${esc(title)} 출결 현황</h2>
      <div class="meta">기간 ${range.start} ~ ${range.end} · 수업일수 ${schoolDays}일 · 재적 ${rows.length}명 · 평균 출석률 ${tot.avg.toFixed(1)}%</div>
      <table><thead><tr><th>번호</th><th class="l">이름</th><th>출석일수</th><th>지각</th><th>조퇴</th><th>결석</th><th>출석률</th></tr></thead><tbody>${trs}</tbody>
      <tfoot><tr><td colspan="2">합계 / 평균</td><td>${tot.attend}</td><td>${tot.late}</td><td>${tot.early}</td><td>${tot.absent}</td><td>${tot.avg.toFixed(1)}%</td></tr></tfoot></table></body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch { /* 인쇄 창을 못 열어도 표는 보인다 */ } }, 350);
  };

  const tiles = (
    <div className="dash-tiles">
      <div className="dash-tile">
        <div className="n"><input className="dash-sd-input" type="number" min={0} aria-label="수업일수" key={`${classId}${range.start}${range.end}${schoolDays}`} defaultValue={schoolDays}
          onBlur={(e) => { const v = e.target.value.trim(); setOverride(v === '' || Number(v) === agg.autoSchoolDays ? undefined : Math.max(0, Number(v))); }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }} /></div>
        <div className="l">수업일수{override != null && <span style={{ color: '#f97316' }}> ·수정</span>}</div>
      </div>
      <div className="dash-tile"><div className="n">{rows.length}</div><div className="l">재적</div></div>
      <div className="dash-tile rate"><div className="n">{tot.avg.toFixed(1)}%</div><div className="l">평균 출석률</div></div>
      <div className="dash-tile late"><div className="n">{tot.late}</div><div className="l">지각</div></div>
      <div className="dash-tile early"><div className="n">{tot.early}</div><div className="l">조퇴</div></div>
      <div className="dash-tile absent"><div className="n">{tot.absent}</div><div className="l">결석</div></div>
    </div>
  );

  const table = !rows.length ? <div className="card-hint" style={{ padding: 24 }}>이 학급에 등록된 학생이 없어요</div>
    : schoolDays === 0 ? <div className="card-hint" style={{ padding: 24 }}>선택한 기간에 출석 기록이 없어요 📭</div>
    : (
      <table className="dash-table">
        <thead><tr><th>번호</th><th className="nm">이름</th><th>출석</th><th className="c-l">지각</th><th className="c-e">조퇴</th><th className="c-a">결석</th><th>출석률</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.no}</td>
              <td className="nm"><button className="dash-name" title="이 학생의 출결 보기" onClick={() => { setStudentId(r.id); setView('student'); }}>{r.name}{r.archived && <small style={{ color: '#94a3b8' }}> (보관)</small>}</button></td>
              <td>{r.attend}</td><td>{r.late}</td><td>{r.early}</td><td>{r.absent}</td>
              <td><div className="rate-cell"><div className="rate-bar"><div className={`rate-fill ${r.rate >= 90 ? 'g' : r.rate >= 80 ? 'y' : 'r'}`} style={{ width: `${Math.min(100, r.rate)}%` }} /></div><span>{Math.round(r.rate)}</span></div></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={2}>합계 / 평균</td><td>{tot.attend}</td><td>{tot.late}</td><td>{tot.early}</td><td>{tot.absent}</td><td>{tot.avg.toFixed(1)}%</td></tr></tfoot>
      </table>
    );

  return (
    <Popup title="📊 출결 대시보드" large onClose={onClose}>
      <div className="dash-filter">
        <select aria-label="학년도" value={sy} onChange={(e) => preset(Number(e.target.value), month)}>{schoolYearsOf(records ?? [], sy).map((y) => <option key={y} value={y}>{y}</option>)}</select>
        <select aria-label="학급" value={classId} onChange={(e) => setClassId(e.target.value)}>{classes.map((c) => <option key={c.id} value={c.id}>{c.className || c.schoolName || '학급'}</option>)}</select>
        <select aria-label="달" value={month} onChange={(e) => preset(sy, e.target.value)}>
          <option value="전체">전체</option>{MONTH_ORDER.map((m) => <option key={m} value={m}>{m}월</option>)}
        </select>
        <input type="date" aria-label="시작일" value={range.start} onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))} />
        <span className="dash-tilde">~</span>
        <input type="date" aria-label="종료일" value={range.end} onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))} />
      </div>
      <div id="dash-content">
        <div className="dash-period">
          <button className="dp-step" aria-label="이전 달" disabled={month === '전체'} onClick={() => step(-1)}>‹</button>
          <div className="dp-main">
            <div className="dp-sy">{sy}학년도</div>
            {month === '전체' ? <div className="dp-mo">3월~2월 <small>전체</small></div> : <div className="dp-mo">{Number(month)}<small>월</small></div>}
            <div className="dp-range">{fmt(range.start)} ~ {fmt(range.end)}</div>
          </div>
          <button className="dp-step" aria-label="다음 달" disabled={month === '전체'} onClick={() => step(1)}>›</button>
        </div>
        <div className="dash-view">
          <button className={`class-chip${view === 'all' ? ' active' : ''}`} onClick={() => setView('all')}>👥 전체 표</button>
          <button className={`class-chip${view === 'student' ? ' active' : ''}`} onClick={() => setView('student')}>🧑 학생별</button>
        </div>
        {records == null ? <div className="card-hint" style={{ padding: 24 }}>기록을 불러오는 중...</div>
          : view === 'student' && rows.length > 0 && schoolDays > 0
            ? <StudentView agg={agg} rows={rows} schoolDays={schoolDays} studentId={studentId} onPick={setStudentId} />
            : <>{tiles}{table}</>}
      </div>
      <div className="dash-actions">
        <span className="dash-note">엑셀 = 수정·계산용 데이터 · 인쇄 = 종이/PDF 보기용</span>
        <button className="btn-test" style={{ margin: 0 }} onClick={saveExcel}><span>📊</span> 엑셀로 저장</button>
        <button className="btn-test" style={{ margin: 0, background: 'var(--primary)' }} onClick={print}><span>🖨</span> 인쇄</button>
      </div>
    </Popup>
  );
}

/** 학생별 보기: 학생을 고르면 그 학생의 집계와 날짜별 출결 칸을 보여 준다 */
function StudentView({ agg, rows, schoolDays, studentId, onPick }: { agg: Aggregate; rows: Row[]; schoolDays: number; studentId: string; onPick: (id: string) => void }) {
  const r = rows.find((x) => x.id === studentId) ?? rows[0];
  const issues = agg.days.filter((d) => ST[d.att[r.id]?.status ?? '']).length;
  return (
    <>
      <div className="sv-chips">{rows.map((x) => <button key={x.id} className={`class-chip sv-chip${x.id === r.id ? ' active' : ''}`} onClick={() => onPick(x.id)}>{x.name}</button>)}</div>
      <div className="sv-head">🧑 {r.name} <small>{r.no}번{r.archived ? ' · 보관된 학생' : ''}</small></div>
      <div className="dash-tiles">
        <div className="dash-tile"><div className="n">{schoolDays}</div><div className="l">수업일수</div></div>
        <div className="dash-tile rate"><div className="n">{r.attend}</div><div className="l">출석</div></div>
        <div className="dash-tile late"><div className="n">{r.late}</div><div className="l">지각</div></div>
        <div className="dash-tile early"><div className="n">{r.early}</div><div className="l">조퇴</div></div>
        <div className="dash-tile absent"><div className="n">{r.absent}</div><div className="l">결석</div></div>
        <div className="dash-tile rate"><div className="n">{Math.round(r.rate)}%</div><div className="l">출석률</div></div>
      </div>
      <div className="sv-sub">날짜별 출결 <small>{issues ? `지각·조퇴·결석 ${issues}일` : '모두 출석했어요 🎉'}</small></div>
      <div className="sd-grid">
        {agg.days.map((d) => {
          const a = d.att[r.id];
          const [c, lb] = ST[a?.status ?? ''] ?? ['ok', '출석'];
          const l = dayLabel(d.date);
          return <div key={d.date} className={`sd-day ${c}`}><span className="dt">{l.md}<small>({l.wn})</small></span><b>{lb}{a?.reason ? ` · ${a.reason}` : ''}</b></div>;
        })}
      </div>
    </>
  );
}
