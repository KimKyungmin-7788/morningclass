import { useEffect, useRef } from 'react';
import { playSound } from '@/core/sound';
import { useDay } from '@/core/data/day';
import { useKv } from '@/core/data/kv';
import { useCurrentClass } from '@/core/data/store';
import { subjectIcon } from '@/core/data/subjects';
import { periodsOn, useTimetables } from '@/core/data/timetables';
import { ddayDiff, ddayLabel, ddaySorted, fmtDdayDate, type DdayItem } from '@/features/dday/model';
import { shownDishes } from '@/features/meal/model';
import { wxFeel, type DustLevel, type WeatherValue } from '@/features/weather/model';
import { ddaySheet, mealSheet, notesSheet, sheetEmpty, timetableSheet, weatherSheet, type Sheet } from './morning';
import { useColumns } from './columns';
import { Icon } from './icons';
import { DASH_IDS, INK_COLORS, MAX_COLUMNS, SIZES, SIZE_IDS, type InkTool } from './model';
import { BG_COLORS, PAPERS, type PaperDef } from './papers';
import { useBoard, type OptionKey } from './store';
import { TOOLS, getTool } from './tools';

// 판서 왼쪽 도구 영역: 상자 셋(되돌리기 · 도구 · 로고)을 세로로 쌓는다. 도구 상자 아래쪽에는 배경 · 그림 불러오기 · 칸 나누기가 차례로 있다.
// 로고를 누르면 지금 도구의 옵션 카드가 오른쪽으로 펼쳐지고, 접으면 화면 가장자리에 손잡이만 남는다.

const DASH_NAMES = { draw: '손글씨', solid: '실선', dashed: '파선', dotted: '점선' };
const OPTION_LABELS: Record<OptionKey, string> = { color: '색상', size: '굵기', style: '선 스타일' };

const THUMB = 64;        // 용지 미리보기 한 변
const THUMB_ZOOM = 0.42; // 작게 줄여 무늬가 여러 번 보이게

/** 용지 미리보기 — 칠판에 그리는 것과 같은 함수로 작게 그린다 */
function PaperThumb({ paper }: { paper: PaperDef }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = THUMB * dpr; cv.height = THUMB * dpr;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, THUMB, THUMB);
    if (paper.thumb) paper.thumb(ctx, THUMB);                       // 한 장짜리 틀(수업노트)은 통째로 맞춰 그린다
    else {
      ctx.scale(THUMB_ZOOM, THUMB_ZOOM);
      paper.draw(ctx, { left: 0, top: 0, right: THUMB / THUMB_ZOOM, bottom: THUMB / THUMB_ZOOM, scale: THUMB_ZOOM });
    }
    ctx.restore();
  }, [paper]);
  return <canvas ref={ref} />;
}

function BackgroundCard() {
  const paper = useBoard((s) => s.paper);
  const bg = useBoard((s) => s.bg);
  const b = useBoard.getState();
  return (
    <div className="bd-box bd-card bd-bgcard" role="dialog" aria-label="배경 설정">
      <div className="bd-opt-row">
        <div className="bd-label">용지</div>
        <div className="bd-papers">
          {PAPERS.map((p) => (
            <button key={p.id} className={paper === p.id ? 'on' : ''} aria-label={p.name} aria-pressed={paper === p.id} onClick={() => { b.setPaper(p.id); playSound('select'); }}>
              <PaperThumb paper={p} /><span>{p.name}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="bd-opt-row">
        <div className="bd-label">배경색</div>
        <div className="bd-bgs">
          {BG_COLORS.map((c) => <button key={c.hex} className={bg === c.hex ? 'on' : ''} style={{ background: c.hex }} aria-label={c.name} aria-pressed={bg === c.hex} title={c.name} onClick={() => b.setBg(c.hex)} />)}
        </div>
      </div>
      <button className="bd-card-close" onClick={() => b.setUi({ bgOpen: false })}>닫기</button>
    </div>
  );
}

/** 학생별 칸 나누기 — 오늘 출석한 학생 중 4명까지. 고른 순서대로 왼쪽부터 칸이 생기고, 칸마다 동시에 쓸 수 있다 */
function SplitCard() {
  const split = useBoard((s) => s.split);
  const { present, columns } = useColumns();
  const b = useBoard.getState();
  const full = columns.length >= MAX_COLUMNS;
  return (
    <div className="bd-box bd-card bd-splitcard" role="dialog" aria-label="학생별 칸 나누기">
      <div className="bd-opt-head"><b>학생별 칸 나누기</b><span className="bd-label">{columns.length} / {MAX_COLUMNS}</span></div>
      <div className="bd-label">오늘 출석한 학생 중 {MAX_COLUMNS}명까지 골라요. 고른 순서대로 왼쪽부터 칸이 생기고, 칸마다 동시에 쓸 수 있어요. 펜 색은 칸 위의 이름표를 눌러 바꿔요.</div>
      {present.length ? (
        <div className="bd-students">
          {present.map((st) => {
            const at = columns.findIndex((c) => c.id === st.id);
            return (
              <button key={st.id} className={at >= 0 ? 'on' : ''} aria-pressed={at >= 0} disabled={at < 0 && full} onClick={() => { b.toggleSplit(st.id); playSound('select'); }}>
                <i style={{ background: at >= 0 ? columns[at].ink : undefined }}>{at >= 0 ? at + 1 : ''}</i><span>{st.name}</span>
              </button>
            );
          })}
        </div>
      ) : <div className="bd-empty">오늘 출석한 학생이 없어요.<br />설정에서 학생을 등록하거나 출석을 확인해 주세요.</div>}
      <div className="bd-card-foot">
        {split.length > 0 && <button className="bd-card-close" onClick={b.clearSplit}>나누기 끄기</button>}
        <button className="bd-card-close" onClick={() => b.setUi({ splitOpen: false })}>닫기</button>
      </div>
    </div>
  );
}

/** 오늘 아침교실에 적힌 것 — 판서에 붙일 수 있는 다섯 가지 */
function useMorningSheets(): Sheet[] {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const record = useDay((s) => s.record);
  const { byDay } = useTimetables(cls?.id ?? '');
  const [ddays] = useKv<DdayItem[]>(`ddays:${cls?.id ?? ''}`, []);
  const weather = record.weather as WeatherValue | null;
  return [
    weatherSheet(weather, wxFeel(weather), record.dust as DustLevel | null),
    timetableSheet(record.timetable.arranged, periodsOn(date, byDay), record.timetable.notes, (s) => subjectIcon(s, cls)),
    notesSheet(record.notes ?? ''),
    mealSheet(shownDishes(record.meal?.dishes ?? [], cls?.options.mealHidden).map((d) => d.name)),
    ddaySheet(ddaySorted(ddays, date).map((d) => ({ name: d.name, label: ddayLabel(ddayDiff(d.date, date)), date: fmtDdayDate(d.date) }))),
  ];
}

/** 그림 불러오기 — 파일에서 고르거나, 아침교실에 적은 것을 칠판에 붙일 종이로 가져온다 */
function ImageCard({ onFile, onSheet }: { onFile: () => void; onSheet: (sheet: Sheet) => void }) {
  const sheets = useMorningSheets();
  return (
    <div className="bd-box bd-card bd-imgcard" role="dialog" aria-label="그림 불러오기">
      <div className="bd-opt-row">
        <div className="bd-label">그림 파일</div>
        <button className="bd-pick" onClick={onFile}><Icon id="image" size={22} /><span>파일에서 불러오기</span></button>
      </div>
      <div className="bd-opt-row">
        <div className="bd-label">아침교실에서 가져오기 — 칠판에 붙여 그 위에 쓸 수 있어요</div>
        {sheets.map((sh) => (
          <button key={sh.id} className="bd-pick" disabled={sheetEmpty(sh)} onClick={() => { onSheet(sh); playSound('select'); }}>
            <i>{sh.icon}</i><span>{sh.title}</span>{sheetEmpty(sh) && <em>내용 없음</em>}
          </button>
        ))}
      </div>
      <button className="bd-card-close" onClick={() => useBoard.getState().setUi({ imageOpen: false })}>닫기</button>
    </div>
  );
}

function OptionCard({ toolId, splitOn }: { toolId: InkTool; splitOn: boolean }) {
  const values = useBoard((s) => s.values[toolId]);
  const autoClose = useBoard((s) => s.ui.autoClose);
  const b = useBoard.getState();
  const tool = getTool(toolId);
  const widgets: Record<OptionKey, React.ReactNode> = {
    color: splitOn ? <div className="bd-note">칸을 나눈 동안에는 칸 위의 이름표를 눌러 학생마다 색을 골라요.</div> : (
      <div className="bd-colors">
        {INK_COLORS.map((c) => <button key={c.hex} className={values.color === c.hex ? 'on' : ''} style={{ background: c.hex }} aria-label={c.name} aria-pressed={values.color === c.hex} title={c.name} onClick={() => b.setOption('color', c.hex)} />)}
      </div>
    ),
    size: (
      <div className="bd-choices">
        {SIZE_IDS.map((id) => (
          <button key={id} className={`bd-size${values.size === id ? ' on' : ''}`} aria-label={`굵기 ${id}`} aria-pressed={values.size === id} onClick={() => b.setOption('size', id)}>
            <i style={{ width: Math.min(SIZES[id], 26), height: Math.min(SIZES[id], 26) }} /><span>{id}</span>
          </button>
        ))}
      </div>
    ),
    style: (
      <div className="bd-choices">
        {DASH_IDS.map((id) => (
          <button key={id} className={values.style === id ? 'on' : ''} title={DASH_NAMES[id]} aria-label={DASH_NAMES[id]} aria-pressed={values.style === id} onClick={() => b.setOption('style', id)}>
            <Icon id={`dash-${id}`} size={26} />
          </button>
        ))}
      </div>
    ),
  };
  return (
    <div className="bd-box bd-card bd-opt" role="dialog" aria-label={`${tool.name} 옵션`}>
      <div className="bd-opt-head">
        <b>{tool.name} 옵션</b>
        <button className={`bd-switch${autoClose ? ' on' : ''}`} title="쓰기 시작하면 옵션 카드를 자동으로 닫습니다" aria-label="옵션 카드 자동 닫기" aria-pressed={autoClose} onClick={() => b.setUi({ autoClose: !autoClose })}>
          <span>자동닫기</span><i />
        </button>
      </div>
      {tool.options.map((key) => (
        <div key={key} className="bd-opt-row">
          <div className="bd-label">{OPTION_LABELS[key]}</div>
          {widgets[key]}
        </div>
      ))}
    </div>
  );
}

export function BoardPanel({ onAddImage, onAddSheet }: { onAddImage: () => void; onAddSheet: (sheet: Sheet) => void }) {
  const toolId = useBoard((s) => s.tool);
  const values = useBoard((s) => s.values);
  const ui = useBoard((s) => s.ui);
  const canUndo = useBoard((s) => s.history.past.length > 0);
  const canRedo = useBoard((s) => s.history.future.length > 0);
  const hasStrokes = useBoard((s) => s.strokes.length > 0 || s.images.length > 0);
  const splitOn = useColumns().columns.length > 0;
  const b = useBoard.getState();
  const tool = getTool(toolId);
  const inkTool = tool.options.length ? (toolId as InkTool) : null;   // 옵션이 있는 도구(펜 · 형광펜 · 지우개)

  return (
    <>
      {!ui.panelOpen && (
        <button className="bd-box bd-handle" aria-label="도구 영역 열기" onClick={() => b.setUi({ panelOpen: true })}><Icon id="chevron-right" size={20} /></button>
      )}
      <div className={`bd-left${ui.panelOpen ? '' : ' closed'}`} inert={!ui.panelOpen}>
        <div className="bd-box bd-actions">
          <button className="bd-btn" title="실행취소" aria-label="실행취소" disabled={!canUndo} onClick={b.undo}><Icon id="undo" /></button>
          <button className="bd-btn" title="다시실행" aria-label="다시실행" disabled={!canRedo} onClick={b.redo}><Icon id="redo" /></button>
          <button className="bd-btn danger" title="전체지우기" aria-label="전체지우기" disabled={!hasStrokes} onClick={() => b.setUi({ confirmClear: true })}><Icon id="trash" /></button>
        </div>

        <div className="bd-box bd-dock">
          {TOOLS.map((t) => (
            <button key={t.id} className={`bd-btn${t.id === toolId ? ' on' : ''}`} title={t.name} aria-label={t.name} aria-pressed={t.id === toolId} onClick={() => { b.setTool(t.id); playSound('select'); }}>
              <Icon id={t.id} size={26} />
            </button>
          ))}
          <div className="bd-sep" />
          <button className={`bd-btn${ui.bgOpen ? ' on' : ''}`} title="배경" aria-label="배경" aria-pressed={ui.bgOpen} onClick={() => b.setUi({ bgOpen: !ui.bgOpen, optionOpen: false, splitOpen: false, imageOpen: false })}><Icon id="background" size={26} /></button>
          {/* 도구 상자 위쪽에 맞춰 펼친다 — 단추 옆에서 펼치면 낮은 화면에서 아래가 잘린다 */}
          {ui.bgOpen && <BackgroundCard />}
          <button className={`bd-btn${ui.imageOpen ? ' on' : ''}`} title="그림 불러오기" aria-label="그림 불러오기" aria-pressed={ui.imageOpen} onClick={() => b.setUi({ imageOpen: !ui.imageOpen, optionOpen: false, bgOpen: false, splitOpen: false })}><Icon id="image" size={26} /></button>
          {ui.imageOpen && <ImageCard onFile={() => { b.setUi({ imageOpen: false }); onAddImage(); }} onSheet={(sheet) => { b.setUi({ imageOpen: false }); onAddSheet(sheet); }} />}
          <button className={`bd-btn${ui.splitOpen ? ' on' : ''}${splitOn ? ' live' : ''}`} title="학생별 칸 나누기" aria-label="학생별 칸 나누기" aria-pressed={ui.splitOpen} onClick={() => b.setUi({ splitOpen: !ui.splitOpen, optionOpen: false, bgOpen: false, imageOpen: false })}><Icon id="split" size={26} /></button>
          {ui.splitOpen && <SplitCard />}
        </div>

        {/* 로고 색 = 지금 잉크 색. 옵션이 없는 도구(선택 · 손)일 때는 회색 */}
        <div className="bd-rel">
          <button className={`bd-box bd-logo${ui.optionOpen && inkTool ? ' on' : ''}`} aria-label="로고 — 옵션 열기" aria-expanded={ui.optionOpen && !!inkTool} disabled={!inkTool}
            style={{ color: inkTool && !splitOn ? values[inkTool].color : inkTool ? '#1A1A1A' : undefined }} onClick={() => b.setUi({ optionOpen: !ui.optionOpen, bgOpen: false, splitOpen: false, imageOpen: false })}>me!</button>
          {ui.optionOpen && inkTool && <OptionCard toolId={inkTool} splitOn={splitOn} />}
        </div>

        <button className="bd-box bd-fold" aria-label="도구 영역 닫기" onClick={() => b.setUi({ panelOpen: false, optionOpen: false, bgOpen: false, splitOpen: false, imageOpen: false })}><Icon id="chevron-left" size={18} /></button>
      </div>
    </>
  );
}
