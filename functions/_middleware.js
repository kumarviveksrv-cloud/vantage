/**
 * Geo-restriction middleware — Vantage / Virorah
 * Allows only India (IN) traffic to reach the app.
 * Static assets are always served (needed for OG crawlers, CDN, etc.)
 */

const STATIC_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico',
  '.css', '.js', '.woff', '.woff2', '.ttf', '.otf',
  '.gif', '.json', '.txt', '.xml', '.xlsx', '.pdf',
  '.manifest', '.map',
];

function isStaticAsset(pathname) {
  return STATIC_EXTENSIONS.some((ext) => pathname.toLowerCase().endsWith(ext));
}

function geoBlockedPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vantage — Coming Soon to Your Region</title>
<link rel="icon" href="/favicon.png">
<style>
  :root {
    --bg: #050410;
    --surface: rgba(255,255,255,0.04);
    --border: rgba(255,255,255,0.08);
    --indigo: #6366f1;
    --purple: #a855f7;
    --text: #f4f3ff;
    --muted: rgba(244,243,255,0.5);
    --faint: rgba(244,243,255,0.28);
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, 'Segoe UI', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .glow {
    position: fixed; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse 60% 50% at 50% 40%,
      rgba(99,102,241,0.10) 0%, transparent 70%);
  }
  .card {
    position: relative; z-index: 1;
    text-align: center;
    padding: 56px 40px 48px;
    max-width: 480px;
    width: 90%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    background: rgba(99,102,241,0.12);
    border: 1px solid rgba(99,102,241,0.28);
    border-radius: 100px;
    padding: 6px 16px;
    font-size: 13px; font-weight: 600;
    color: #a5b4fc;
    letter-spacing: 0.04em;
    margin-bottom: 28px;
  }
  .dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80;
    box-shadow: 0 0 6px rgba(74,222,128,0.8); }
  h1 {
    font-size: 28px; font-weight: 800;
    line-height: 1.2; margin-bottom: 16px;
    letter-spacing: -0.02em;
  }
  h1 span {
    background: linear-gradient(135deg, #6366f1, #a855f7);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  p {
    font-size: 15px; line-height: 1.65;
    color: var(--muted); margin-bottom: 32px;
  }
  a.btn {
    display: inline-block;
    background: linear-gradient(135deg, var(--indigo), var(--purple));
    color: #fff; text-decoration: none;
    padding: 12px 28px; border-radius: 10px;
    font-size: 14px; font-weight: 600;
    transition: opacity 0.2s;
  }
  a.btn:hover { opacity: 0.85; }
  .footer {
    margin-top: 32px;
    font-size: 12px; color: var(--faint);
  }
</style>
</head>
<body>
<div class="glow"></div>
<div class="card">
  <div class="badge"><div class="dot"></div>Vantage by Virorah</div>
  <h1>Currently available<br>in <span>India only</span></h1>
  <p>
    Vantage is live and growing fast — but right now we're focused on
    building the best possible experience for the Indian market.<br><br>
    Global access is on the roadmap. We'll reach you soon.
  </p>
  <a class="btn" href="https://www.linkedin.com/company/virorah/" target="_blank" rel="noopener">
    Follow us for updates
  </a>
  <div class="footer">virorah.com &nbsp;·&nbsp; vantage.virorah.com</div>
</div>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  // Always serve static assets — needed for OG crawlers, CDN, bots
  if (isStaticAsset(url.pathname)) {
    return next();
  }

  // request.cf is populated by Cloudflare in production; undefined in local dev
  const country = request.cf?.country;

  // Pass through: India, or no country data (local dev / CF preview)
  if (!country || country === 'IN') {
    return next();
  }

  // Non-India: return branded restriction page
  return new Response(geoBlockedPage(), {
    status: 200,
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });
}
