// Vercel Serverless Function — 우리 학교 학급 명단 불러오기 (비밀번호 확인 후에만 명단을 내려줌)
// 명단(ROSTER_JSON)과 비밀번호(ROSTER_PIN)는 Vercel 환경변수에만 저장한다. 저장소·화면 코드에는 학생 정보가 없다.
// 호출: POST /api/roster  { level:'초등', grade:1, cls:1, pin:'****' }  →  { students:[...] }
const crypto = require('crypto');

const fails = new Map();                       // ip → {n, until} (인스턴스 메모리 안의 간단한 시도 제한)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const same = (a, b) => {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }
  const PIN = process.env.ROSTER_PIN, RAW = process.env.ROSTER_JSON;
  if (!PIN || !RAW) { res.status(503).json({ error: 'not_configured' }); return; }

  const host = req.headers.host, from = req.headers.origin;
  if (from) {
    let ok = false;
    try { ok = new URL(from).host === host; } catch (e) {}
    if (!ok) { res.status(403).json({ error: 'forbidden' }); return; }
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
  const f = fails.get(ip) || { n: 0, until: 0 };
  if (f.until > Date.now()) { res.status(429).json({ error: 'locked', wait: Math.ceil((f.until - Date.now()) / 1000) }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (!same(b.pin == null ? '' : b.pin, PIN)) {
    f.n++;
    if (f.n >= 5) { f.until = Date.now() + 10 * 60 * 1000; f.n = 0; }   // 5번 틀리면 10분 잠금
    fails.set(ip, f);
    await sleep(800);
    res.status(401).json({ error: 'bad_pin' });
    return;
  }
  fails.delete(ip);

  let roster;
  try { roster = JSON.parse(RAW); } catch (e) { res.status(500).json({ error: 'bad_config' }); return; }
  const students = roster && roster[String(b.level)] && roster[String(b.level)][`${+b.grade}-${+b.cls}`];
  if (!students) { res.status(404).json({ error: 'no_class' }); return; }
  res.status(200).json({ students });
};
