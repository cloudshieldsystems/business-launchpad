// v3: Articles date capture, annual fee due date, calendar links, record rows
import { readFileSync } from 'node:fs';
import { startApp, launch, prepPage, report, tmpPath } from './helpers.mjs';

const app = await startApp(); const results=[]; const check=(n,ok,x='')=>results.push([ok?'PASS':'FAIL',n,x]);
const browser = await launch();
const ctx = await browser.newContext({ viewport:{width:420,height:900}, permissions:['clipboard-read','clipboard-write'] });
const page = await ctx.newPage();
await prepPage(page, app);
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push(m.text()); });
await page.goto(app.base);
// Seed a v2 state: done phase, no articlesDate -> fallback card
await page.evaluate(()=>localStorage.setItem('business-launchpad-v1', JSON.stringify({phase:'done', idea:'x', team:'solo', answers:{investors:'no',profit:'high',simplicity:'fine'}, qIndex:3, completed:['name','agent','articles','ein','bank','tax','license'], viewIndex:6, record:{businessName:'Cloud Shield Systems LLC', agentChoice:'self', ein:'12-3456789'}})));
await page.reload(); await page.waitForSelector('text=Keep it alive');
check('v2 users without a date see the fallback nudge', await page.isVisible('text=Add my approval date'));
check('Fallback shows LLC fee text', (await page.textContent('body')).includes('$50 annual registration fee'));
await page.click('text=Add my approval date');
await page.waitForSelector('#articlesDate');
check('"Add my approval date" jumps to Step 3', (await page.textContent('.step-eyebrow')).includes('Step 3 of 7') && (await page.textContent('h2')).includes('Articles'));
check('Step 3 date input is optional (complete not blocked)', !(await page.$eval('button.btn-green, button.btn-secondary', b=>b.disabled)));
await page.fill('#articlesDate', '2025-08-15');
await page.reload(); await page.waitForSelector('#articlesDate');
check('Date survives reload', (await page.inputValue('#articlesDate'))==='2025-08-15');
// back to summary via completing? Steps all done; use Next to end then... simply set phase done via storage
await page.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('business-launchpad-v1')); s.phase='done'; localStorage.setItem('business-launchpad-v1', JSON.stringify(s)); });
await page.reload(); await page.waitForSelector('.due-box');
const today=new Date(); const expY = (today.getMonth()+1>8 || (today.getMonth()+1===8 && today.getDate()>31)) ? today.getFullYear()+1 : today.getFullYear();
const dueText = await page.textContent('.due-box .v');
check('Due box shows Aug 31 of correct year', dueText.trim()===`August 31, ${expY}`, dueText);
const rows = await page.$$eval('.record-row', rs=>rs.map(r=>r.textContent));
check('Record has Articles approved + Annual fee due rows', rows.some(r=>r.startsWith('Articles approvedAugust 15, 2025')) && rows.some(r=>r.startsWith('Annual fee due')&&r.includes('($50)')), JSON.stringify(rows));
const g = await page.getAttribute('a:has-text("Google Calendar")','href');
check('Google Calendar link has yearly RRULE and right date', g.includes(`dates=${expY}0831/${expY}0901`) && g.includes(encodeURIComponent('RRULE:FREQ=YEARLY')) && g.includes('Cloud%20Shield'), g.slice(0,140));
const ics = await page.getAttribute('a:has-text(".ics")','href');
const dl = await page.getAttribute('a:has-text(".ics")','download');
const icsText = decodeURIComponent(ics.split(',')[1]);
check('.ics link is a valid yearly all-day event with 14-day alarm', dl==='virginia-annual-fee.ics' && icsText.startsWith('BEGIN:VCALENDAR') && icsText.includes(`DTSTART;VALUE=DATE:${expY}0831`) && icsText.includes('TRIGGER:-P14D') && icsText.includes('SUMMARY:Cloud Shield Systems LLC: Virginia annual registration fee due ($50)'), icsText.split('\r\n').slice(0,12).join(' | '));
await page.click('.btn-row button:has-text("Copy")');
const clip = await page.evaluate(()=>navigator.clipboard.readText());
check('Copied record includes approval date and due date', clip.includes('Articles approved: August 15, 2025') && clip.includes(`Annual fee due: August 31, ${expY} ($50)`), clip.replace(/\n/g,' | '));
// C-corp variant
await page.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('business-launchpad-v1')); s.answers={investors:'yes'}; localStorage.setItem('business-launchpad-v1', JSON.stringify(s)); });
await page.reload(); await page.waitForSelector('.due-box');
check('C-Corp shows "from $100" annual report fee', (await page.textContent('body')).includes('from $100 annual report + registration fee'));
// Legacy v1 state (no record at all) still renders summary
await page.evaluate(()=>localStorage.setItem('business-launchpad-v1', JSON.stringify({phase:'done', idea:'Dog grooming', team:'solo', answers:{}, qIndex:3, completed:['name','agent','articles','ein','bank','tax','license'], viewIndex:6})));
await page.reload(); await page.waitForSelector('text=You did it!');
check('Legacy v1 state renders summary with fallback card', await page.isVisible('text=Add my approval date'));
check('No page errors', errors.length===0, errors.join(' || '));
await page.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('business-launchpad-v1')); s.record={businessName:'Cloud Shield Systems LLC',agentChoice:'service',ein:'12-3456789',articlesDate:'2025-08-15'}; s.answers={investors:'no',profit:'high',simplicity:'fine'}; localStorage.setItem('business-launchpad-v1', JSON.stringify(s)); });
await page.reload(); await page.waitForSelector('.due-box');
await browser.close(); app.close();
report(results);
