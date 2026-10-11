// 아침교실에서 적은 것(날씨 · 시간표 · 유의사항 · 급식 · D-DAY)을 판서에 붙일 "종이 한 장"으로 정리한다 (화면과 무관한 계산).
// 화면의 카드를 찍는 것이 아니라 칠판에서 읽기 좋게 크게 다시 그린다 — 그리는 일은 image.ts 가 맡는다.

export type SheetId = 'weather' | 'timetable' | 'notes' | 'meal' | 'dday';

export interface SheetRow {
  /** 줄 앞의 알약 모양 표시 (1교시, D-3 …) */
  badge?: string;
  text: string;
  /** 본문 뒤에 작게 붙는 말 (메모, 날짜) */
  sub?: string;
}
export interface Sheet {
  id: SheetId;
  icon: string;
  title: string;
  /** 줄 단위 내용. 비어 있으면 가져올 것이 없다 */
  rows: SheetRow[];
  /** rows 대신 통으로 쓰는 긴 글 (유의사항) — 너비에 맞춰 줄을 바꿔 그린다 */
  body?: string;
}

export const sheetEmpty = (s: Sheet) => !s.rows.length && !s.body?.trim();

/** 날씨와 미세먼지: 고른 것만 줄로 넣는다 (날씨 · 기온과 옷차림 · 미세먼지) */
export function weatherSheet(
  weather: { emoji: string; label: string; temp?: number } | null,
  feel: { emoji: string; label: string; say: string } | null,
  dust: { emoji: string; label: string; hint: string } | null,
): Sheet {
  const rows: SheetRow[] = [];
  if (weather) rows.push({ badge: '날씨', text: `${weather.emoji} ${weather.label}`, sub: weather.temp != null ? `${Math.round(weather.temp)}°` : undefined });
  if (feel) rows.push({ badge: '옷차림', text: `${feel.emoji} ${feel.label}`, sub: feel.say });
  if (dust) rows.push({ badge: '미세먼지', text: `${dust.emoji} ${dust.label}`, sub: dust.hint });
  return { id: 'weather', icon: '🌤️', title: '오늘의 날씨', rows };
}

/** 시간표: 맞춰 놓은 것이 있으면 그것을, 없으면 설정에 넣어 둔 오늘 시간표를 쓴다. 빈 교시는 건너뛴다 */
export function timetableSheet(arranged: string[] | null | undefined, planned: string[], notes: Record<string, string>, iconOf: (subject: string) => string): Sheet {
  const done = !!arranged?.some(Boolean);
  const periods = done ? arranged! : planned;
  const rows = periods.map((s, i): SheetRow | null => (s?.trim() ? { badge: `${i + 1}교시`, text: `${iconOf(s)} ${s.trim()}`, sub: done ? notes[i]?.trim() || undefined : undefined } : null))
    .filter((r): r is SheetRow => !!r);
  return { id: 'timetable', icon: '📅', title: '오늘의 시간표', rows };
}

export const notesSheet = (text: string): Sheet => ({ id: 'notes', icon: '📢', title: '오늘의 유의사항', rows: [], body: text.trim() });

export const mealSheet = (dishes: string[]): Sheet => ({ id: 'meal', icon: '🍚', title: '오늘의 급식', rows: dishes.map((d) => d.trim()).filter(Boolean).map((text) => ({ text })) });

/** D-DAY: 다가오는 순서대로 이미 정렬된 목록을 받는다 */
export const ddaySheet = (items: { name: string; label: string; date: string }[]): Sheet => ({
  id: 'dday', icon: '🚩', title: 'D-DAY', rows: items.map((it) => ({ badge: it.label, text: it.name, sub: it.date })),
});

/**
 * 긴 글을 너비에 맞춰 줄로 나눈다. measure 는 글자열의 너비를 돌려준다.
 * 띄어쓰기에서 먼저 끊고, 한 낱말이 한 줄보다 길면 글자 단위로 끊는다. 빈 줄(문단 사이)은 그대로 둔다.
 */
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      const tryLine = line ? `${line} ${word}` : word;
      if (measure(tryLine) <= maxWidth) { line = tryLine; continue; }
      if (line) lines.push(line);
      line = '';
      for (const ch of word) {
        if (line && measure(line + ch) > maxWidth) { lines.push(line); line = ch; } else line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}
