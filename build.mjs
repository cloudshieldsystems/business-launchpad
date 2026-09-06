// Rebuild docs/index.html (the deployable GitHub Pages build) from index.html (the JSX dev version).
//
//   npm install --no-save @babel/standalone@7.26.4   # once
//   node build.mjs
//
// Assembly: PWA <head> + the <style> block from index.html + the React/ReactDOM bundles
// already inlined in docs/index.html + the JSX from index.html pre-compiled with Babel
// (preset "react") + the service-worker registration. Never hand-edit docs/index.html.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let Babel;
try { Babel = require('@babel/standalone'); }
catch { console.error('Missing @babel/standalone. Run: npm install --no-save @babel/standalone@7.26.4'); process.exit(1); }

const src = readFileSync('index.html', 'utf8');
const prev = readFileSync('docs/index.html', 'utf8');

const pick = (s, re, what) => { const m = s.match(re); if (!m) throw new Error('Could not find ' + what); return m[1]; };

const style = pick(src, /(<style>[\s\S]*?<\/style>)/, '<style> block in index.html');
const jsx = pick(src, /<script type="text\/babel"[^>]*>\n([\s\S]*?)<\/script>/, 'JSX script in index.html');
// Everything between the root div and the compiled-app script in the previous build = inlined React + ReactDOM.
const vendor = pick(prev, /<div id="root"><\/div>\n([\s\S]*?)<script>\nconst \{\n  useState/, 'inlined React bundles in docs/index.html');

const compiled = Babel.transform(jsx, { presets: ['react'], sourceType: 'script' }).code;

const head = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#4f46e5" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Launchpad" />
<meta name="description" content="A step-by-step guide to legally forming your business in Virginia — plain English, real links, real costs." />
<link rel="manifest" href="manifest.json" />
<link rel="apple-touch-icon" href="icons/icon-180.png" />
<link rel="icon" type="image/png" href="icons/icon-192.png" />
<title>Business Launchpad</title>
`;

const out = head + style + `
</head>
<body>
<div id="root"></div>
` + vendor + `<script>
` + compiled + `
</script>
<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
</script>
</body>
</html>
`;

writeFileSync('docs/index.html', out);
console.log('Wrote docs/index.html (' + out.length + ' bytes)');
