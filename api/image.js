// Vercel Serverless Function — 이미지 검색 프록시 (급식 메뉴 그림용)
// 키는 Vercel 환경변수에만 저장되며 클라이언트로 전달되지 않는다. 설정된 키 순서대로 사용:
//   1) KAKAO_REST_API_KEY                 — 카카오(다음) 이미지 검색 (Kakao Developers, 무료)
//   2) NCP_API_KEY_ID + NCP_API_KEY       — 네이버 이미지 검색 (NAVER API Hub, 네이버 클라우드 플랫폼)
//   3) NAVER_CLIENT_ID + NAVER_CLIENT_SECRET — 네이버 개발자센터 기존 키 (2026년 이전 발급분)
// 호출 예: /api/image?q=쇠고기미역국  →  { items: [{ thumb, link, title }] }
const clean = s => String(s || '').replace(/<[^>]+>/g, '');

async function kakao(q, key) {
  const r = await fetch(`https://dapi.kakao.com/v2/search/image?query=${encodeURIComponent(q)}&sort=accuracy&size=6`,
    { headers: { Authorization: `KakaoAK ${key}` } });
  if (!r.ok) throw new Error('kakao_' + r.status);
  const d = await r.json();
  return (d.documents || []).map(it => ({ thumb: it.thumbnail_url, link: it.image_url, title: clean(it.display_sitename) }));
}

async function naver(q, url, headers) {
  const r = await fetch(`${url}?query=${encodeURIComponent(q)}&display=6&sort=sim&filter=medium`, { headers });
  if (!r.ok) throw new Error('naver_' + r.status);
  const d = await r.json();
  return (d.items || []).map(it => ({ thumb: it.thumbnail, link: it.link, title: clean(it.title) }));
}

// /api/image?url=... — 외부 그림을 대신 받아 전달 (학습지 PDF 제작 시 CORS 우회). 공개 주소의 이미지만 허용
function isPublicUrl(u) {
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) return false;
    const h = x.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || h === '[::1]' || h.startsWith('[')) return false;
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    return true;
  } catch (e) { return false; }
}
async function relay(res, url) {
  if (!isPublicUrl(url)) { res.status(400).json({ error: 'bad_url' }); return; }
  try {
    let r;
    for (let tries = 0; tries < 2 && !r; tries++) {                 // 일시적 연결 오류는 한 번 더 시도
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
      try { r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }); }
      catch (e) { if (tries) throw e; }
      finally { clearTimeout(t); }
    }
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) { res.status(502).json({ error: 'not_image' }); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 6 * 1024 * 1024) { res.status(413).json({ error: 'too_large' }); return; }
    res.setHeader('Content-Type', type);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=604800');
    res.status(200); res.end(buf);
  } catch (e) { res.status(502).json({ error: 'fetch_failed' }); }
}

module.exports = async (req, res) => {
  const E = process.env;
  if ((req.query || {}).url) { await relay(res, String(req.query.url)); return; }
  const q = String((req.query || {}).q || '').trim().slice(0, 50);
  if (!q) { res.status(400).json({ error: 'empty_query' }); return; }

  const providers = [];
  if (E.KAKAO_REST_API_KEY) providers.push(() => kakao(q, E.KAKAO_REST_API_KEY));
  if (E.NCP_API_KEY_ID && E.NCP_API_KEY) providers.push(() => naver(q, 'https://naverapihub.apigw.ntruss.com/search/v1/image',
    { 'X-NCP-APIGW-API-KEY-ID': E.NCP_API_KEY_ID, 'X-NCP-APIGW-API-KEY': E.NCP_API_KEY }));
  if (E.NAVER_CLIENT_ID && E.NAVER_CLIENT_SECRET) providers.push(() => naver(q, 'https://openapi.naver.com/v1/search/image',
    { 'X-Naver-Client-Id': E.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': E.NAVER_CLIENT_SECRET }));
  if (!providers.length) { res.status(500).json({ error: 'image_key_not_set' }); return; }

  for (const p of providers) {
    try {
      const items = (await p()).filter(it => it.thumb);
      res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');   // 같은 메뉴는 하루 캐시
      res.status(200).json({ items });
      return;
    } catch (e) { /* 다음 제공자로 */ }
  }
  res.status(502).json({ error: 'fetch_failed' });
};
