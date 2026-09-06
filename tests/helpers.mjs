// Shared harness for the browser acceptance suites.
//
//   npm test              run every suite against docs/ served locally
//   npm run test:live     run every suite against the deployed GitHub Pages site
//
// Env:
//   LIVE_URL        override the live base URL (default: the GitHub Pages site)
//   CHROMIUM_PATH   use a specific Chromium binary instead of Playwright's download
//   LIVE_VIA_CURL=1 in live mode, fetch the site's responses with curl and hand them to the
//                   browser (for sandboxes where the browser can't open HTTPS tunnels but curl can)
import { chromium } from 'playwright';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const DOCS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const DEFAULT_LIVE = 'https://cloudshieldsystems.github.io/business-launchpad/';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon' };

export const isLive = process.argv.includes('--live') || Boolean(process.env.LIVE_URL);

/** Serve docs/ on a free local port, or point at the live site. */
export async function startApp() {
  if (isLive) {
    const base = process.env.LIVE_URL || DEFAULT_LIVE;
    return { base, live: true, close() {} };
  }
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const file = path.join(DOCS, p);
    if (!file.startsWith(DOCS) || !existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', MIME[path.extname(file)] || 'application/octet-stream');
    res.end(readFileSync(file));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${srv.address().port}/`, live: false, close: () => srv.close() };
}

/** Launch Chromium. Honors CHROMIUM_PATH; otherwise uses Playwright's install, with a sandbox fallback. */
export async function launch() {
  let executablePath = process.env.CHROMIUM_PATH;
  if (!executablePath) {
    const dflt = chromium.executablePath();
    if (!existsSync(dflt) && existsSync('/opt/pw-browsers/chromium')) executablePath = '/opt/pw-browsers/chromium';
  }
  return chromium.launch({ executablePath, args: ['--no-sandbox'] });
}

/** Per-page setup. In live mode with LIVE_VIA_CURL=1, serve the live origin through curl. */
export async function prepPage(page, app) {
  if (!app.live || process.env.LIVE_VIA_CURL !== '1') return;
  const origin = new URL(app.base).origin;
  await page.route(u => u.origin === origin, async (route) => {
    const url = route.request().url();
    try {
      const out = execFileSync('curl', ['-sS', '--max-time', '30', '-w', '\n%{content_type}\n%{http_code}', url], { maxBuffer: 64e6 });
      const s = out.toString('latin1');
      const i1 = s.lastIndexOf('\n'); const status = parseInt(s.slice(i1 + 1), 10) || 200;
      const i0 = s.lastIndexOf('\n', i1 - 1); const ct = s.slice(i0 + 1, i1) || 'application/octet-stream';
      await route.fulfill({ status, body: out.subarray(0, i0), headers: { 'content-type': ct } });
    } catch { await route.abort(); }
  });
}

export function tmpPath(name) { return path.join(os.tmpdir(), name); }

/** Print results and exit non-zero on any failure. */
export function report(results) {
  for (const [status, name, extra] of results) console.log(`${status}  ${name}${extra ? '  ' + extra : ''}`);
  const ok = results.every(r => r[0] === 'PASS');
  console.log(ok ? 'ALL PASS' : 'SOME FAIL');
  process.exitCode = ok ? 0 : 1;
}
