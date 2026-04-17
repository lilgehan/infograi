// Vercel serverless function — CORS proxy for icon/logo images
// Allows browser to fetch Icons8, Clearbit, SimpleIcons without CORS errors
// Required for PNG/PDF export (html-to-image needs same-origin images)

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // Parse and validate URL
  let parsed;
  try { parsed = new URL(url); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  // Security allowlist — only proxy known icon/logo domains
  const allowed = ['img.icons8.com', 'logo.clearbit.com', 'cdn.simpleicons.org'];
  const ok = allowed.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  if (!ok) return res.status(403).json({ error: 'Domain not in allowlist' });

  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Infograi/2.2)' },
    });

    if (!upstream.ok) return res.status(upstream.status).end();

    const buf = await upstream.arrayBuffer();
    const ct  = upstream.headers.get('content-type') || 'application/octet-stream';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', ct);
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
