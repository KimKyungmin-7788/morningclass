import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { useCurrentClass, useData } from '@/core/data/store';
import { activeStudents } from '@/core/data/store';
import { dateKeyOf, useDay } from '@/core/data/day';
import { SCHOOL_LEVELS, guessLevel, schoolLevelOf } from '@/core/data/subjects';
import { addNames, moveStudent, removeStudent, renameStudent, usedStudentIds } from '@/core/data/roster';
import { recordsOf } from '@/core/data/backupActions';
import { fetchMealRows, pickLunch, searchSchools, type SchoolRow } from '@/core/net/neis';
import type { ClassRoom } from '@/core/data/types';
import { AttendanceDashboard } from '@/features/attendance/Dashboard';
import { TimetableTab } from './TimetableTab';
import { BackupTab } from './BackupTab';

// 설정 창. 학급정보·학생·영상은 [저장]을 눌러야 반영되고, 시간표·과목·백업은 바꾸는 즉시 저장된다.

type Tab = 'info' | 'students' | 'timetable' | 'book' | 'data' | 'backup';
const TABS: [Tab, string][] = [['info', '🏫 학급정보'], ['students', '👨‍🎓 학생'], ['timetable', '📅 시간표'], ['book', '📹 영상 재생'], ['data', '📊 출결 대시보드'], ['backup', '💾 백업']];
const nameOf = (c: ClassRoom) => c.className || c.schoolName || '새 학급';

export function Settings({ onClose }: { onClose: () => void }) {
  const cls = useCurrentClass()!;
  const { classes, setCurrentClass, addClass, deleteClass, saveClass } = useData();
  const [draft, setDraft] = useState<ClassRoom>(() => structuredClone(cls));
  // 처음 열 때: 학급 정보가 갖춰졌으면 출결 대시보드, 아니면 학급정보부터
  const [tab, setTab] = useState<Tab>(() => (cls.className.trim() && activeStudents(cls).length ? 'data' : 'info'));
  const [closing, setClosing] = useState(false);
  const [used, setUsed] = useState<Set<string>>(new Set());
  const patch = (p: Partial<ClassRoom>) => setDraft((d) => ({ ...d, ...p }));

  // 다른 학급으로 바꾸면 그 학급의 내용으로 다시 채운다
  useEffect(() => { setDraft(structuredClone(useData.getState().classes.find((c) => c.id === cls.id)!)); }, [cls.id]);
  // 기록이 있는 학생은 지워도 '보관된 학생'으로 남기기 위해, 누가 기록에 나오는지 미리 읽어 둔다
  useEffect(() => { void recordsOf(cls.id).then((r) => setUsed(usedStudentIds(r, cls.allergies))); }, [cls.id, cls.allergies]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const close = () => { setClosing(true); setTimeout(onClose, 180); };
  /** 편집 중이던 내용을 지금 학급에 저장한다 (과목 설정은 즉시 저장분이 최신이므로 그쪽을 따른다) */
  const commit = async () => {
    const stored = useData.getState().classes.find((c) => c.id === draft.id);
    await saveClass({ ...draft, subjects: stored?.subjects ?? draft.subjects, options: { ...stored?.options, video: draft.options.video } });
  };
  const save = async () => { await commit(); playSound('save'); toast('설정 저장 완료!', 'success'); close(); };
  const switchTo = async (id: string) => { if (id !== cls.id) { await commit(); await setCurrentClass(id); } };
  const addNew = async () => { await commit(); await addClass(); setTab('info'); toast('새 학급을 추가했어요. 학급명과 학생을 입력하세요', 'success'); };

  const switcher = (label: string, hint: string) => (
    <div className="field">
      <label>{label}</label>
      <div className="class-switcher">
        {classes.map((c) => (
          <button key={c.id} className={`class-chip${c.id === cls.id ? ' active' : ''}`} onClick={() => void switchTo(c.id)}>{nameOf(c.id === cls.id ? draft : c)}</button>
        ))}
        <button className="class-chip add" onClick={() => void addNew()}>＋ 새 학급</button>
      </div>
      <div className="hint">{hint} 현재 학급: <b>{nameOf(draft)}</b></div>
    </div>
  );

  return createPortal(
    <div className={`popup-overlay active${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="popup-card large">
        <div className="popup-header">
          <h2 className="popup-title" id="settings-title">⚙️ 설정</h2>
          <button className="popup-close" aria-label="닫기" onClick={close}>✕</button>
        </div>
        <div className="settings-modal">
          <div className="settings-tabs" id="settings-tabs">
            {TABS.map(([k, label]) => <button key={k} className={`settings-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{label}</button>)}
          </div>
          <div className="settings-content" id="settings-content">
            <div className="settings-section active" key={`${tab}-${cls.id}`}>
              {tab === 'info' && (
                <InfoTab draft={draft} patch={patch} switcher={switcher('학급 선택 · 전환 (여러 학급 동시 저장)', '학급을 추가하면 학생·시간표·출결 기록이 학급별로 따로 저장돼요.')}
                  canDelete={classes.length > 1}
                  onDelete={async () => {
                    if (!confirm(`'${draft.className || '이 학급'}'의 학생·시간표·모든 출결 기록을 삭제할까요? 되돌릴 수 없어요.`)) return;
                    await deleteClass(cls.id);
                    toast('학급을 삭제했어요', 'success');
                  }} />
              )}
              {tab === 'students' && <StudentsTab draft={draft} patch={patch} used={used} switcher={switcher('학급 선택 (관리할 학급)', '선택한 학급의 학생을 아래에서 관리해요.')} />}
              {tab === 'timetable' && <TimetableTab draft={draft} onSubjects={(subjects) => { patch({ subjects }); const stored = useData.getState().classes.find((c) => c.id === cls.id); if (stored) void saveClass({ ...stored, subjects }); }} />}
              {tab === 'book' && <VideoTab draft={draft} patch={patch} />}
              {tab === 'data' && <><h3>📊 출결 대시보드</h3><AttendanceDashboard embedded /></>}
              {tab === 'backup' && <BackupTab classId={cls.id} />}
            </div>
          </div>
          <div className="settings-footer">
            <button className="btn-cancel" onClick={close}>취소</button>
            <button className="btn-save" onClick={() => void save()}>💾 저장</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface TabProps { draft: ClassRoom; patch: (p: Partial<ClassRoom>) => void }

function InfoTab({ draft, patch, switcher, canDelete, onDelete }: TabProps & { switcher: React.ReactNode; canDelete: boolean; onDelete: () => void }) {
  const today = useDay((s) => s.date);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolRow[] | 'loading' | 'none' | 'error' | null>(null);
  const [picked, setPicked] = useState('');
  const [test, setTest] = useState('');
  const level = schoolLevelOf(draft);

  const search = async () => {
    if (!query.trim()) { setResults(null); return; }
    setResults('loading'); setPicked('');
    try { const rows = await searchSchools(query.trim(), draft.neis.key); setResults(rows.length ? rows : 'none'); }
    catch { setResults('error'); }
  };
  const pick = (r: SchoolRow) => {
    // 학교 이름에 초·중·고가 드러나면 과정도 함께 고른다
    patch({ schoolName: r.SCHUL_NM, neis: { ...draft.neis, atptCode: r.ATPT_OFCDC_SC_CODE, schoolCode: r.SD_SCHUL_CODE }, ...(guessLevel(r.SCHUL_NM) ? { level: guessLevel(r.SCHUL_NM)! } : {}) });
    playSound('select'); toast(`✅ ${r.SCHUL_NM} 선택됨`, 'success');
    setPicked(r.SCHUL_NM); setResults(null);
  };
  const testMeal = async () => {
    if (!draft.neis.atptCode || !draft.neis.schoolCode) { setTest('먼저 학교를 검색해 선택해 주세요'); return; }
    setTest('조회 중...');
    try {
      const lunch = pickLunch(await fetchMealRows(draft.neis.atptCode, draft.neis.schoolCode, dateKeyOf(today), draft.neis.key));
      setTest(lunch ? `✅ 성공!\n${(lunch.DDISH_NM ?? '').replace(/<br\s*\/?>/g, '\n')}` : '⚠️ 데이터 없음 (오늘 급식이 없거나 코드 오류)');
    } catch { setTest('❌ 호출 실패'); }
  };

  return (
    <>
      <div className="sec-head">
        <h3>🏫 학급 기본 정보</h3>
        <button className="btn-reset" title="학교·학급 정보를 비워요" onClick={() => {
          if (!confirm('학교·학급명·과정·급식 연동을 비울까요?\n(학생·시간표·출결 기록은 그대로예요. 아래 [저장]을 눌러야 반영돼요)')) return;
          patch({ schoolName: '', className: '', level: '', neis: { atptCode: '', schoolCode: '' } });
          playSound('select'); toast('학급 기본 정보를 비웠어요. 저장을 눌러 주세요', 'success');
        }}>↺ 초기화</button>
      </div>
      {switcher}
      <div className="field">
        <label htmlFor="f-school-search">학교 검색</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input id="f-school-search" placeholder="학교명 입력" value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); void search(); } }} />
          <button className="btn-test" style={{ margin: 0, whiteSpace: 'nowrap' }} onClick={() => void search()}>🔍 검색</button>
        </div>
        <div className="hint">학교명을 검색해서 선택하면 학교명과 급식 정보가 자동으로 설정돼요</div>
        <div id="school-search-results">
          {results === 'loading' && <div className="hint">🔍 검색 중...</div>}
          {results === 'none' && <div className="hint">검색 결과가 없어요. 학교명을 다시 확인해 주세요</div>}
          {results === 'error' && <div className="hint">검색 실패 — 잠시 후 다시 시도해 주세요</div>}
          {picked && <div className="hint">✅ 선택됨: {picked}</div>}
          {Array.isArray(results) && results.map((r) => (
            <div key={r.ATPT_OFCDC_SC_CODE + r.SD_SCHUL_CODE} className="school-result" role="button" tabIndex={0} onClick={() => pick(r)} onKeyDown={(e) => { if (e.key === 'Enter') pick(r); }}>
              <div className="sr-name">🏫 {r.SCHUL_NM}</div><div className="sr-addr">{r.ORG_RDNMA ?? ''}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="field"><label htmlFor="f-school">학교명</label><input id="f-school" value={draft.schoolName} placeholder="검색해서 고르거나 직접 입력" onChange={(e) => patch({ schoolName: e.target.value })} /></div>
      <div className="field"><label htmlFor="f-class">학급명 (직접 입력)</label><input id="f-class" value={draft.className} placeholder="예: 3학년 2반" onChange={(e) => patch({ className: e.target.value })} /></div>
      <div className="field">
        <label>과정 (학교급)</label>
        <div className="level-switcher">
          {SCHOOL_LEVELS.map(([k, nm]) => <button key={k} className={`class-chip${level === k ? ' active' : ''}`} aria-pressed={level === k} onClick={() => { patch({ level: k }); playSound('select'); }}>{nm}</button>)}
        </div>
        <div className="hint">2022 개정 특수교육 기본 교육과정 기준으로 <b>시간표 교과 보관함</b>과 <b>수업교실 과목 목록</b>에 해당 과정의 교과가 나와요. 저장을 눌러야 반영돼요.</div>
      </div>
      <div className="field">
        <div className="hint">{draft.neis.schoolCode ? `✅ ${draft.schoolName || '학교'} — 급식 연동됨` : '🍱 학교를 검색해 선택하면 급식이 자동 연동돼요'}</div>
        <button className="btn-test" onClick={() => void testMeal()}>🧪 급식 연동 테스트</button>
        {test && <div className="test-result">{test}</div>}
      </div>
      {canDelete && (
        <div className="field" style={{ marginTop: 18, borderTop: '1px solid #eef0f5', paddingTop: 16 }}>
          <button className="btn-test" style={{ background: 'var(--danger)', width: '100%', margin: 0 }} onClick={onDelete}>🗑️ 현재 학급 삭제</button>
          <div className="hint" style={{ textAlign: 'center', marginTop: 6 }}>현재 선택된 <b>{nameOf(draft)}</b>의 학생·시간표·기록이 모두 삭제돼요</div>
        </div>
      )}
    </>
  );
}

function StudentsTab({ draft, patch, used, switcher }: TabProps & { used: Set<string>; switcher: React.ReactNode }) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const list = draft.students.filter((s) => !s.archived);
  const archived = draft.students.filter((s) => s.archived);
  const set = (students: ClassRoom['students']) => patch({ students });

  const add = () => {
    const names = text.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
    setText('');
    if (names.length) { set(addNames(draft.students, names)); playSound('select'); }
    inputRef.current?.focus();                                    // 이어서 입력할 수 있게
  };

  return (
    <>
      <h3>👨‍🎓 학생 관리</h3>
      {switcher}
      <div className="field">
        <label htmlFor="f-students-add">학생 추가</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input id="f-students-add" ref={inputRef} placeholder="이름 입력 후 엔터 ⏎" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(); } }} />
          <button className="btn-test" style={{ margin: 0, whiteSpace: 'nowrap' }} onClick={add}>➕ 추가</button>
        </div>
        <div className="hint">이름을 입력하고 <b>엔터(⏎)</b>를 누르면 아래에 등록돼요. 쉼표로 여러 명을 한 번에 넣을 수 있어요.</div>
      </div>
      <div className="field">
        <label>등록된 학생 ({list.length}명)</label>
        <div id="student-list">
          {list.map((s, i) => (
            <div key={s.id} className="student-list-item">
              <span className="nm">{i + 1}. {s.name}</span>
              <button title="이름 고치기" aria-label={`${s.name} 이름 고치기`} onClick={() => { const name = prompt('이름을 고쳐 주세요 (출결·감정 기록은 그대로 이어져요)', s.name); if (name != null) set(renameStudent(draft.students, s.id, name)); }}>✏️</button>
              <button aria-label={`${s.name} 위로`} disabled={i === 0} onClick={() => set(moveStudent(draft.students, s.id, -1))}>▲</button>
              <button aria-label={`${s.name} 아래로`} disabled={i === list.length - 1} onClick={() => set(moveStudent(draft.students, s.id, 1))}>▼</button>
              <button className="del" aria-label={`${s.name} 삭제`} onClick={() => set(removeStudent(draft.students, s.id, used))}>✕</button>
            </div>
          ))}
        </div>
      </div>
      {archived.length > 0 && (
        <div className="field">
          <label>보관된 학생 ({archived.length}명)</label>
          <div className="hint" style={{ marginBottom: 6 }}>지금 명단에는 없지만 예전 출결·감정 기록이 남아 있는 학생이에요. 다시 넣으면 기록이 이어져요.</div>
          {archived.map((s) => (
            <div key={s.id} className="student-list-item" style={{ opacity: 0.75 }}>
              <span className="nm">{s.name}</span>
              <button onClick={() => { set(addNames(draft.students, [s.name])); playSound('select'); }}>↩ 명단에 다시 넣기</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function VideoTab({ draft, patch }: TabProps) {
  const video = draft.options.video ?? { url: '', title: '' };
  const set = (p: Partial<typeof video>) => patch({ options: { ...draft.options, video: { ...video, ...p } } });
  const id = video.url.match(/(?:youtu\.be\/|v=|shorts\/)([^&\n?#]+)/)?.[1];
  return (
    <>
      <h3>📹 영상 재생 · 기본 영상</h3>
      <div className="field">
        <label htmlFor="f-book-url">기본 영상 URL</label>
        <input id="f-book-url" value={video.url} placeholder="https://youtu.be/..." onChange={(e) => set({ url: e.target.value.trim() })} />
        <div className="hint">영상 재생 카드를 열 때 처음 보여줄 영상이에요</div>
      </div>
      <div className="field"><label htmlFor="f-book-title">영상 제목</label><input id="f-book-title" value={video.title} onChange={(e) => set({ title: e.target.value })} /></div>
      {id && <img src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`} alt="" style={{ maxWidth: 240, borderRadius: 10, marginTop: 8 }} />}
    </>
  );
}
