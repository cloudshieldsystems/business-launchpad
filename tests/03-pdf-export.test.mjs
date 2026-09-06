// v4: print-to-PDF sheet (hidden on screen, one page in print, title handling)
import { readFileSync } from 'node:fs';
import { startApp, launch, prepPage, report, tmpPath } from './helpers.mjs';

const app = await startApp(); const results=[]; const check=(n,ok,x='')=>results.push([ok?'PASS':'FAIL',n,x]);
const browser = await launch();
const page = await browser.newPage({ viewport:{width:420,height:900} });
await prepPage(page, app);
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
await page.goto(app.base);
await page.evaluate(()=>localStorage.setItem('business-launchpad-v1', JSON.stringify({phase:'done', idea:'Power Platform automation for small teams', team:'solo', answers:{investors:'no',profit:'high',simplicity:'fine'}, qIndex:3, completed:['name','agent','articles','ein','bank','tax','license'], viewIndex:6, record:{businessName:'Cloud Shield Systems LLC', agentChoice:'service', ein:'12-3456789', articlesDate:'2025-08-15'}})));
await page.reload(); await page.waitForSelector('text=Download PDF');
check('Print sheet hidden on screen', !(await page.isVisible('.print-sheet')));
check('Topbar visible on screen', await page.isVisible('.topbar'));
// stub window.print and check title handling
await page.evaluate(()=>{ window.__printed=0; window.print=()=>{ window.__printed++; window.__titleAtPrint=document.title; setTimeout(()=>window.dispatchEvent(new Event('afterprint')),50); }; });
const before = await page.title();
await page.click('text=Download PDF');
await page.waitForTimeout(200);
const r = await page.evaluate(()=>({n:window.__printed, t:window.__titleAtPrint, now:document.title}));
check('Download PDF calls window.print once', r.n===1);
check('Title set to "<name> - Formation Record" during print', r.t==='Cloud Shield Systems LLC - Formation Record', r.t);
check('Title restored after print', r.now===before, r.now);
// print media rendering
await page.emulateMedia({ media:'print' });
check('In print: sheet visible, screen UI hidden', (await page.isVisible('.print-sheet')) && !(await page.isVisible('.no-print')) && !(await page.isVisible('.topbar')));
const sheet = await page.textContent('.print-sheet');
check('Sheet has name, entity, EIN, agent, due date, total', ['Cloud Shield Systems LLC','LLC with S-Corp election','12-3456789','Registered agent service','August 31, 2027','$100 + ~$50','~$125/year','guide, not legal advice'].every(t=>sheet.includes(t)), sheet.slice(0,200));
const rows = await page.$$eval('.ps-grid tr', trs=>trs.length);
check('Sheet tables: 7 detail rows + 7 steps + total = 15 rows', rows===15, String(rows));
const pdfPath=tmpPath('formation-record.pdf');
await page.pdf({ path: pdfPath, format:'Letter', printBackground:true, preferCSSPageSize:true });
const bytes = readFileSync(pdfPath); const pages = (bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g)||[]).length;
check('PDF renders to exactly one page', pages===1, `${pages} pages, ${bytes.length} bytes`);
// no-record user: no PDF button, sheet still renders without crashing
await page.emulateMedia({ media:'screen' });
await page.evaluate(()=>localStorage.setItem('business-launchpad-v1', JSON.stringify({phase:'done', idea:'Dog grooming', team:'solo', answers:{}, qIndex:3, completed:['name','agent','articles','ein','bank','tax','license'], viewIndex:6})));
await page.reload(); await page.waitForSelector('text=You did it!');
check('Legacy user without record: no PDF button, page renders', !(await page.isVisible('text=Download PDF')) && (await page.$('.print-sheet'))!==null);
check('No page errors', errors.length===0, errors.join(' || '));
await browser.close(); app.close();
report(results);
