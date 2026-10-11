// Vercel Serverless Function — 국립국어원 한국어기초사전 오픈API 프록시 (오늘의 낱말)
// 키(KRDICT_KEY)는 Vercel 환경변수에만 저장되며 클라이언트로 전달되지 않는다.
// 호출 예: /api/dict?q=학교        → 낱말 검색 (품사 · 어휘 등급 · 뜻풀이)
//         /api/dict?code=12345    → 낱말 하나의 자세한 내용 (예문 포함)
// 응답은 사전이 주는 XML 그대로 돌려준다 (해석은 앱이 한다). 보내는 것은 검색할 낱말뿐이다.
export default async function handler(req, res) {
  const KEY = process.env.KRDICT_KEY;
  if (!KEY) {
    res.status(500).json({ error: 'KRDICT_KEY_not_set' });
    return;
  }

  const one = (v) => (Array.isArray(v) ? v[0] : v);
  const q = String(one(req.query?.q) ?? '').trim();
  const code = String(one(req.query?.code) ?? '').trim();
  const usp = new URLSearchParams({ key: KEY });
  let path;
  if (/^\d{1,12}$/.test(code)) {
    path = 'view';
    usp.set('method', 'target_code');
    usp.set('q', code);
  } else if (q && q.length <= 30) {
    path = 'search';
    usp.set('q', q);
    usp.set('part', 'word');
    usp.set('num', '10');
  } else {
    res.status(400).json({ error: 'invalid_query' });
    return;
  }

  try {
    const upstream = await fetch(`https://krdict.korean.go.kr/api/${path}?${usp.toString()}`);
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');   // 사전 내용은 잘 바뀌지 않는다
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream_failed' });
  }
}
