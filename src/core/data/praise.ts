import { useDay } from './day';
import { useData } from './store';
import { newId, type ClassRoom, type PraiseConfig, type PraiseLog, type PraiseOwn, type PraiseTally, type StudentId } from './types';

// 칭찬판 규칙과 스티커 주기. 1인 1역할도 "했어요"에 스티커를 줄 수 있어서 core 에 둔다.
// 판은 학생마다 따로 채운다. 설정과 학생별 진행은 학급 설정에, 스티커 하나하나(누가 · 무엇으로 · 언제)는 그날 기록에 남는다.
// 잘못 준 것은 바로 되돌리고(취소), 선생님이 고른 학생의 스티커를 하나씩 뺄 수도 있다.

export const PRAISE_SIZES = [10, 20, 30];
export const PRAISE_SHAPES: { id: PraiseConfig['shape']; label: string; icon: string }[] = [
  { id: 'grape', label: '칭찬 포도', icon: '🍇' }, { id: 'tree', label: '칭찬 나무', icon: '🌳' }, { id: 'star', label: '칭찬 별', icon: '⭐' },
];
export const PRAISE_DEFAULT: PraiseConfig = {
  shape: 'grape', size: 20,
  reasons: ['바르게 앉기', '친구 돕기', '스스로 하기'],
  rewards: ['자유 시간 10분', '좋아하는 활동 고르기'],
  autoRole: false,
};
/** 칭찬 이유 · 보상 후보는 이만큼까지 (목표 행동은 적고 분명해야 한다) */
export const REASON_MAX = 3;
export const REWARD_MAX = 4;

/** 학생별 맞춤은 이만큼까지 (공통 것에 더해지므로 적게 둔다) */
export const OWN_REASON_MAX = 2;
export const OWN_REWARD_MAX = 2;

export const praiseConfigOf = (cls: ClassRoom | undefined): PraiseConfig => ({ ...PRAISE_DEFAULT, ...cls?.options.praise });

/** 고를 수 있는 것 하나: 글과, 그 학생에게만 있는 맞춤인지 */
export interface PraiseChoice { text: string; own: boolean }

/** 공통 목록에 그 학생의 맞춤을 더한다 (맞춤이 앞에 온다. 빈 것과 겹치는 것은 뺀다) */
function merge(common: string[], own: string[] | undefined): PraiseChoice[] {
  const seen = new Set<string>();
  const out: PraiseChoice[] = [];
  for (const [list, isOwn] of [[own ?? [], true], [common, false]] as const) {
    for (const raw of list) { const text = raw.trim(); if (text && !seen.has(text)) { seen.add(text); out.push({ text, own: isOwn }); } }
  }
  return out;
}
/** 그 학생에게 줄 수 있는 칭찬 이유: 맞춤 + 공통 */
export const reasonsFor = (cfg: PraiseConfig, own: Partial<PraiseOwn> | undefined): PraiseChoice[] => merge(cfg.reasons, own?.reasons);
/** 그 학생이 고를 수 있는 보상: 맞춤 + 공통 */
export const rewardsFor = (cfg: PraiseConfig, own: Partial<PraiseOwn> | undefined): PraiseChoice[] => merge(cfg.rewards, own?.rewards);

/** 저장하기 전에 맞춤을 다듬는다: 빈 칸을 빼고, 아무것도 없는 학생과 명단에 없는 학생은 지운다 */
export function cleanOwn(own: Record<StudentId, Partial<PraiseOwn>> | undefined, studentIds: StudentId[]): Record<StudentId, PraiseOwn> {
  const ok = new Set(studentIds);
  const out: Record<StudentId, PraiseOwn> = {};
  for (const [id, v] of Object.entries(own ?? {})) {
    const reasons = [...new Set((v.reasons ?? []).map((x) => x.trim()).filter(Boolean))].slice(0, OWN_REASON_MAX);
    const rewards = [...new Set((v.rewards ?? []).map((x) => x.trim()).filter(Boolean))].slice(0, OWN_REWARD_MAX);
    if (ok.has(id) && (reasons.length || rewards.length)) out[id] = { reasons, rewards };
  }
  return out;
}

type Tally = Record<StudentId, PraiseTally>;
const of = (tally: Tally | undefined, s: StudentId): PraiseTally => tally?.[s] ?? { now: 0, boards: 0 };

/** 스티커 하나를 더한다 (원래 기록은 그대로 두고 새 기록을 돌려준다) */
export const addSticker = (tally: Tally | undefined, s: StudentId): Tally => ({ ...tally, [s]: { ...of(tally, s), now: of(tally, s).now + 1 } });
/** 스티커 하나를 되돌린다 (0 아래로는 내려가지 않는다) */
export const removeSticker = (tally: Tally | undefined, s: StudentId): Tally => ({ ...tally, [s]: { ...of(tally, s), now: Math.max(0, of(tally, s).now - 1) } });
/** 판을 다 채웠는지 */
export const isFull = (tally: Tally | undefined, s: StudentId, size: number) => of(tally, s).now >= size;
/** 완성한 판을 보상으로 바꾸고 새 판을 시작한다 */
export const claimBoard = (tally: Tally | undefined, s: StudentId): Tally => ({ ...tally, [s]: { now: 0, boards: of(tally, s).boards + 1 } });
export const tallyOf = of;

/** 포도송이 모양의 줄별 알 수 (위가 넓고 아래로 좁아진다). 예: 10 → 4·3·2·1, 20 → 6·5·4·3·2 */
export function clusterRows(n: number): number[] {
  let top = 1;
  while ((top * (top + 1)) / 2 < n) top += 1;
  const rows: number[] = [];
  for (let w = top, left = n; left > 0; w -= 1) { const take = Math.min(Math.max(w, 1), left); rows.push(take); left -= take; }
  return rows;
}

/** 인증서에 적을 "칭찬받은 일": 그 학생이 since 뒤로 받은 스티커를 이유별로 세어 많은 순으로 */
export function reasonCounts(logs: PraiseLog[], studentId: StudentId, since = ''): { text: string; count: number }[] {
  const by = new Map<string, number>();
  for (const p of logs) if (p.s === studentId && p.at > since) by.set(p.r, (by.get(p.r) ?? 0) + 1);
  return [...by].map(([text, count]) => ({ text, count })).sort((a, b) => b.count - a.count);
}

// ── 주기 · 되돌리기 (학급 설정과 그날 기록을 함께 고친다) ──
const currentClass = () => { const { classes, currentClassId } = useData.getState(); return classes.find((c) => c.id === currentClassId); };
const saveTally = (next: Tally) => { const cls = currentClass(); if (cls) void useData.getState().saveClass({ ...cls, options: { ...cls.options, praiseTally: next } }); };

/** 스티커를 준다. 준 스티커의 기록을 돌려준다 */
export function givePraise(studentId: StudentId, reason: string, roleId?: string): PraiseLog | null {
  const cls = currentClass();
  if (!cls) return null;
  const log: PraiseLog = { id: newId('p'), s: studentId, r: reason, at: new Date().toISOString(), ...(roleId ? { role: roleId } : {}) };
  saveTally(addSticker(cls.options.praiseTally, studentId));
  useDay.getState().update((r) => { r.praise = [...(r.praise ?? []), log]; });
  return log;
}

/** 오늘 준 스티커 하나를 되돌린다 */
export function undoPraise(logId: string): void {
  const log = useDay.getState().record.praise?.find((p) => p.id === logId);
  const cls = currentClass();
  if (!log || !cls) return;
  saveTally(removeSticker(cls.options.praiseTally, log.s));
  useDay.getState().update((r) => { r.praise = (r.praise ?? []).filter((p) => p.id !== logId); });
}

/** 선생님이 스티커 하나를 뺀다. 오늘 받은 것이 있으면 가장 나중 것의 기록도 지우고, 없으면(지난 날에 받은 것) 개수만 줄인다. 뺄 것이 없으면 false */
export function takePraise(studentId: StudentId): boolean {
  const cls = currentClass();
  if (!cls || of(cls.options.praiseTally, studentId).now <= 0) return false;
  const log = [...(useDay.getState().record.praise ?? [])].reverse().find((x) => x.s === studentId);
  if (log) undoPraise(log.id);
  else saveTally(removeSticker(cls.options.praiseTally, studentId));
  return true;
}

/** 1인 1역할 "했어요"를 취소했을 때: 그 역할로 오늘 자동으로 받은 스티커를 되돌린다 */
export function undoRolePraise(roleId: string, studentId: StudentId): void {
  const log = [...(useDay.getState().record.praise ?? [])].reverse().find((p) => p.role === roleId && p.s === studentId);
  if (log) undoPraise(log.id);
}

/** 완성한 판의 보상을 받고 새 판을 시작한다 */
export function claimReward(studentId: StudentId, reward: string): void {
  const cls = currentClass();
  if (!cls) return;
  saveTally(claimBoard(cls.options.praiseTally, studentId));
  useDay.getState().update((r) => { r.praiseRewards = [...(r.praiseRewards ?? []), { s: studentId, reward, at: new Date().toISOString() }]; });
}
