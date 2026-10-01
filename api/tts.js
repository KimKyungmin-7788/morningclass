// Vercel Serverless Function — 타입캐스트(Typecast) TTS 프록시
// 키(TYPECAST_API_KEY)는 Vercel 환경변수에만 저장되며 클라이언트로 전달되지 않는다. (목소리는 TYPECAST_VOICE_ID 로 바꿀 수 있음)
// 호출 예: /api/tts?t=안녕하세요&r=0.95  →  audio/mpeg
// 같은 문장은 CDN 에 캐시되어 크레딧이 다시 쓰이지 않는다. 학생 이름이 든 문장은 앱이 이 API 로 보내지 않는다.
const MAX_TEXT = 200;

module.exports = async (req, res) => {
  const KEY = process.env.TYPECAST_API_KEY;
  const VOICE = process.env.TYPECAST_VOICE_ID || 'tc_68ddea1e462b169ddd20b74d';  // 목소리 ID는 비밀이 아니라 기본값으로 둠
  if (!KEY || !VOICE) { res.status(503).json({ error: 'tts_not_configured' }); return; }

  // 다른 사이트가 우리 크레딧을 쓰지 못하도록 같은 사이트에서 온 요청만 허용
  const host = req.headers.host;
  const from = req.headers.origin || req.headers.referer;
  if (from) {
    let ok = false;
    try { ok = new URL(from).host === host; } catch (e) {}
    if (!ok) { res.status(403).json({ error: 'forbidden' }); return; }
  }

  const q = req.query || {};
  const text = String(Array.isArray(q.t) ? q.t[0] : q.t || '').trim();
  if (!text || text.length > MAX_TEXT) { res.status(400).json({ error: 'bad_text' }); return; }
  const rate = Math.min(2, Math.max(0.5, parseFloat(Array.isArray(q.r) ? q.r[0] : q.r) || 1));

  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 9000);
    const upstream = await fetch('https://api.typecast.ai/v1/text-to-speech', {
      method: 'POST',
      headers: { 'X-API-KEY': KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voice_id: VOICE,
        text,
        model: 'ssfm-v30',
        language: 'kor',
        output: { audio_format: 'mp3', audio_tempo: rate }
      }),
      signal: ctl.signal
    });
    clearTimeout(t);
    if (!upstream.ok) { res.status(upstream.status === 429 ? 429 : 502).json({ error: 'upstream_' + upstream.status }); return; }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, s-maxage=31536000, max-age=86400, immutable');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).json({ error: 'upstream_failed' });
  }
};
