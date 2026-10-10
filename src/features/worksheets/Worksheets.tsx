import { useEffect, useMemo, useRef, useState } from 'react';
import { Popup } from '@/core/ui/Popup';
import { toast } from '@/core/ui/toast';
import { playSound } from '@/core/sound';
import { usePrefs } from '@/core/prefs';
import { useCurrentClass } from '@/core/data/store';
import { dateKeyOf, useDay } from '@/core/data/day';
import { getMealImages } from '@/core/data/mealImages';
import { schoolLevelOf } from '@/core/data/subjects';
import { fetchMealRows, pickLunch } from '@/core/net/neis';
import { dishKey, parseNutri, shownDishes, type Nutri } from '@/features/meal/model';
import { sheetBuilders } from './legacyBuilders';

// 학습지(A4) 창: 고른 쪽을 미리 보고 인쇄하거나 PDF 로 저장한다.
// 학습지의 내용(HTML)은 legacyBuilders 가 만들고, 여기서는 창·옵션·그림 준비·인쇄·PDF 를 맡는다.

const WS_SIZES: [number, string][] = [[13, '보통 1.3cm'], [15, '크게 1.5cm'], [20, '아주 크게 2cm']];
type Parts = [string, string][];
type Sel = Record<string, boolean>;

/** 학습지 내용을 만드는 쪽에 필요한 값을 채운다 */
function useBuilder() {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const weather = useDay((s) => s.record.weather);
  const wsOpts = usePrefs((s) => s.wsOpts);
  return useMemo(() => Object.assign(Object.create(sheetBuilders) as typeof sheetBuilders, {
    selectedDate: date, record: { weather }, schoolLevel: () => schoolLevelOf(cls), wsOpt: () => wsOpts,
  }), [cls, date, weather, wsOpts]);
}

/** 그림 주소를 data URL 로 바꾼다 (서버 경유로 받아 PDF 에도 그림이 들어가게). 안 되면 null */
async function toDataUrl(url: string | undefined): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  const via = `/api/image?url=${encodeURIComponent(url)}`;
  for (const u of [via, via, url]) {                              // 서버 경유(한 번 더 재시도) → 직접
    try {
      const r = await fetch(u);
      if (!r.ok) continue;
      const blob = await r.blob();
      if (!blob.type.startsWith('image/')) continue;
      const bmp = await createImageBitmap(blob);
      const sc = Math.min(1, 600 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
      cv.getContext('2d')!.drawImage(bmp, 0, 0, cv.width, cv.height);
      return cv.toDataURL('image/jpeg', 0.88);
    } catch {
      /* 다음 방법으로 */
    }
  }
  return null;
}

async function sheetImages(names: string[]): Promise<Record<string, string | null>> {
  const saved = await getMealImages();
  const out: Record<string, string | null> = {};
  await Promise.all(names.map(async (n) => {
    const v = saved[dishKey(n)];
    // 큰 원본 → 작은 미리보기 → 주소 그대로(인쇄는 된다)
    out[n] = v?.src ? (await toDataUrl(v.full)) || (await toDataUrl(v.src)) || v.src : null;
  }));
  return out;
}

/** 미리보기 + 인쇄 + PDF 저장을 갖춘 학습지 창의 틀 */
function SheetFrame({ title, html, canExport, pdfName, backLabel, onBack, loading, children }: {
  title: string; html: string; canExport: boolean; pdfName: string; backLabel: string; onBack: () => void; loading?: string; children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const date = useDay((s) => s.date);
  const [busy, setBusy] = useState(false);

  const print = async () => {
    const w = frameRef.current?.contentWindow;
    if (!w) return;
    try { await w.document.fonts.ready; } catch { /* 점선체 글꼴을 다 받지 못해도 인쇄는 한다 */ }
    w.focus(); w.print();
  };
  /** PDF 저장: 미리보기의 각 A4 쪽을 그림으로 떠서 한 파일로 (html2canvas + jsPDF 를 미리보기 문서 안에 불러온다) */
  const savePdf = async () => {
    const f = frameRef.current;
    const doc = f?.contentDocument;
    const win = f?.contentWindow as (Window & { html2canvas?: (el: Element, o: object) => Promise<HTMLCanvasElement>; jspdf?: { jsPDF: new (o: object) => { addPage(): void; addImage(...a: unknown[]): void; save(n: string): void } } }) | null;
    if (!doc || !win) return;
    const load = (src: string) => new Promise<void>((ok, no) => { const s = doc.createElement('script'); s.src = src; s.onload = () => ok(); s.onerror = () => no(new Error(src)); doc.head.appendChild(s); });
    setBusy(true);
    try {
      if (!win.html2canvas) await load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      if (!win.jspdf) await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      await doc.fonts?.ready;
      const pdf = new win.jspdf!.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pages = [...doc.querySelectorAll('.page')];
      for (let i = 0; i < pages.length; i += 1) {
        // 미리보기용 그림자는 쪽 전체를 회색으로 칠해 버려서, 복제본에서 빼고 캡처한다
        const cv = await win.html2canvas!(pages[i], { scale: 2, useCORS: true, backgroundColor: '#ffffff',
          onclone: (d: Document) => d.querySelectorAll<HTMLElement>('.page').forEach((p) => { p.style.boxShadow = 'none'; }) });
        if (i) pdf.addPage();
        pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
      }
      pdf.save(`${pdfName}_${dateKeyOf(date)}.pdf`);
      toast('PDF를 저장했어요 📄', 'success');
    } catch {
      toast('PDF를 만들지 못했어요. 🖨️ 인쇄에서 "PDF로 저장"을 골라 주세요', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popup title={title} large onClose={onBack}>
      <div className="ws-modal">
        {children}
        <div className="ws-prev">
          {loading && <div className="meal-loading"><div className="spinner">📝</div><div className="text">{loading}</div></div>}
          <iframe ref={frameRef} title="학습지 미리보기" srcDoc={html} />
        </div>
        <div className="mm-tools">
          <button onClick={onBack}>{backLabel}</button>
          <button disabled={!canExport || !!loading} onClick={() => void print()}>🖨️ 인쇄</button>
          <button disabled={!canExport || !!loading || busy} onClick={() => void savePdf()}>{busy ? '⏳ PDF 만드는 중...' : '📄 PDF 저장'}</button>
        </div>
      </div>
    </Popup>
  );
}

const Checks = ({ parts, sel, onChange }: { parts: Parts; sel: Sel; onChange: (k: string, v: boolean) => void }) => (
  <>{parts.map(([k, l]) => <label key={k} className="ws-opt"><input type="checkbox" checked={!!sel[k]} onChange={(e) => onChange(k, e.target.checked)} /> {l}</label>)}</>
);

// 고른 쪽은 창을 닫았다 열어도 기억한다 (새로 고치면 처음으로)
let mealSel: Sel = { tray: true, cut: true, trace: true };
let nutriSel: Sel = { bike: true, even: true, signal: true, energy: true, ncut: true };
let mealTab: 'basic' | 'nutri' = 'basic';
let weatherState = { sec: { weather: true, temp: true, clothes: true, predict: true, key: false } as Sel, lvl: 'easy' };

/** 급식 학습지: 기본(식판+따라쓰기 · 붙임자료 · 크게 따라쓰기) / 영양(식품구성자전거 등) */
export function MealSheets({ onBack }: { onBack: () => void }) {
  const cls = useCurrentClass();
  const date = useDay((s) => s.date);
  const meal = useDay((s) => s.record.meal);
  const wsOpts = usePrefs((s) => s.wsOpts);
  const setPrefs = usePrefs((s) => s.set);
  const builder = useBuilder();
  const [tab, setTab] = useState(mealTab);
  const [sel, setSel] = useState(mealSel);
  const [nsel, setNsel] = useState(nutriSel);
  const [imgs, setImgs] = useState<Record<string, string | null> | null>(null);
  const [nutri, setNutri] = useState<{ today: Nutri | null } | null>(meal?.nutri ? { today: meal.nutri as unknown as Nutri } : null);
  // 숨긴 메뉴는 학습지에서도 뺀다
  const names = useMemo(() => shownDishes(meal?.dishes ?? [], cls?.options.mealHidden).map((d) => d.name.trim()), [meal, cls]);
  const namesKey = names.join('|');

  useEffect(() => { let alive = true; void sheetImages(namesKey.split('|').filter(Boolean)).then((r) => { if (alive) setImgs(r); }); return () => { alive = false; }; }, [namesKey]);
  // 영양 정보는 급식을 불러올 때 저장한 값을 쓰고, 없으면 영양 탭을 처음 열 때 한 번 다시 조회한다
  useEffect(() => {
    if (tab !== 'nutri' || nutri) return;
    let alive = true;
    const done = (today: Nutri | null) => { if (alive) setNutri({ today }); };
    if (!cls?.neis.atptCode || !cls.neis.schoolCode) { done(null); return; }
    fetchMealRows(cls.neis.atptCode, cls.neis.schoolCode, dateKeyOf(date), cls.neis.key).then((rows) => done(parseNutri(pickLunch(rows)))).catch(() => done(null));
    return () => { alive = false; };
  }, [tab, nutri, cls, date]);

  const isNutri = tab === 'nutri';
  const cur = isNutri ? nsel : sel;
  const parts = (isNutri ? sheetBuilders.NUT_PARTS : sheetBuilders.WS_PARTS) as Parts;
  const any = parts.some(([k]) => cur[k]);
  const waitingNutri = isNutri && !nutri;
  const html = useMemo(
    () => (imgs && !waitingNutri ? builder.buildWorksheetHTML(names, imgs, cur, tab, nutri) as string : ''),
    [builder, names, imgs, cur, tab, nutri, waitingNutri],
  );
  const pick = (k: string, v: boolean) => {
    if (isNutri) { nutriSel = { ...nsel, [k]: v }; setNsel(nutriSel); } else { mealSel = { ...sel, [k]: v }; setSel(mealSel); }
  };

  return (
    <SheetFrame title="📝 급식 학습지 만들기" html={html} canExport={any} pdfName={isNutri ? '영양학습지' : '급식학습지'} backLabel="← 급식으로" onBack={onBack}
      loading={!imgs ? '학습지를 만드는 중... (그림 불러오는 중)' : waitingNutri ? '급식 영양 정보를 불러오는 중...' : undefined}>
      <div className="ws-tabs" role="tablist">
        {([['basic', '📝 기본 학습지'], ['nutri', '🥗 영양 학습지']] as const).map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { mealTab = k; setTab(k); playSound('select'); }}>{l}</button>
        ))}
      </div>
      <div className="ws-opts">
        <Checks parts={parts} sel={cur} onChange={pick} />
        {!isNutri && (
          <>
            <label className="ws-opt"><input type="checkbox" checked={wsOpts.dot} onChange={(e) => setPrefs({ wsOpts: { ...wsOpts, dot: e.target.checked } })} /> 흐린 글씨(따라 쓰기)</label>
            <label className="ws-opt">쓰기 칸{' '}
              <select value={wsOpts.size} style={{ font: 'inherit', padding: '2px 6px', borderRadius: 8, border: '1.5px solid #cbd5e1', background: '#fff' }}
                onChange={(e) => setPrefs({ wsOpts: { ...wsOpts, size: Number(e.target.value) } })}>
                {WS_SIZES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </>
        )}
      </div>
    </SheetFrame>
  );
}

/** 날씨 활동지: 날씨·기온 알아보기, 알맞은 옷 고르기, 내 예상과 정답, 정답지 */
export function WeatherSheet({ onClose }: { onClose: () => void }) {
  const builder = useBuilder();
  const [st, setSt] = useState(weatherState);
  const change = (next: typeof weatherState) => { weatherState = next; setSt(next); };
  const html = useMemo(() => builder.buildWeatherSheetHTML(st) as string, [builder, st]);
  return (
    <SheetFrame title="📝 날씨 활동지 만들기" html={html} canExport={Object.values(st.sec).some(Boolean)} pdfName="날씨활동지" backLabel="닫기" onBack={onClose}>
      <div className="ws-opts"><Checks parts={sheetBuilders.WSW_PARTS as Parts} sel={st.sec} onChange={(k, v) => change({ ...st, sec: { ...st.sec, [k]: v } })} /></div>
      <div className="ws-opts">
        <span className="ws-opt" style={{ background: 'none', paddingLeft: 0 }}>글쓰기</span>
        {([['easy', '✏️ 따라쓰기'], ['mid', '📝 스스로 쓰기']] as const).map(([k, l]) => (
          <label key={k} className="ws-opt"><input type="radio" name="wsl" checked={st.lvl === k} onChange={() => { change({ ...st, lvl: k }); playSound('select'); }} /> {l}</label>
        ))}
      </div>
    </SheetFrame>
  );
}
