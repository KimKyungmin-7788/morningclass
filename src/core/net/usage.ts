// 랜딩 페이지의 "함께한 학급 수"를 위해, 학생을 한 명 이상 넣은 학급을 학급마다 한 번만 서버(/api/count)에 알린다.
// 보내는 것은 학급 ID 를 SHA-256 으로 바꾼 값뿐이다 — 학교·학급 이름이나 학생 정보는 보내지 않는다.
import type { ClassRoom } from '@/core/data/types';

const SENT_KEY = 'mc2_counted';   // 이미 알린 학급 ID (이 기기). '모두 지우기'에서 mc2_ 로 함께 지워진다
const OFF_KEY = 'mc2_nocount';    // 이 기기는 세지 않음 — 앱 주소에 ?nocount 를 붙여 한 번 열면 켜지고, ?count 로 끈다
const MAX_IDS = 10;
/** 학교·학급 이름에 이 낱말이 있으면 시험용 학급으로 보고 세지 않는다 */
const TEST_NAME = /테스트|시험|데모|샘플|test|demo|sample/i;

export const isTestClass = (c: Pick<ClassRoom, 'schoolName' | 'className'>) => TEST_NAME.test(`${c.schoolName} ${c.className}`);

/** 주소의 ?nocount / ?count 를 기억하고, 이 기기를 세지 않을지 돌려준다 */
function deviceOff(): boolean {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('nocount')) localStorage.setItem(OFF_KEY, '1');
    if (q.has('count')) localStorage.removeItem(OFF_KEY);
    return localStorage.getItem(OFF_KEY) === '1';
  } catch {
    return false;
  }
}

function readSent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(SENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`morningclass:${text}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Countable = Pick<ClassRoom, 'id' | 'students' | 'schoolName' | 'className'>;

/** 아직 알리지 않은, 학생이 있고 시험용이 아닌 학급 ID */
export function classesToReport(classes: Countable[], sent: string[]): string[] {
  const done = new Set(sent);
  return classes.filter((c) => c.students.length > 0 && !isTestClass(c) && !done.has(c.id)).map((c) => c.id).slice(0, MAX_IDS);
}

let inFlight = false;

export async function reportClasses(classes: Countable[]): Promise<void> {
  if (inFlight || deviceOff() || !/^https:$/.test(location.protocol) || !crypto?.subtle) return;   // 로컬 미리보기·집계 끈 기기에서는 알리지 않는다
  const sent = readSent();
  const ids = classesToReport(classes, sent);
  if (!ids.length) return;
  inFlight = true;
  try {
    const hashed = await Promise.all(ids.map(sha256));
    const r = await fetch('/api/count', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: hashed }) });
    if (r.ok) localStorage.setItem(SENT_KEY, JSON.stringify([...sent, ...ids]));
  } catch {
    /* 알리지 못하면 다음에 다시 시도 */
  } finally {
    inFlight = false;
  }
}
