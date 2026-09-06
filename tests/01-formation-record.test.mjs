// v2: formation record capture, banner, summary, textarea growth, persistence, legacy state
import { readFileSync } from 'node:fs';
import { startApp, launch, prepPage, report, tmpPath } from './helpers.mjs';

const app = await startApp(); const results=[]; const check=(name,ok,extra='')=>{results.push([ok?'PASS':'FAIL',name,extra]);};
const browser = await launch();
const ctx = await browser.newContext({ viewport:{width:420,height:900}, permissions:['clipboard-read','clipboard-write'] });
const page = await ctx.newPage();
await prepPage(page, app);
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
await page.goto(app.base);
// seed legacy v1 state to test backward compat later
await page.click('text=Get started');
const longIdea='Power Platform and identity governance automation for small teams and local agencies. I remove friction by building systems.';
await page.fill('#idea', longIdea);
// textarea growth: type 4 lines
await page.fill('#idea', 'line one\nline two\nline three\nline four');
const ta = await page.$eval('#idea', el=>({h:el.clientHeight, sh:el.scrollHeight, overflow: el.scrollHeight>el.clientHeight+1}));
check('Intake textarea grows to fit four lines (no internal scroll)', !ta.overflow, JSON.stringify(ta));
await page.fill('#idea', longIdea);
const stateOpts = await page.$$eval('#state option', os=>os.map(o=>({t:o.textContent, d:o.disabled})));
check('State dropdown lists Virginia as the only selectable state', stateOpts.filter(o=>!o.d).map(o=>o.t).join('|')==='Virginia' && stateOpts.some(o=>o.d), JSON.stringify(stateOpts));
check('State dropdown defaults to VA', (await page.inputValue('#state'))==='VA');
await page.click('text=Just me');
await page.click('text=Continue →');
// quiz: investors no, profit high, simplicity fine -> LLC with S-Corp election
const quizTexts = await page.$$eval('button.choice', bs=>bs.map(b=>b.textContent));
console.log('Q1', quizTexts);
async function pickContaining(words){ const bs=await page.$$('button.choice'); for(const b of bs){ const t=(await b.textContent()).toLowerCase(); if(words.some(w=>t.includes(w))){ await b.click(); return t;} } throw new Error('no option for '+words); }
console.log(await pickContaining(['no']));
await page.waitForTimeout(400); console.log(await pickContaining(['over','more than']));
await page.waitForTimeout(400); console.log(await pickContaining(['fine','don’t mind',"don't mind",'ok']));
await page.waitForTimeout(400);
const recoType = await page.textContent('.reco-type').catch(()=>'(no .reco-type)');
console.log('reco', recoType);
await page.click('text=/Show me my roadmap|Start my roadmap|roadmap/i');
await page.waitForSelector('#businessName');
const bannerBefore = await page.textContent('.idea-banner');
check('Banner falls back to a truncated idea before a name exists', bannerBefore.includes('…') && !bannerBefore.includes('by building systems.'), bannerBefore);
const disabledBefore = await page.$eval('button.btn-green', b=>b.disabled);
check('Step 1 "Mark complete" disabled until name entered', disabledBefore);
await page.fill('#businessName', 'Cloud Shield Systems LLC');
const disabledAfter = await page.$eval('button.btn-green', b=>b.disabled);
check('Step 1 "Mark complete" enabled after name entered', !disabledAfter);
const banner = await page.textContent('.idea-banner');
check('Roadmap banner reads "Your roadmap for: Cloud Shield Systems LLC · LLC with S-Corp election"', banner.replace(/\s+/g,' ').trim()==='Your roadmap for: Cloud Shield Systems LLC · LLC with S-Corp election', banner);
await page.click('button.btn-green');
// step 2 agent
await page.waitForSelector('text=Who’s your registered agent?');
const agentBtns = await page.$$('button.choice'); check('Step 2 shows two agent choices', agentBtns.length===2);
await agentBtns[1].click();
check('Agent choice remembered (selected class)', await page.$eval('button.choice.selected', b=>b.textContent.includes('registered agent service')));
await page.click('button.btn-green');
// step 3 articles
await page.click('button.btn-green');
// step 4 ein
await page.waitForSelector('#ein');
check('Step 4 shows optional EIN input, complete not blocked', !(await page.$eval('button.btn-green', b=>b.disabled)));
await page.fill('#ein', '12-3456789');
// reload mid-roadmap
await page.reload(); await page.waitForSelector('#ein');
const einAfter = await page.inputValue('#ein');
const stored = JSON.parse(await page.evaluate(()=>localStorage.getItem('business-launchpad-v1')));
check('stateCode persisted as VA', stored.stateCode==='VA', JSON.stringify(stored.stateCode));
check('Reload mid-roadmap: name, agent, EIN survive', einAfter==='12-3456789' && stored.record.businessName==='Cloud Shield Systems LLC' && stored.record.agentChoice==='service', JSON.stringify(stored.record));
await page.click('button.btn-green');
for (let i=0;i<3;i++){ await page.waitForTimeout(150); await page.click('button.btn-green'); }
await page.waitForSelector('text=You did it!');
const headline = (await page.textContent('p.sub')).replace(/\s+/g,' ').trim();
check('Summary headline reads "Cloud Shield Systems LLC is now a real, legal business in Virginia."', headline==='Cloud Shield Systems LLC is now a real, legal business in Virginia.', headline);
const rows = await page.$$eval('.record-row', rs=>rs.map(r=>r.textContent));
check('Formation record card shows rows', rows.length===5, JSON.stringify(rows));
await page.click('.btn-row button:has-text("Copy")');
const btnText = await page.textContent('button:has-text("Copied")').catch(()=>'' );
const clip = await page.evaluate(()=>navigator.clipboard.readText());
check('Copy button works + shows Copied ✓', btnText.includes('Copied ✓') && clip.includes('Legal name: Cloud Shield Systems LLC') && clip.includes('EIN: 12-3456789'), clip.replace(/\n/g,' | '));
await page.waitForTimeout(2200);
check('Copied state resets after 2s', (await page.textContent('.btn-row button:has-text("Copy")')).trim()==='Copy');
const foot = await page.textContent('.total-foot');
check('Paid agent adds ~$125/year recurring line', foot.includes('Registered agent service: ~$125/year (recurring, not included in the total above).'));
const total = await page.textContent('.total-row .amt'); check('One-time total stays $100 + ~$50', total.trim()==='$100 + ~$50', total);
const agentRowPaid = await page.$$eval('.summary-item', els=>els.map(e=>e.textContent).find(t=>t.includes('Appoint a registered agent')));
check('Paid agent: completed-steps row reads ~$125/yr (matches footer)', agentRowPaid.includes('~$125/yr'), agentRowPaid);
// self agent: no recurring line
await page.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('business-launchpad-v1')); s.record.agentChoice='self'; localStorage.setItem('business-launchpad-v1', JSON.stringify(s)); });
await page.reload(); await page.waitForSelector('.total-foot');
check('Self agent: no recurring line', !(await page.textContent('.total-foot')).includes('~$125/year'));
const agentRowSelf = await page.$$eval('.summary-item', els=>els.map(e=>e.textContent).find(t=>t.includes('Appoint a registered agent')));
check('Self agent: completed-steps row reads Free', agentRowSelf.endsWith('Free'), agentRowSelf);
check('Self agent: total still $100 + ~$50', (await page.textContent('.total-row .amt')).trim()==='$100 + ~$50');
check('Self agent row reads correctly', (await page.$$eval('.record-row', rs=>rs.map(r=>r.textContent))).some(t=>t.includes('Self (my Virginia address)')));
// legacy v1 state without record
await page.evaluate(()=>localStorage.setItem('business-launchpad-v1', JSON.stringify({phase:'roadmap', idea:'Mobile dog grooming', team:'solo', answers:{investors:'no',profit:'low',simplicity:'simple'}, qIndex:3, completed:['name','agent','articles'], viewIndex:3})));
await page.reload(); await page.waitForSelector('.idea-banner');
const done = await page.evaluate(()=>JSON.parse(localStorage.getItem('business-launchpad-v1')).completed);
check('Legacy v1 users keep completed steps, record starts empty', done.length===3 && (await page.textContent('.idea-banner')).includes('Mobile dog grooming'), JSON.stringify(done));
// legacy user going back to step 1 marked done: can undo, and re-complete requires name
check('No page errors', errors.length===0, errors.join(' || '));
await browser.close(); app.close();
report(results);
