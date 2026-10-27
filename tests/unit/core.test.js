'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../app/desk-core.js');

const TODAY = '2026-10-27';
const GOOD = {
  company: 'Example Robotics Ltd',
  signalTitle: 'Company-posted job: Finance Manager',
  sourceUrl: 'https://example.com/careers/finance-manager',
  checkedOn: '2026-10-20',
  facts: 'First finance hire in London\nWill choose an expense tool this year',
  hypothesis: 'A first finance hire may be choosing spend tools soon.',
  unknowns: 'Whether the role is filled\nWhich accounting system they use'
};

/* ---------- intake validation ---------- */
test('intake: accepts a complete public signal and normalises it', () => {
  const r = C.validateIntake(GOOD, { today: TODAY });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.deepEqual(r.value.facts, ['First finance hire in London', 'Will choose an expense tool this year']);
  assert.deepEqual(r.value.unknowns, ['Whether the role is filled', 'Which accounting system they use']);
  assert.equal(r.value.sourceUrl, 'https://example.com/careers/finance-manager');
});

test('intake: requires company, source, date, at least one fact and a hypothesis', () => {
  const r = C.validateIntake({}, { today: TODAY });
  assert.equal(r.ok, false);
  for (const k of ['company', 'sourceUrl', 'checkedOn', 'facts', 'hypothesis']) assert.ok(r.errors[k], k);
  assert.equal(r.errors.unknowns, undefined, 'unknowns are optional');
});

test('intake: only public https links are accepted', () => {
  const cases = {
    'http://example.com/a': /https/,
    'javascript:alert(1)': /https/,
    'ftp://example.com/x': /https/,
    'https://user:pw@example.com/': /login/,
    'https://localhost/x': /local/,
    'https://intranet.corp/x': /local/,
    'https://192.168.1.10/x': /IP/,
    'https://[::1]/x': /IP/,
    'not a url': /full link/
  };
  for (const [u, re] of Object.entries(cases)) {
    const r = C.validateIntake(Object.assign({}, GOOD, { sourceUrl: u }), { today: TODAY });
    assert.equal(r.ok, false, u);
    assert.match(r.errors.sourceUrl, re, u);
  }
});

test('intake: rejects a duplicate source, future or malformed dates and over-long input', () => {
  assert.match(C.validateIntake(GOOD, { today: TODAY, existingUrls: ['https://example.com/careers/finance-manager'] }).errors.sourceUrl, /already/);
  assert.match(C.validateIntake(Object.assign({}, GOOD, { checkedOn: '2026-11-01' }), { today: TODAY }).errors.checkedOn, /future/);
  assert.match(C.validateIntake(Object.assign({}, GOOD, { checkedOn: '2026-02-30' }), { today: TODAY }).errors.checkedOn, /YYYY-MM-DD/);
  assert.match(C.validateIntake(Object.assign({}, GOOD, { company: 'x'.repeat(81) }), { today: TODAY }).errors.company, /80/);
  assert.match(C.validateIntake(Object.assign({}, GOOD, { facts: Array(11).fill('a fact').join('\n') }), { today: TODAY }).errors.facts, /ten/);
  assert.match(C.validateIntake(Object.assign({}, GOOD, { facts: 'ok\n' + 'y'.repeat(241) }), { today: TODAY }).errors.facts, /line 2/);
});

test('intake: rejects contact details and control characters', () => {
  assert.match(C.validateIntake(Object.assign({}, GOOD, { facts: 'Email jane@example.com for details' }), { today: TODAY }).errors.facts, /contact/);
  assert.match(C.validateIntake(Object.assign({}, GOOD, { hypothesis: 'Call +44 20 7946 0000' }), { today: TODAY }).errors.hypothesis, /contact/);
  assert.match(C.validateIntake(Object.assign({}, GOOD, { company: 'Bad\u0007Co' }), { today: TODAY }).errors.company, /control/);
});

/* ---------- deterministic brief and draft ---------- */
test('custom record: brief and draft are deterministic and role-only', () => {
  const v = C.validateIntake(GOOD, { today: TODAY }).value;
  const s1 = C.initialState(), s2 = C.initialState();
  const a = C.addCustomRecord(s1, v), b = C.addCustomRecord(s2, v);
  assert.equal(a.draft, b.draft);
  assert.deepEqual(C.contentOf(a), C.contentOf(b));
  assert.equal(C.plainBrief(a, 'fixed'), C.plainBrief(b, 'fixed'));
  assert.match(a.draft, /^Subject: Finance setup at Example Robotics Ltd/);
  assert.match(a.draft, /“First finance hire in London”/);
  assert.match(a.draft, /^Hi,$/m);
  assert.equal(C.runChecks(a.draft).flags, 0, 'benign input yields a draft with no keyword flags');
  a.role = 'finance';
  assert.match(C.draftFor(a), /^Subject: Approvals and AP at Example Robotics Ltd/);
  assert.doesNotMatch(C.draftFor(a), /\b(AI|artificial intelligence|scrap)/i);
});

test('example record: draft matches the approved Solve template', () => {
  const s = C.initialState();
  const ex = s.records[0];
  assert.equal(ex.kind, 'example');
  assert.match(ex.draft, /^Subject: Your first London finance hire/);
  assert.match(ex.draft, /– Now that finance has an owner/);
  assert.match(ex.draft, /– How are supplier invoices approved/);
  assert.equal(C.runChecks(ex.draft).flags, 0);
});

/* ---------- keyword checks ---------- */
test('keyword checks flag the illustrative risky phrases', () => {
  const flagged = t => C.runChecks(t).items.filter(i => i.flagged).map(i => i.label);
  assert.deepEqual(flagged('We file your VAT returns for you.'), ['No promise to file or reclaim VAT']);
  assert.deepEqual(flagged('Earn yield on deposits.'), ['No US banking or deposit language']);
  assert.deepEqual(flagged('Cut costs by 30%.'), ['No guarantees or savings figures']);
  assert.deepEqual(flagged('Works for your Munich office.'), ['No claim about European offices']);
  assert.deepEqual(flagged('Write to a@b.co'), ['No email address or phone number']);
  assert.deepEqual(flagged('Hi Sarah,'), ['Addressed by role, not by name']);
  assert.deepEqual(flagged('Hi there,'), []);
});

/* ---------- review gate and invalidation ---------- */
function tickAll(rec) { C.REVIEW_KEYS.forEach(k => C.setReview(rec, k, true)); }

test('gate: unknown, unsure and existing-customer status always lock copy/export', () => {
  const rec = C.initialState().records[0];
  for (const st of [null, 'unsure', 'yes']) {
    if (st !== null) C.setStatus(rec, st);
    tickAll(rec);
    assert.equal(rec.review.crm, false, 'CRM tick refused unless status is "not a customer"');
    assert.equal(C.canRelease(rec, 0), false, String(st));
  }
  C.setStatus(rec, 'no');
  tickAll(rec);
  assert.equal(C.canRelease(rec, 0), true);
  assert.equal(C.canRelease(rec, 1), false, 'keyword flags hold release');
});

test('gate: the status lock holds even if every tick is forced on', () => {
  const rec = C.initialState().records[0];
  for (const st of [null, 'unsure', 'yes']) {
    rec.customerStatus = st;
    C.REVIEW_KEYS.forEach(k => { rec.review[k] = true; });
    assert.equal(C.canRelease(rec, 0), false, String(st));
  }
});

test('invalidation: draft, status and fact changes reset every review tick', () => {
  const s = C.initialState();
  const rec = s.records[0];
  C.setStatus(rec, 'no'); tickAll(rec); rec.exported = true;
  let r = C.setDraft(rec, rec.draft + ' edited', true);
  assert.deepEqual([r.changed, r.cleared, C.reviewCount(rec), rec.exported], [true, true, 0, false]);

  tickAll(rec);
  r = C.setDraft(rec, rec.draft, true);
  assert.equal(r.changed, false); assert.equal(C.reviewCount(rec), 5, 'unchanged text keeps ticks');

  r = C.setStatus(rec, 'unsure');
  assert.equal(r.cleared, true); assert.equal(C.reviewCount(rec), 0);

  const v = C.validateIntake(GOOD, { today: TODAY }).value;
  const cr = C.addCustomRecord(s, v);
  C.setStatus(cr, 'no'); tickAll(cr);
  r = C.updateCustomRecord(cr, Object.assign({}, v, { facts: ['A different fact'] }));
  assert.equal(r.cleared, true); assert.equal(C.reviewCount(cr), 0);
  assert.match(cr.draft, /A different fact/, 'unedited draft follows the facts');
  assert.equal(C.updateCustomRecord(cr, Object.assign({}, v, { facts: ['A different fact'] })).changed, false);
});

test('next action follows the manual CRM gate', () => {
  const rec = C.initialState().records[0];
  assert.match(C.nextAction(rec, false, 0).title, /Check Solve Intelligence in the CRM/);
  C.setStatus(rec, 'yes');
  assert.match(C.nextAction(rec, false, 0).title, /existing customer/);
  C.setStatus(rec, 'no');
  assert.match(C.nextAction(rec, false, 0).title, /Review the brief/);
});

/* ---------- import and storage ---------- */
function backupWithCustom() {
  const s = C.initialState();
  C.addCustomRecord(s, C.validateIntake(GOOD, { today: TODAY }).value);
  return s;
}

test('import: a backup round-trips and drops review ticks', () => {
  const s = backupWithCustom();
  const rec = s.records[1];
  C.setStatus(rec, 'no'); tickAll(rec);
  const json = JSON.stringify(C.serializeForBackup(s, '2026-10-27T10:00:00Z'));
  const r = C.validateImport(json, { today: TODAY });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.state.records.length, 2);
  assert.equal(r.state.records[1].customerStatus, 'no');
  assert.equal(C.reviewCount(r.state.records[1]), 0);
  assert.equal(r.state.nextRecNo, 2);
  assert.equal(r.state.feedback.length, 4);
});

test('storage: ticks persist only through the storage path', () => {
  const s = backupWithCustom();
  const rec = s.records[1]; C.setStatus(rec, 'no'); tickAll(rec);
  const r = C.validateImport(JSON.stringify(C.serializeForStorage(s)), { today: TODAY, allowReview: true });
  assert.equal(C.reviewCount(r.state.records[1]), 5);
});

test('import: malformed files are rejected with readable reasons', () => {
  const bad = [
    ['{not json', /valid JSON/],
    ['[]', /desk backup/],
    [JSON.stringify({ schema: 'other' }), /schema/],
    [JSON.stringify({ schema: C.SCHEMA }), /list of records/],
    [JSON.stringify({ schema: C.SCHEMA, records: [{ id: 'r-1', kind: 'custom', company: 'X', sourceUrl: 'http://x.com', checkedOn: '2026-01-01', facts: ['f'], hypothesis: 'h' }] }), /https/],
    [JSON.stringify({ schema: C.SCHEMA, records: [{ id: 'BAD ID', kind: 'custom' }] }), /id must/],
    [JSON.stringify({ schema: C.SCHEMA, records: [{ id: 'example-solve', kind: 'example', customerStatus: 'maybe' }] }), /customerStatus/],
    [JSON.stringify({ schema: C.SCHEMA, records: [], feedback: [{ theme: 't', for: 'Sales', q: 'q?', owner: 'UK sales lead', disp: 'New' }] }), /product, positioning or targeting/],
    [JSON.stringify({ schema: C.SCHEMA, records: [], feedback: [{ theme: 't', for: 'Product', q: 'q?', owner: 'Someone', disp: 'New' }] }), /owner/],
    ['x'.repeat(C.LIMITS.fileBytes + 1), /512 KB/]
  ];
  for (const [input, re] of bad) {
    const r = C.validateImport(input, { today: TODAY });
    assert.equal(r.ok, false, input.slice(0, 60));
    assert.match(r.errors.join(' '), re, input.slice(0, 60));
  }
});

test('import: example content cannot be overwritten and markup stays as plain data', () => {
  const payload = '<img src=x onerror="window.__xss=1">';
  const data = {
    schema: C.SCHEMA,
    records: [{ id: 'example-solve', kind: 'example', company: 'Hacked', evidence: ['fake'] }],
    feedback: [{ theme: payload, for: 'Product', q: payload, owner: 'UK sales lead', disp: 'New', origin: payload }]
  };
  const r = C.validateImport(JSON.stringify(data), { today: TODAY });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(C.contentOf(r.state.records[0]).company, 'Solve Intelligence');
  assert.equal(r.state.feedback[0].theme, payload, 'kept verbatim as text; the UI renders it with textContent');
});

test('import: an unedited draft is rebuilt rather than trusted from the file', () => {
  const data = { schema: C.SCHEMA, records: [{ id: 'example-solve', kind: 'example', draft: 'We file your VAT returns', draftEdited: false }] };
  const r = C.validateImport(JSON.stringify(data), { today: TODAY });
  assert.match(r.state.records[0].draft, /^Subject: Your first London finance hire/);
});

/* ---------- feedback ---------- */
test('feedback: filters, logged unknowns and validation', () => {
  const s = C.initialState();
  assert.equal(C.filterFeedback(s.feedback, 'all', 'Positioning').length, 2);
  assert.equal(C.filterFeedback(s.feedback, 'UK sales lead', 'all').length, 1);
  assert.equal(C.filterFeedback(s.feedback, 'UK sales lead', 'Product').length, 0);
  const ex = s.records[0];
  for (let i = 0; i < 3; i++) assert.ok(C.logUnknown(s, ex));
  assert.equal(C.logUnknown(s, ex), null);
  assert.equal(s.feedback.length, 7);
  assert.equal(s.fbTouched, true);
  assert.equal(C.validateFeedbackItem({ theme: '', for: 'Product', q: 'q', owner: 'UK sales lead', disp: 'New' }).ok, false);
});

test('feedback CSV: quotes cells and neutralises spreadsheet formulas', () => {
  const csv = C.feedbackCsv([{ theme: '=HYPERLINK("x")', for: 'Product', q: 'Say "hi", ok?', owner: 'UK sales lead', disp: 'New', origin: '', sample: false }]);
  const lines = csv.trim().split('\r\n');
  assert.equal(lines[0], '"Theme","Question for","Question","Owner","Decision","Origin","Kind"');
  assert.equal(lines[1], '"\'=HYPERLINK(""x"")","Product","Say ""hi"", ok?","UK sales lead","New","","Added by you"');
});
