// Vercel Serverless Function — 아침교실을 쓴 학급 수 (랜딩 페이지 "함께한 학급" 표시용)
// 저장소는 Upstash Redis (Vercel Marketplace 연동 시 환경변수가 자동으로 들어온다). 토큰은 서버에만 있다.
//   GET  /api/count              → { count }  지금까지 알려 온 학급 수 (10분 캐시)
//   POST /api/count  { ids: [] } → 학급 ID 를 브라우저에서 SHA-256 으로 바꾼 값만 받는다.
// 받은 값은 HyperLogLog(PFADD)에 넣어 '서로 다른 값의 개수'만 남기고, 값 자체는 꺼내 볼 수 없다.
// 부풀리기를 막으려고 같은 접속 주소에서 하루 POST_LIMIT 번까지만 받는다 — 주소는 그날의 소금과 섞은 해시로만, 하루 뒤 지워진다.
import { createHash } from 'node:crypto';

const KEY = 'mc:classes';
const POST_LIMIT = 20;            // 한 학교가 같은 주소(NAT)로 여러 반을 등록해도 넉넉하도록
const MAX_IDS = 10;
// 집계를 시작하기 전부터 쓰던 학급(운영자 추정 11곳). 이 학급들도 앱을 열면 다시 세지므로 더하지 않고 '최소값'으로만 쓴다
const BASELINE = 11;

const env = () => ({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

async function redis(commands) {
  const { url, token } = env();
  const r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis_' + r.status);
  return (await r.json()).map((x) => x.result);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return req.headers['sec-fetch-site'] !== 'cross-site';
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

export default async function handler(req, res) {
  const { url, token } = env();
  if (!url || !token) { res.status(503).json({ error: 'store_not_set' }); return; }

  try {
    if (req.method === 'GET') {
      const [count] = await redis([['PFCOUNT', KEY]]);
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
      res.status(200).json({ count: Math.max(BASELINE, Number(count) || 0) });
      return;
    }

    if (req.method === 'POST') {
      if (!sameOrigin(req)) { res.status(403).json({ error: 'forbidden' }); return; }
      let body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
      const ids = Array.isArray(body?.ids) ? body.ids.filter((x) => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x)) : [];
      if (!ids.length || ids.length > MAX_IDS) { res.status(400).json({ error: 'invalid_ids' }); return; }

      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
      const day = new Date().toISOString().slice(0, 10);
      const rl = 'mc:rl:' + createHash('sha256').update(`${day}|${ip}|${token.slice(0, 16)}`).digest('hex').slice(0, 32);
      const [n] = await redis([['INCR', rl], ['EXPIRE', rl, 86400]]);
      if (Number(n) > POST_LIMIT) { res.status(429).json({ error: 'too_many' }); return; }

      await redis([['PFADD', KEY, ...ids]]);
      res.setHeader('Cache-Control', 'no-store');
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    res.status(502).json({ error: 'store_failed' });
  }
}
