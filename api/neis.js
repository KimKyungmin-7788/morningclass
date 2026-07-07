// Vercel Serverless Function — NEIS 오픈API 프록시
// 키(NEIS_KEY)는 Vercel 환경변수에만 저장되며 클라이언트로 전달되지 않는다.
// 호출 예: /api/neis?endpoint=mealServiceDietInfo&ATPT_OFCDC_SC_CODE=...&SD_SCHUL_CODE=...&MLSV_YMD=...
module.exports = async (req, res) => {
  const KEY = process.env.NEIS_KEY;
  if (!KEY) {
    res.status(500).json({ error: 'NEIS_KEY_not_set' });
    return;
  }

  const { endpoint, ...params } = req.query || {};
  const ALLOWED = ['mealServiceDietInfo', 'schoolInfo'];
  if (!ALLOWED.includes(endpoint)) {
    res.status(400).json({ error: 'invalid_endpoint' });
    return;
  }

  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) usp.set(k, Array.isArray(v) ? v[0] : String(v));
  }
  usp.set('KEY', KEY);
  usp.set('Type', 'json');

  const url = `https://open.neis.go.kr/hub/${endpoint}?${usp.toString()}`;

  try {
    const upstream = await fetch(url);
    const text = await upstream.text();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600');
    res.status(200).send(text);
  } catch (e) {
    res.status(502).json({ error: 'upstream_failed' });
  }
};
