'use strict';
/* Browser tests: real Chromium via Playwright, app served from 127.0.0.1. */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { start, ROOT } = require('./server.js');

let server, url, browser;
before(async () => { ({ server, url } = await start()); browser = await chromium.launch(); });
after(async () => { await browser.close(); server.close(); });

const GOOD = {
  company: 'Example Robotics Ltd',
  title: 'Company-posted job: Finance Manager',
  url: 'https://example.com/careers/finance-manager',
  facts: 'First finance hire in London\nWill choose an expense tool this year',
  hyp: 'A first finance hire may be choosing spend tools soon.',
  unk: 'Whether the role is filled\nWhich accounting system they use'
};

async function open(opts = {}) {
  const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }, opts));
  ctx.setDefaultTimeout(5000);
  const page = await ctx.newPage();
  const errors = [], external = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { const u = r.url(); if (!u.startsWith(url) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u); });
  page.on('dialog', d => (page.__dialog === 'dismiss' ? d.dismiss() : d.accept()));
  await page.goto(url);
  return { ctx, page, errors, external };
}
const text = (page, sel) => page.locator(sel).first().textContent();

async function addSignal(page, v = GOOD) {
  await page.click('#intakeToggle');
  await page.fill('#iCompany', v.company);
  await page.fill('#iTitle', v.title);
  await page.fill('#iUrl', v.url);
  await page.fill('#iFacts', v.facts);
  await page.fill('#iHyp', v.hyp);
  await page.fill('#iUnk', v.unk);
  await page.click('#intakeSubmit');
}
async function tickAll(page) {
  for (const k of ['crm', 'facts', 'claims', 'pii', 'nosend']) await page.check('[data-rev="' + k + '"]');
}
async function importText(page, body) {
  await page.setInputFiles('#importFile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(body) });
  await page.waitForFunction(() => document.querySelector('#dataMsg').textContent.length > 0);
}

test('loads clean: no errors, no external requests, literal art and logo', async () => {
  const { ctx, page, errors, external } = await open();
  for (const id of ['.hero-art', '.band', '#fbArt']) await page.locator(id).scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-art] img')].every(i => i.complete && i.naturalWidth > 0));
  const svg = await page.locator('.brand svg').evaluate(s => [s.getAttribute('viewBox'), s.getAttribute('width'), s.getAttribute('aria-label')]);
  assert.deepEqual(svg, ['0 0 71 20', '75', 'Go to homepage']);
  assert.equal(await page.locator('#playBtn, video').count(), 0);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  await ctx.close();

  const ctx2 = await browser.newContext();
  const p2 = await ctx2.newPage();
  const errs2 = [];
  p2.on('pageerror', e => errs2.push(String(e)));
  await p2.goto('file://' + path.join(ROOT, 'index.html'));
  assert.equal(await p2.locator('#qs li').count(), 6, 'works when opened straight from disk');
  assert.deepEqual(errs2, []);
  await ctx2.close();
});

test('intake: validation messages, focus and a deterministic brief', async () => {
  const { ctx, page, errors } = await open();
  await page.click('#intakeToggle');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'iCompany');
  await page.fill('#iChecked', '');
  await page.click('#intakeSubmit');
  for (const f of ['iCompany', 'iUrl', 'iChecked', 'iFacts', 'iHyp']) {
    assert.equal(await page.getAttribute('#' + f, 'aria-invalid'), 'true', f);
    assert.ok((await text(page, '#' + f + '-err')).length > 0, f);
  }
  assert.equal(await page.evaluate(() => document.activeElement.id), 'iCompany', 'focus moves to first invalid field');
  assert.match(await text(page, '#intakeMsg'), /5 fields need a change/);
  await page.click('#intakeCancel');

  await addSignal(page, Object.assign({}, GOOD, { url: 'http://example.com/job' }));
  assert.match(await text(page, '#iUrl-err'), /https/);
  await page.fill('#iUrl', GOOD.url);
  await page.fill('#iFacts', 'Contact jane@example.com');
  await page.click('#intakeSubmit');
  assert.match(await text(page, '#iFacts-err'), /contact details/i);
  await page.fill('#iFacts', GOOD.facts);
  await page.click('#intakeSubmit');

  assert.equal(await page.isHidden('#intake'), true);
  assert.equal(await page.inputValue('#recordSel'), 'r-1');
  assert.equal(await text(page, '#acct-h'), GOOD.company);
  assert.equal(await page.locator('#paperLines li').count(), 2);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'paper-h');
  assert.equal(await page.isVisible('#editRecord'), true);
  assert.match(await text(page, '[data-bind="candKind"]'), /entered by you/);

  const draft = await page.inputValue('#draft');
  const expected = await page.evaluate(g => {
    const C = window.DeskCore;
    const v = C.validateIntake({ company: g.company, signalTitle: g.title, sourceUrl: g.url, checkedOn: '2026-10-01', facts: g.facts, hypothesis: g.hyp, unknowns: g.unk }, {}).value;
    return C.draftFor(C.newRecord('r-9', 'custom', v));
  }, GOOD);
  assert.equal(draft, expected, 'draft depends only on the entered fields');
  assert.match(draft, /^Hi,$/m);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('intake text is rendered as text, never markup', async () => {
  const { ctx, page } = await open();
  const payload = '<img src=x onerror="window.__xss=1">Acme';
  await addSignal(page, Object.assign({}, GOOD, { company: payload, facts: '<script>window.__xss=2</script>Hiring a finance lead' }));
  assert.equal(await text(page, '#acct-h'), payload);
  assert.equal(await page.locator('#acct-h img, #paperLines script, #evList script, .cand img').count(), 0);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  await ctx.close();
});

test('import: malformed and hostile files', async () => {
  const { ctx, page } = await open();
  await importText(page, '{not json');
  assert.match(await text(page, '#dataMsg'), /Import stopped\. Nothing changed\..*valid JSON/s);
  await importText(page, JSON.stringify({ schema: 'uk-launch-desk/v1', records: [{ id: 'r-1', kind: 'custom', company: 'X', sourceUrl: 'http://x.com', checkedOn: '2026-01-01', facts: ['f'], hypothesis: 'h' }] }));
  assert.match(await text(page, '#dataMsg'), /https/);
  assert.equal(await page.locator('#recordSel option').count(), 1, 'state unchanged after a rejected import');

  const payload = '<img src=x onerror="window.__xss=1">';
  const hostile = {
    schema: 'uk-launch-desk/v1',
    activeId: 'r-1',
    records: [
      { id: 'example-solve', kind: 'example', company: 'Hacked' },
      { id: 'r-1', kind: 'custom', company: payload + 'Co', signalTitle: payload, sourceUrl: 'https://example.org/post', checkedOn: '2026-10-01', facts: [payload + ' fact'], hypothesis: payload, unknowns: [payload], customerStatus: 'no', review: { crm: true, facts: true, claims: true, pii: true, nosend: true } }
    ],
    feedback: [{ theme: payload, for: 'Product', q: payload + '?', owner: 'UK sales lead', disp: 'New', origin: payload }]
  };
  await importText(page, JSON.stringify(hostile));
  assert.match(await text(page, '#dataMsg'), /Imported 2 records and 1 feedback item/);
  assert.equal(await text(page, '#acct-h'), payload + 'Co');
  assert.equal(await text(page, '#fbCards h3'), payload);
  assert.equal(await page.locator('main img:not([src^="art-"]), #fbCards img, #paperLines img').count(), 0);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('[data-rev]:checked').count(), 0, 'imported review ticks are ignored');
  await page.selectOption('#recordSel', 'example-solve');
  assert.equal(await text(page, '#acct-h'), 'Solve Intelligence', 'example content cannot be replaced by import');
  await ctx.close();
});

test('persistence: survives reload; clear resets after confirmation', async () => {
  const { ctx, page } = await open();
  await page.check('input[name="crm"][value="no"]');
  await page.check('[data-rev="facts"]');
  await page.click('#addToggle');
  await page.fill('#fTheme', 'Persisted theme');
  await page.fill('#fQ', 'Does this survive a reload?');
  await page.click('#addform button[type="submit"]');
  await page.reload();
  assert.equal(await page.isChecked('input[name="crm"][value="no"]'), true);
  assert.equal(await page.isChecked('[data-rev="facts"]'), true);
  assert.equal(await page.locator('#fbCards .fb').count(), 5);
  assert.match(await text(page, '#storeNote'), /local storage on this device/);

  page.__dialog = 'dismiss';
  await page.click('#clearBtn');
  assert.equal(await page.locator('#fbCards .fb').count(), 5, 'dismissed confirm keeps data');
  page.__dialog = 'accept';
  await page.click('#clearBtn');
  assert.equal(await page.locator('#fbCards .fb').count(), 4);
  assert.equal(await page.locator('input[name="crm"]:checked').count(), 0);
  assert.match(await text(page, '#dataMsg'), /Cleared/);
  assert.equal(await page.evaluate(() => localStorage.getItem('uk-launch-desk:v1')), null);
  await page.reload();
  assert.equal(await page.locator('#fbCards .fb').count(), 4);
  await ctx.close();
});

test('backup download round-trips through import', async () => {
  const { ctx, page } = await open();
  await addSignal(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#backupBtn')]);
  const body = fs.readFileSync(await dl.path(), 'utf8');
  const data = JSON.parse(body);
  assert.equal(data.schema, 'uk-launch-desk/v1');
  assert.equal(data.records.length, 2);
  assert.equal(data.records[1].review, undefined, 'backup carries no review ticks');
  page.__dialog = 'accept';
  await page.click('#clearBtn');
  await importText(page, body);
  assert.equal(await page.locator('#recordSel option').count(), 2);
  await ctx.close();
});

test('review invalidation after draft, status and fact changes', async () => {
  const { ctx, page } = await open();
  await page.check('input[name="crm"][value="no"]');
  await tickAll(page);
  assert.equal(await page.isEnabled('#copyBtn'), true);
  await page.click('#t-draft');
  await page.focus('#draft');
  await page.keyboard.press('End');
  await page.keyboard.type(' Thanks.');
  assert.equal(await page.locator('[data-rev]:checked').count(), 0);
  assert.match(await text(page, '#stopnote'), /Checks reset because the draft changed/);
  assert.equal(await page.isDisabled('#copyBtn'), true);

  await tickAll(page);
  await page.check('input[name="crm"][value="unsure"]');
  await page.check('input[name="crm"][value="no"]');
  assert.equal(await page.locator('[data-rev]:checked').count(), 0, 'status change resets review');

  await addSignal(page);
  await page.check('input[name="crm"][value="no"]');
  await tickAll(page);
  await page.click('#editRecord');
  await page.fill('#iFacts', 'A newly observed fact');
  await page.click('#intakeSubmit');
  assert.equal(await page.locator('[data-rev]:checked').count(), 0, 'fact change resets review');
  assert.match(await text(page, '#stopnote'), /facts changed/);
  assert.match(await page.inputValue('#draft'), /A newly observed fact/);
  await ctx.close();
});

test('manual CRM gate: unknown and existing customer always lock copy and export', async () => {
  const { ctx, page } = await open({ permissions: ['clipboard-read', 'clipboard-write'] });
  for (const k of ['facts', 'claims', 'pii', 'nosend']) await page.check('[data-rev="' + k + '"]');
  assert.equal(await page.isDisabled('#rev-crm'), true);
  assert.equal(await page.isDisabled('#copyBtn'), true);
  assert.equal(await page.isDisabled('#exportBtn'), true);
  assert.match(await text(page, '#stopnote'), /Locked until customer status is recorded/);

  await page.check('input[name="crm"][value="yes"]');
  for (const k of ['facts', 'claims', 'pii', 'nosend']) await page.check('[data-rev="' + k + '"]');
  assert.equal(await page.isDisabled('#rev-crm'), true);
  assert.equal(await page.isChecked('#rev-crm'), false);
  assert.equal(await page.isDisabled('#copyBtn'), true);
  assert.match(await text(page, '#stopnote'), /Locked: existing customer/);
  assert.match(await text(page, '[data-bind="nextTitle"]'), /existing customer/);

  await page.check('input[name="crm"][value="unsure"]');
  assert.equal(await page.isDisabled('#exportBtn'), true);

  await page.check('input[name="crm"][value="no"]');
  await tickAll(page);
  assert.equal(await page.isEnabled('#copyBtn'), true);
  await page.click('#copyBtn');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.inputValue('#draft'));
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#exportBtn')]);
  assert.equal(dl.suggestedFilename(), 'solve-intelligence-brief-reviewed.txt');
  const brief = fs.readFileSync(await dl.path(), 'utf8');
  assert.match(brief, /^UK LAUNCH DESK: ACCOUNT BRIEF \(reviewed, not sent\)/);
  assert.match(brief, /No live CRM check is evidenced by this export/);

  await page.click('#t-draft');
  await page.focus('#draft');
  await page.keyboard.press('End');
  await page.keyboard.type(' Also for your Munich office.');
  await tickAll(page);
  assert.equal(await page.isDisabled('#copyBtn'), true, 'keyword flag holds release');
  assert.match(await text(page, '#stopnote'), /Hold: 1 keyword check/);
  await ctx.close();
});

test('draft editing, role switch, rebuild and question limit', async () => {
  const { ctx, page } = await open();
  await page.click('#t-draft');
  const original = await page.inputValue('#draft');
  await page.fill('#draft', original + '\nP.S. edited');
  assert.match(await text(page, '#draftState'), /Edited by you/);
  await page.check('input[name="role"][value="finance"]');
  assert.match(await page.inputValue('#draft'), /P\.S\. edited/, 'role change does not overwrite edits');
  assert.match(await text(page, '#draftState'), /Role changed/);
  await page.click('#regen');
  assert.match(await page.inputValue('#draft'), /^Subject: Approvals and AP at Solve Intelligence/);

  await page.click('#t-qs');
  await page.check('#qs li:nth-child(3) .box');
  assert.equal(await page.locator('#qs .box:disabled').count(), 3, 'three chosen, the rest disabled');
  await page.click('#t-draft');
  assert.match(await page.inputValue('#draft'), /Which accounting system does the close run on/);
  await page.reload();
  assert.match(await page.inputValue('#draft'), /^Subject: Approvals and AP/, 'draft and role persist');
  await ctx.close();
});

test('feedback: filters, add, update decision, log unknowns and CSV export', async () => {
  const { ctx, page } = await open();
  await page.selectOption('#fbOwner', 'UK sales lead');
  assert.equal(await page.locator('#fbCards .fb').count(), 1);
  await page.selectOption('#fbFor', 'Product');
  assert.match(await text(page, '#fbCards'), /No items match/);
  await page.selectOption('#fbOwner', 'all');
  await page.selectOption('#fbFor', 'all');

  await page.click('#addToggle');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'fTheme');
  await page.click('#addform button[type="submit"]');
  assert.match(await text(page, '#formMsg'), /theme/i);
  await page.fill('#fTheme', 'Approval routing');
  await page.fill('#fQ', 'Who approves supplier bills above a threshold?');
  await page.selectOption('#fFor', 'Product');
  await page.click('#addform button[type="submit"]');
  assert.equal(await text(page, '#fbCards .fb h3'), 'Approval routing');
  assert.equal(await text(page, '#fbCards .fb .pill'), 'Your note');

  await page.selectOption('#fbCards .fb:nth-child(2) select', 'Closed');
  await page.reload();
  assert.equal(await page.inputValue('#fbCards .fb:nth-child(2) select'), 'Closed');

  for (let i = 0; i < 3; i++) await page.click('#logUnknown');
  assert.equal(await page.isDisabled('#logUnknown'), true);
  assert.equal(await page.locator('#fbCards .fb').count(), 8);

  await page.selectOption('#fbFor', 'Product');
  const shown = await page.locator('#fbCards .fb').count();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#fbExport')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8').trim().split('\r\n');
  assert.equal(csv[0], '"Theme","Question for","Question","Owner","Decision","Origin","Kind"');
  assert.equal(csv.length - 1, shown, 'CSV holds exactly the filtered items');
  await ctx.close();
});

test('keyboard: skip link, tab arrows and form focus', async () => {
  const { ctx, page } = await open();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
  assert.ok(await page.locator('.skip').evaluate(e => e.getBoundingClientRect().left >= 0), 'skip link visible on focus');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'main');

  await page.focus('#t-ev');
  const sel = () => page.evaluate(() => [document.activeElement.id, document.querySelector('[role=tab][aria-selected=true]').id, [...document.querySelectorAll('[role=tabpanel]')].filter(p => !p.hidden).map(p => p.id)]);
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await sel(), ['t-why', 't-why', ['p-why']]);
  await page.keyboard.press('End');
  assert.deepEqual(await sel(), ['t-draft', 't-draft', ['p-draft']]);
  await page.keyboard.press('ArrowRight');
  assert.deepEqual(await sel(), ['t-ev', 't-ev', ['p-ev']], 'wraps around');
  await page.keyboard.press('ArrowLeft');
  assert.deepEqual(await sel(), ['t-draft', 't-draft', ['p-draft']]);
  await page.keyboard.press('Home');
  assert.deepEqual(await sel(), ['t-ev', 't-ev', ['p-ev']]);
  assert.equal(await page.locator('[role=tab][tabindex="0"]').count(), 1, 'roving tabindex');

  await page.focus('#intakeToggle');
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'iCompany');
  assert.equal(await page.getAttribute('#intakeToggle', 'aria-expanded'), 'true');
  await ctx.close();
});

for (const width of [320, 390, 1440]) {
  test('no horizontal overflow at ' + width + 'px', async () => {
    const { ctx, page } = await open({ viewport: { width, height: 900 } });
    await page.click('#intakeToggle');
    await page.click('#addToggle');
    const states = ['#t-ev', '#t-why', '#t-qs', '#t-fit', '#t-draft'];
    for (const t of states) {
      await page.click(t);
      const r = await page.evaluate(() => {
        const W = document.documentElement.clientWidth;
        const over = [];
        document.querySelectorAll('body *').forEach(e => {
          if (e.closest('.sr, .skip, noscript') || !e.getClientRects().length) return;
          const b = e.getBoundingClientRect();
          if (b.width && b.right > W + 1) over.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + e.className) + ' ' + Math.round(b.right));
        });
        return { scroll: document.documentElement.scrollWidth, W, over: over.slice(0, 5) };
      });
      assert.ok(r.scroll <= r.W, t + ' page scroll ' + r.scroll + ' > ' + r.W);
      assert.deepEqual(r.over, [], t + ' elements past the right edge');
    }
    await ctx.close();
  });
}

test('storage blocked: the desk still works and says changes last only for the tab', async () => {
  const ctx = await browser.newContext();
  ctx.setDefaultTimeout(5000);
  await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url);
  await page.check('input[name="crm"][value="no"]');
  assert.match(await text(page, '#storeNote'), /isn’t allowing local storage/);
  assert.equal(await page.isChecked('input[name="crm"][value="no"]'), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});
