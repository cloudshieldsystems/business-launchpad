// v5: Share via Web Share API, cancel/failure fallbacks, mailto fallback
import { readFileSync } from 'node:fs';
import { startApp, launch, prepPage, report, tmpPath } from './helpers.mjs';

const app = await startApp(); const results=[]; const check=(n,ok,x='')=>results.push([ok?'PASS':'FAIL',n,x]);
const browser = await launch();
const ctx = await browser.newContext({ viewport:{width:420,height:900}, permissions:['clipboard-read','clipboard-write'] });
const page = await ctx.newPage();
await prepPage(page, app);
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
const seed = {phase:'done', idea:'Power Platform automation', team:'solo', answers:{investors:'no',profit:'high',simplicity:'fine'}, qIndex:3, completed:['name','agent','articles','ein','bank','tax','license'], viewIndex:6, record:{businessName:'Cloud Shield Systems LLC', agentChoice:'service', ein:'12-3456789', articlesDate:'2025-08-15'}};
await page.goto(app.base);
await page.evaluate((s)=>localStorage.setItem('business-launchpad-v1', JSON.stringify(s)), seed);
// 1) native share available
await page.addInitScript(()=>{ window.__shares=[]; navigator.share = (d)=>{ window.__shares.push(d); return Promise.resolve(); }; });
await page.reload(); await page.waitForSelector('text=Share');
check('Share and Copy sit side by side under Download PDF', (await page.$$eval('.btn-row .btn', b=>b.length))===2 && await page.isVisible('text=Download PDF'));
await page.click('button:has-text("Share")'); await page.waitForTimeout(100);
const sh = await page.evaluate(()=>window.__shares);
check('Share calls navigator.share once', sh.length===1);
check('Share title names the business', sh[0]?.title==='Cloud Shield Systems LLC — Formation Record', sh[0]?.title);
check('Share text has all record rows + app link', ['Legal name: Cloud Shield Systems LLC','Entity type: LLC with S-Corp election','Registered agent: Registered agent service','Articles approved: August 15, 2025','EIN: 12-3456789','State: Virginia','Annual fee due: August 31, 2027 ($50)','https://cloudshieldsystems.github.io/business-launchpad/'].every(t=>(sh[0]?.text||'').includes(t)), (sh[0]?.text||'').replace(/\n/g,' | '));
// 2) user cancels share -> silent
await page.evaluate(()=>{ navigator.share = ()=>Promise.reject(Object.assign(new Error('cancel'), {name:'AbortError'})); });
await page.click('button:has-text("Share")'); await page.waitForTimeout(150);
check('Cancelled share stays silent (button unchanged)', (await page.textContent('button:has-text("Share")')).includes('Share') && !(await page.isVisible('text=Copied instead')));
// 3) share fails for another reason -> copies instead
await page.evaluate(()=>{ navigator.share = ()=>Promise.reject(new Error('boom')); });
await page.click('button:has-text("Share")'); await page.waitForSelector('text=Copied instead ✓');
const clip = await page.evaluate(()=>navigator.clipboard.readText());
check('Failed share falls back to clipboard with "Copied instead ✓"', clip.includes('EIN: 12-3456789') && clip.includes('Built with Business Launchpad'));
await page.waitForTimeout(2600);
check('"Copied instead" resets', !(await page.isVisible('text=Copied instead')));
// 4) no Web Share API -> mailto fallback
const page2 = await ctx.newPage();
await prepPage(page2, app);
await page2.addInitScript(()=>{ delete Navigator.prototype.share; window.__hrefs=[]; HTMLAnchorElement.prototype.click = function(){ window.__hrefs.push(this.href); }; });
await page2.goto(app.base); await page2.waitForSelector('text=Share');
await page2.click('button:has-text("Share")'); await page2.waitForTimeout(100);
const hrefs = await page2.evaluate(()=>window.__hrefs);
const m = hrefs[0] || '';
check('Without navigator.share, opens a prefilled mailto', m.startsWith('mailto:?subject=') && decodeURIComponent(m).includes('subject=Cloud Shield Systems LLC — Formation Record') && decodeURIComponent(m).includes('EIN: 12-3456789'), m.slice(0,90));
// 5) copy button still works with the short label
await page.click('button:has-text("Copy")'); await page.waitForSelector('text=Copied ✓');
check('Copy button still copies the record', (await page.evaluate(()=>navigator.clipboard.readText())).startsWith('Formation record — Business Launchpad'));
check('No page errors', errors.length===0, errors.join(' || '));
await browser.close(); app.close();
report(results);
