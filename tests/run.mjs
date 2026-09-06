// Runs every *.test.mjs in this folder sequentially and summarizes. Pass --live to hit the deployed site.
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const dir = path.dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort();
const extra = process.argv.slice(2);
let pass = 0, fail = 0, broken = 0;
console.log(`Running ${suites.length} suites${extra.includes('--live') ? ' against the LIVE site' : ' against docs/'}\n`);
for (const s of suites) {
  const r = spawnSync(process.execPath, [path.join(dir, s), ...extra], { encoding: 'utf8', env: process.env });
  const out = (r.stdout || '') + (r.stderr || '');
  const p = (out.match(/^PASS /gm) || []).length, f = (out.match(/^FAIL /gm) || []).length;
  pass += p; fail += f;
  const crashed = r.status !== 0 && f === 0;
  if (crashed) broken++;
  console.log(`${crashed ? 'CRASH' : f ? 'FAIL ' : 'OK   '} ${s}  (${p} pass, ${f} fail)`);
  if (f || crashed) console.log(out.split('\n').filter(l => /^FAIL |Error|error/.test(l)).map(l => '   ' + l).join('\n'));
}
console.log(`\nTOTAL: ${pass} pass, ${fail} fail, ${broken} crashed`);
process.exit(fail || broken ? 1 : 0);
