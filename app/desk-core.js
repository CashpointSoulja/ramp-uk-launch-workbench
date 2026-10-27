/* UK launch desk: pure logic. No DOM, no network, no randomness.
   Loaded as a classic script in the browser (window.DeskCore) and as a CommonJS module in tests. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.DeskCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SCHEMA = 'uk-launch-desk/v1';
  const STORAGE_KEY = 'uk-launch-desk:v1';
  const EXAMPLE_ID = 'example-solve';

  const OWNERS = ['International product lead', 'Product marketing, UK', 'Growth and targeting', 'UK sales lead', 'Finance partnerships'];
  const FOR_OPTS = ['Product', 'Positioning', 'Targeting'];
  const DISPS = ['New', 'Needs an answer', 'Draft new wording', 'Test on next batch', 'Parked', 'Closed'];
  const STATUSES = ['no', 'yes', 'unsure'];
  const ROLES = ['founder', 'finance'];
  const REVIEW_KEYS = ['crm', 'facts', 'claims', 'pii', 'nosend'];

  const LIMITS = {
    company: 80, signalTitle: 100, url: 500, fact: 240, facts: 10, hypothesis: 400,
    unknown: 200, unknowns: 8, draft: 6000, theme: 80, question: 280, origin: 120,
    records: 50, feedback: 200, fileBytes: 512 * 1024, maxQuestions: 3
  };

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

  /* ---------- researched example (public sources checked 27 Oct 2026) ---------- */
  const EXAMPLE_QUESTIONS = [
    { t: 'Now that finance has an owner, which part of the stack gets decided first: approvals, AP or spend?', w: 'Tests the timing hypothesis directly.' },
    { t: 'How are supplier invoices approved and paid today, and who signs off?', w: 'The posting puts AP and approval workflows with the new hire.' },
    { t: 'Which accounting system does the close run on, and how do your external accountants work in it?', w: 'Confirms whether a supported integration applies.' },
    { t: 'Do the New York and Munich offices spend through their own entities, or does everything run through the UK for now?', w: 'Eligibility for non-UK entities is unknown; this finds out what matters.' },
    { t: 'How do you want VAT on card and supplier spend captured before it reaches the books?', w: 'Opens VAT capture and coding without promising filing or reclaim.' },
    { t: 'What would the first finance hire want working on their first day?', w: 'Keeps the conversation useful whether or not the role is filled.' }
  ];

  const EXAMPLE = Object.freeze({
    company: 'Solve Intelligence',
    signalTitle: 'Company-posted job: Financial Operations Lead',
    sourceUrl: 'https://www.ycombinator.com/companies/solve-intelligence/jobs/ajtyl6e-financial-operations-lead',
    sourceHost: 'ycombinator.com',
    checkedOn: '2026-10-27',
    candKind: 'Researched example',
    candSummary: 'Hiring its first dedicated finance lead in London to build approvals, procurement, spend and AP from scratch.',
    paperKind: 'Company-posted job',
    paperTitle: 'Financial Operations Lead',
    paperMeta: 'Solve Intelligence, London',
    paperLines: [
      'First dedicated finance hire, based in London, working with the founders',
      'Designs the finance stack from scratch: approvals, procurement, spend management and billing',
      'Owns supplier payments end to end, including approval workflows',
      'Runs the monthly close with external accountants',
      'Three offices: London, New York and Munich',
      'Multi-entity experience listed as a nice-to-have'
    ],
    paperFoot: 'Paraphrased from the posting',
    evIntro: 'Everything below comes from one company-posted page, paraphrased. Nothing here is from a conversation.',
    evidence: [
      'First dedicated finance hire, based in London and working directly with the founders',
      'Finance hasn’t been run by any single person until now',
      'Will design the finance stack from scratch, naming approvals, procurement, spend management and billing',
      'Owns AP end to end: approval workflows, paying invoices on time, catching duplicates',
      'Runs external accountants to a monthly close',
      'Offices in London, New York and Munich; owns international finance across three countries',
      'Company says it is quadrupling headcount this year'
    ],
    evSourceText: 'Financial Operations Lead, Solve Intelligence, on ycombinator.com',
    signalHypothesis: 'The timing may suit a conversation about approvals, AP and connected accounting, while the stack is still being chosen.',
    hypothesis: 'A first finance hire told to build approvals, procurement and AP from scratch is likely choosing tools in the next few months. That makes it a reasonable time to discuss approvals, AP and connected accounting.',
    restsOn: [
      'The posting names approvals, procurement, spend management and AP as theirs to build',
      'It says the stack is being built from scratch'
    ],
    wrong: [
      'They’re already a Ramp customer. Check the CRM first.',
      'The role is filled and tools are already chosen',
      'Their spend sits mainly in a US or German entity Ramp UK can’t serve'
    ],
    stillUnknown: [
      'Customer status. A CRM check is required.',
      'Whether the role has been filled',
      'Which tools are already in place',
      'Whether Munich or New York run separate entities, and if a European office is eligible'
    ],
    chips: ['London, New York, Munich', 'AI for patent and IP teams'],
    questions: EXAMPLE_QUESTIONS,
    flow: {
      n1: 'Company-posted job for a first finance hire in London',
      n2: 'Six lines taken from the source, nothing added',
      n3: 'Approvals, AP and connected accounting'
    },
    roleFinanceLabel: 'Finance lead, once in seat',
    exportHeader: 'Company: Solve Intelligence. Offices: London, New York, Munich.',
    unknownPool: [
      { theme: 'Role status', for: 'Targeting', q: 'How should the desk tell whether a posted finance role is still open before a brief goes to review?', owner: 'Growth and targeting' },
      { theme: 'Existing tools', for: 'Product', q: 'What public signs would show which spend or AP tools a UK company already uses?', owner: 'International product lead' },
      { theme: 'CRM access', for: 'Product', q: 'Could the desk read customer status directly, so the manual CRM step isn’t needed?', owner: 'International product lead' }
    ],
    careful: [
      { t: 'Ramp captures and codes VAT. It doesn’t file VAT returns or reclaim VAT.' },
      { t: 'Don’t reuse US banking or deposit language. It doesn’t apply to the UK offer.' },
      { t: 'Whether a Munich or other European office is eligible is unknown. Don’t imply it is.', kind: 'unknown' },
      { t: 'Multi-entity and multi-currency are Plus features. Don’t present them as Free.' },
      { t: 'No savings figures or customer results in first outreach.' }
    ]
  });

  const UK_FIT = Object.freeze([
    { t: 'Corporate cards, with controls set before anyone spends', u: 'https://ramp.com/en-gb/corporate-cards' },
    { t: 'Expense management with receipt collection, including through Slack and WhatsApp', u: 'https://ramp.com/en-gb/pricing' },
    { t: 'Bills routed for approval, with eligible UK supplier payments made from Ramp', u: 'https://ramp.com/blog/uk-launch' },
    { t: 'Transactions and bills synced to accounting with VAT and memos included; Xero and QuickBooks Online on Free, NetSuite, Sage Intacct and more on Plus', u: 'https://ramp.com/en-gb/pricing' },
    { t: 'Multi-entity and multi-currency operations, including USD and EUR, on Ramp Plus', u: 'https://ramp.com/en-gb/pricing' }
  ]);

  const CUSTOM_CAREFUL = Object.freeze([
    { t: 'Ramp captures and codes VAT. It doesn’t file VAT returns or reclaim VAT.' },
    { t: 'Don’t reuse US banking or deposit language. It doesn’t apply to the UK offer.' },
    { t: 'Whether an office or entity outside the UK is eligible is unknown. Don’t imply it is.', kind: 'unknown' },
    { t: 'Multi-entity and multi-currency are Plus features. Don’t present them as Free.' },
    { t: 'No savings figures or customer results in first outreach.' }
  ]);

  const SEED_FEEDBACK = Object.freeze([
    { theme: 'European offices', for: 'Product', q: 'When a UK company also runs an office in Germany, which of its entities can use Ramp UK today?', owner: OWNERS[0], disp: 'Needs an answer', origin: 'From the Solve Intelligence brief', sample: true },
    { theme: 'VAT expectations', for: 'Positioning', q: 'How should UK pages separate capturing and coding VAT from filing returns or reclaiming VAT?', owner: OWNERS[1], disp: 'Draft new wording', origin: '', sample: true },
    { theme: 'First finance hire as a signal', for: 'Targeting', q: 'Should a company-posted first finance hire become a standing trigger, and how long does that window stay useful?', owner: OWNERS[2], disp: 'Test on next batch', origin: '', sample: true },
    { theme: 'Three-country teams', for: 'Positioning', q: 'When a prospect has UK, US and EU offices, at what point does the Plus conversation start?', owner: OWNERS[3], disp: 'Parked', origin: '', sample: true }
  ]);

  /* ---------- small helpers ---------- */
  const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
  const EMAIL = /[^\s@<>()"]+@[^\s@<>()"]+\.[^\s@<>()"]+/;
  const PHONE = /\+?\d[\d ]{8,}\d/;
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const clone = v => JSON.parse(JSON.stringify(v));

  function truncate(s, n) { return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; }
  function fmtDate(iso) { const [y, m, d] = iso.split('-').map(Number); return d + ' ' + MONTHS[m - 1] + ' ' + y; }
  function hostOf(href) { try { return new URL(href).hostname.replace(/^www\./, ''); } catch (e) { return ''; } }
  function slug(s) { return String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'company'; }
  function linesWord(n) { return n === 1 ? 'One line' : (NUMBER_WORDS[n] || String(n)) + ' lines'; }
  function stripEnd(s) { return s.replace(/[\s.!?;:,]+$/, ''); }

  function toLines(v) {
    if (Array.isArray(v)) return v.every(x => typeof x === 'string') ? v.map(x => x.trim()).filter(Boolean) : null;
    if (v === undefined || v === null) return [];
    if (typeof v !== 'string') return null;
    return v.replace(/\r\n?/g, '\n').split('\n').map(x => x.trim()).filter(Boolean);
  }

  function isIsoDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

  function checkUrl(input) {
    const s = typeof input === 'string' ? input.trim() : '';
    if (!s) return { error: 'Add the public page this came from.' };
    if (s.length > LIMITS.url) return { error: 'Keep the link under 500 characters.' };
    let url;
    try { url = new URL(s); } catch (e) { return { error: 'Enter a full link starting with https://' }; }
    if (url.protocol !== 'https:') return { error: 'Use a public https:// link.' };
    if (url.username || url.password) return { error: 'Remove the login details from the link.' };
    const h = url.hostname.toLowerCase();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.startsWith('[')) return { error: 'Use the website’s name rather than an IP address.' };
    if (!h.includes('.') || /(^|\.)(localhost|local|internal|lan|home|corp|intranet)$/.test(h)) return { error: 'Use a public website, not a local or internal address.' };
    return { value: url.href };
  }

  function contactIn(s) { return EMAIL.test(s) || PHONE.test(s); }

  /* ---------- intake validation ---------- */
  const INTAKE_FIELDS = ['company', 'signalTitle', 'sourceUrl', 'checkedOn', 'facts', 'hypothesis', 'unknowns'];

  function validateIntake(raw, opts) {
    opts = opts || {};
    const errors = {};
    const r = isObj(raw) ? raw : {};
    const str = k => (typeof r[k] === 'string' ? r[k] : (r[k] === undefined || r[k] === null ? '' : null));

    const company = str('company');
    if (company === null) errors.company = 'Company must be text.';
    else if (!company.trim()) errors.company = 'Add the company name.';
    else if (company.trim().length > LIMITS.company) errors.company = 'Keep the company name under 80 characters.';
    else if (/\n/.test(company.trim())) errors.company = 'Keep the company name on one line.';

    const signalTitle = str('signalTitle');
    if (signalTitle === null) errors.signalTitle = 'The source description must be text.';
    else if (signalTitle.trim().length > LIMITS.signalTitle) errors.signalTitle = 'Keep this under 100 characters.';

    const url = checkUrl(str('sourceUrl') || '');
    if (url.error) errors.sourceUrl = url.error;
    else if ((opts.existingUrls || []).includes(url.value)) errors.sourceUrl = 'This source is already on the desk.';

    const checkedOn = (str('checkedOn') || '').trim();
    if (!checkedOn) errors.checkedOn = 'Add the date you checked the source.';
    else if (!isIsoDate(checkedOn)) errors.checkedOn = 'Use the format YYYY-MM-DD, for example 2026-10-27.';
    else if (checkedOn < '2000-01-01') errors.checkedOn = 'Use a date from 2000 onwards.';
    else if (opts.today && checkedOn > opts.today) errors.checkedOn = 'The check date can’t be in the future.';

    const facts = toLines(r.facts);
    if (facts === null) errors.facts = 'Facts must be text.';
    else if (!facts.length) errors.facts = 'Add at least one fact the source states, one per line.';
    else if (facts.length > LIMITS.facts) errors.facts = 'Keep it to ten facts or fewer.';
    else {
      const long = facts.findIndex(f => f.length > LIMITS.fact);
      if (long >= 0) errors.facts = 'Keep each fact under 240 characters (line ' + (long + 1) + ' is longer).';
    }

    const hypothesis = str('hypothesis');
    if (hypothesis === null) errors.hypothesis = 'The hypothesis must be text.';
    else if (!hypothesis.trim()) errors.hypothesis = 'Write the hypothesis: your reading of the source, not a fact.';
    else if (hypothesis.trim().length > LIMITS.hypothesis) errors.hypothesis = 'Keep the hypothesis under 400 characters.';

    const unknowns = toLines(r.unknowns);
    if (unknowns === null) errors.unknowns = 'Unknowns must be text.';
    else if (unknowns.length > LIMITS.unknowns) errors.unknowns = 'Keep it to eight unknowns or fewer.';
    else {
      const long = unknowns.findIndex(u => u.length > LIMITS.unknown);
      if (long >= 0) errors.unknowns = 'Keep each unknown under 200 characters (line ' + (long + 1) + ' is longer).';
    }

    const textFields = {
      company: company, signalTitle: signalTitle, hypothesis: hypothesis,
      facts: facts ? facts.join('\n') : '', unknowns: unknowns ? unknowns.join('\n') : ''
    };
    Object.keys(textFields).forEach(k => {
      const v = textFields[k];
      if (errors[k] || typeof v !== 'string') return;
      if (CTRL.test(v)) errors[k] = 'Remove unusual control characters.';
      else if (contactIn(v)) errors[k] = 'Remove contact details. The desk works at company level.';
    });

    const ok = Object.keys(errors).length === 0;
    return {
      ok, errors,
      value: ok ? {
        company: company.trim(),
        signalTitle: signalTitle.trim(),
        sourceUrl: url.value,
        checkedOn,
        facts,
        hypothesis: hypothesis.trim(),
        unknowns
      } : null
    };
  }

  /* ---------- deterministic content for a custom record ---------- */
  function customQuestions(company) {
    return [
      { t: 'Which part of the finance stack does ' + company + ' want to settle first: approvals, AP or spend?', w: 'Tests the timing hypothesis directly.' },
      { t: 'How are supplier invoices approved and paid today, and who signs off?', w: 'Checks whether approvals and AP are a live problem.' },
      { t: 'Which accounting system does the month-end close run on?', w: 'Confirms whether a supported integration applies.' },
      { t: 'Does all spend run through a UK entity, or do other entities need to be covered?', w: 'Eligibility outside the UK is unknown; this finds out what matters.' },
      { t: 'How do you want VAT on card and supplier spend captured before it reaches the books?', w: 'Opens VAT capture and coding without promising filing or reclaim.' },
      { t: 'What would make the next three months of finance work easier?', w: 'Keeps the conversation useful if the hypothesis is wrong.' }
    ];
  }

  function customContent(r) {
    const host = hostOf(r.sourceUrl);
    const title = r.signalTitle || 'Public signal';
    return {
      company: r.company,
      signalTitle: title,
      sourceUrl: r.sourceUrl,
      sourceHost: host,
      checkedOn: r.checkedOn,
      candKind: 'Research candidate, entered by you',
      candSummary: r.facts[0],
      paperKind: 'Public source',
      paperTitle: title,
      paperMeta: r.company + ', ' + host,
      paperLines: r.facts.slice(),
      paperFoot: 'Entered from the source by you',
      evIntro: 'Everything below was entered from one public page. Nothing here is from a conversation.',
      evidence: r.facts.slice(),
      evSourceText: title + ', ' + r.company + ', on ' + host,
      signalHypothesis: r.hypothesis,
      hypothesis: r.hypothesis,
      restsOn: r.facts.slice(0, 3),
      wrong: ['They’re already a Ramp customer. Check the CRM first.', 'The source is out of date, or the need it describes has already been met'],
      stillUnknown: ['Customer status. A CRM check is required.'].concat(r.unknowns),
      chips: [host],
      questions: customQuestions(r.company),
      flow: { n1: title + ' on ' + host, n2: linesWord(r.facts.length) + ' entered from the source, nothing added', n3: truncate(r.hypothesis, 70) },
      roleFinanceLabel: 'Finance lead',
      exportHeader: 'Company: ' + r.company + '.',
      unknownPool: r.unknowns.map(u => ({
        theme: truncate('Unknown at ' + r.company, LIMITS.theme),
        for: 'Targeting',
        q: truncate('How could we confirm this before any outreach: “' + stripEnd(u) + '”?', LIMITS.question),
        owner: 'Growth and targeting'
      })),
      careful: CUSTOM_CAREFUL
    };
  }

  function contentOf(rec) { return rec.kind === 'example' ? EXAMPLE : customContent(rec); }

  /* ---------- drafts ---------- */
  function questionBlock(content, qsel) {
    const qs = qsel.slice().sort((a, b) => a - b).filter(i => content.questions[i]).map(i => '– ' + content.questions[i].t);
    return qs.length ? qs.join('\n') : '– [Choose a question in the Questions tab]';
  }

  function draftText(kind, content, role, qsel) {
    const qblock = questionBlock(content, qsel);
    if (kind === 'example') {
      if (role === 'founder') {
        return `Subject: Your first London finance hire

Hi,

I saw Solve Intelligence is hiring its first dedicated finance lead in London, with a brief to build approvals, procurement, spend and AP from scratch.

Teams at that point often decide early how card spend, supplier bills and approvals will reach the books. Ramp is now live in the UK, with corporate cards, expense management, bill approvals and payments, and accounting sync that carries VAT through to supported systems such as Xero and QuickBooks Online.

A couple of questions that might be useful before the new hire starts:
${qblock}

Happy to walk you through how this works in Ramp, or to wait until your finance lead is in seat.

[Sender], Ramp`;
      }
      return `Subject: Approvals and AP at Solve Intelligence

Hi,

The Solve Intelligence finance role describes building approvals, procurement, spend and AP from scratch, so I’ll keep this short.

Ramp is now live in the UK: corporate cards with controls set before anyone spends, receipts collected through Slack or WhatsApp, bills routed for approval and paid from Ramp, and transactions synced to your accounting system with VAT included.

A few questions worth answering early:
${qblock}

If it helps, I can send a short walkthrough of the approval and AP flow.

[Sender], Ramp`;
    }
    const c = content.company;
    const f1 = stripEnd(content.evidence[0] || '');
    if (role === 'founder') {
      return `Subject: Finance setup at ${c}

Hi,

I saw a public update from ${c}: “${f1}”.

Teams at that point often decide early how card spend, supplier bills and approvals will reach the books. Ramp is now live in the UK, with corporate cards, expense management, bill approvals and payments, and accounting sync that carries VAT through to supported systems such as Xero and QuickBooks Online.

A couple of questions that might be useful:
${qblock}

Happy to walk you through how this works in Ramp, or to wait until the timing suits you better.

[Sender], Ramp`;
    }
    return `Subject: Approvals and AP at ${c}

Hi,

A public update from ${c} caught my eye: “${f1}”. I’ll keep this short.

Ramp is now live in the UK: corporate cards with controls set before anyone spends, receipts collected through Slack or WhatsApp, bills routed for approval and paid from Ramp, and transactions synced to your accounting system with VAT included.

A few questions worth answering early:
${qblock}

If it helps, I can send a short walkthrough of the approval and AP flow.

[Sender], Ramp`;
  }

  function draftFor(rec) { return draftText(rec.kind, contentOf(rec), rec.role, rec.qsel); }

  /* ---------- illustrative keyword checks (not a compliance review) ---------- */
  const CHECKS = [
    { label: 'No promise to file or reclaim VAT', re: /\b(fil(e|es|ed|ing)|reclaim\w*|refund\w*|recover\w*)\b[^.\n]{0,40}\bVAT\b|\bVAT\b[^.\n]{0,40}\b(returns?|reclaim\w*|refund\w*|filing)\b/i },
    { label: 'No US banking or deposit language', re: /\b(FDIC|checking account|deposits?|treasury|yield|APY|bank account)\b/i },
    { label: 'No guarantees or savings figures', re: /\b(guarantee\w*|promise\w*)\b|\d+(\.\d+)?\s?%|\bsav(e|es|ing|ings)\s+(you\s+)?[£$€]/i },
    { label: 'No claim about European offices', re: /\b(Munich|Germany|German|Europe|European|EU|EEA)\b/i, note: 'Eligibility is unknown, so a person needs to check this line.' },
    { label: 'No email address or phone number', re: /[^\s@]+@[^\s@]+\.[^\s@]+|\+?\d[\d ]{8,}\d/ },
    { label: 'Addressed by role, not by name', re: /\b(Hi|Dear|Hello|Hey)\s+(?!there\b)[A-Z][a-z]+\b/ }
  ];

  function runChecks(text) {
    const v = String(text || '');
    let flags = 0;
    const items = CHECKS.map(c => {
      const m = v.match(c.re);
      if (m) flags++;
      return {
        label: c.label,
        flagged: !!m,
        hit: m ? ('Found “' + m[0].trim().slice(0, 48) + '”. ' + (c.note || 'Reword or remove before export.')) : 'Nothing matched'
      };
    });
    return { items, flags };
  }

  /* ---------- records and review ---------- */
  function emptyReview() { return { crm: false, facts: false, claims: false, pii: false, nosend: false }; }

  function newRecord(id, kind, value) {
    const rec = { id, kind };
    if (kind === 'custom') INTAKE_FIELDS.forEach(k => { rec[k] = clone(value[k]); });
    Object.assign(rec, {
      customerStatus: null, review: emptyReview(), qsel: [0, 1], role: 'founder',
      draft: '', draftEdited: false, exported: false, unknownsLogged: 0
    });
    rec.draft = draftFor(rec);
    return rec;
  }

  function initialState() {
    return {
      schema: SCHEMA,
      activeId: EXAMPLE_ID,
      records: [newRecord(EXAMPLE_ID, 'example')],
      feedback: SEED_FEEDBACK.map((f, i) => Object.assign({ id: i + 1 }, clone(f))),
      nextFbId: SEED_FEEDBACK.length + 1,
      nextRecNo: 1,
      fbTouched: false
    };
  }

  function reviewCount(rec) { return REVIEW_KEYS.filter(k => rec.review[k]).length; }

  /* Clears every review tick and the exported flag. Returns true if anything was cleared. */
  function invalidateReview(rec) {
    const had = reviewCount(rec) > 0 || rec.exported;
    rec.review = emptyReview();
    rec.exported = false;
    return had;
  }

  function setStatus(rec, status) {
    if (status !== null && !STATUSES.includes(status)) throw new Error('Unknown status');
    if (rec.customerStatus === status) return { changed: false, cleared: false };
    rec.customerStatus = status;
    return { changed: true, cleared: invalidateReview(rec) };
  }

  function setDraft(rec, text, edited) {
    const t = String(text);
    if (t === rec.draft) { rec.draftEdited = edited; return { changed: false, cleared: false }; }
    rec.draft = t;
    rec.draftEdited = edited;
    return { changed: true, cleared: invalidateReview(rec) };
  }

  function setReview(rec, key, value) {
    if (!REVIEW_KEYS.includes(key)) return false;
    if (key === 'crm' && value && rec.customerStatus !== 'no') return false;
    rec.review[key] = !!value;
    return true;
  }

  /* Copy and export of a draft or brief. Unknown, unsure and existing-customer status always lock. */
  function canRelease(rec, flags) {
    return rec.customerStatus === 'no'
      && REVIEW_KEYS.every(k => rec.review[k] === true)
      && flags === 0
      && rec.draft.trim().length > 0;
  }

  function addCustomRecord(state, value) {
    const id = 'r-' + state.nextRecNo++;
    const rec = newRecord(id, 'custom', value);
    state.records.push(rec);
    state.activeId = id;
    return rec;
  }

  function updateCustomRecord(rec, value) {
    const changed = INTAKE_FIELDS.some(k => JSON.stringify(rec[k]) !== JSON.stringify(value[k]));
    if (!changed) return { changed: false, cleared: false };
    INTAKE_FIELDS.forEach(k => { rec[k] = clone(value[k]); });
    rec.unknownsLogged = Math.min(rec.unknownsLogged, rec.unknowns.length);
    if (!rec.draftEdited) rec.draft = draftFor(rec);
    return { changed: true, cleared: invalidateReview(rec) };
  }

  function nextAction(rec, fbTouched, flags) {
    const name = contentOf(rec).company;
    const n = reviewCount(rec);
    const done = canRelease(rec, flags);
    if (rec.customerStatus === null) return { short: 'Check customer status in CRM', title: 'Check ' + name + ' in the CRM', body: 'No CRM is connected to this desk. Look the company up yourself, then record what you found. Outreach stays locked until you do.', go: [] };
    if (rec.customerStatus === 'yes') return { short: 'Stop: existing customer', title: 'Stop here. It’s an existing customer.', body: 'Hand this to the account owner. The brief stays on the desk for reference, but copy and export are locked.', go: [] };
    if (rec.customerStatus === 'unsure') return { short: 'Hold until status is confirmed', title: 'Hold outreach until status is confirmed', body: 'Keep researching if useful, but copy and export stay locked until someone confirms customer status.', go: [['#brief', 'Keep reading the brief', 'btn btn-sm']] };
    if (!done) return { short: 'Review the brief', title: 'Review the brief and sample draft', body: n + ' of 5 review checks done. Read the evidence against the source, then the draft against the UK pages.', go: [['#review', 'Go to review', 'btn btn-ink btn-sm'], ['#brief', 'Open the brief', 'btn btn-sm']] };
    if (!rec.exported) return { short: 'Copy or export the draft', title: 'Copy or export the reviewed draft', body: 'Review is complete. Copy the draft or export the brief. Sending, if it happens, is a person’s call outside this desk.', go: [['#review', 'Copy or export', 'btn btn-ink btn-sm']] };
    if (!fbTouched) return { short: 'Log what you learned', title: 'Log what you learned for product', body: 'Add a question for product, positioning or targeting, or update a decision on an existing item.', go: [['#feedback', 'Open feedback', 'btn btn-ink btn-sm']] };
    return { short: 'Desk clear for this candidate', title: 'Desk clear for this candidate', body: 'Signal logged, brief reviewed and feedback captured. The next public signal starts the loop again.', go: [] };
  }

  function plainBrief(rec, exportedAt) {
    const c = contentOf(rec);
    const checks = runChecks(rec.draft);
    const L = [];
    L.push('UK LAUNCH DESK: ACCOUNT BRIEF (reviewed, not sent)');
    L.push(c.exportHeader);
    L.push(rec.kind === 'example' ? 'Record: researched example from public sources.' : 'Record: entered by hand from a public source, built with a fixed template.');
    L.push('Customer status: recorded as not a customer through a manual check. No live CRM check is evidenced by this export.');
    L.push('Exported: ' + exportedAt);
    L.push('');
    L.push('OBSERVED (' + c.paperKind.toLowerCase() + ', checked ' + fmtDate(c.checkedOn) + ')');
    c.evidence.forEach(e => L.push('- ' + e));
    L.push('Source: ' + c.sourceUrl);
    L.push('');
    L.push('HYPOTHESIS (not confirmed)');
    L.push('- ' + c.hypothesis);
    L.push('');
    L.push('UNKNOWN');
    const unk = c.stillUnknown.slice(1);
    (unk.length ? unk : ['Nothing else recorded']).forEach(x => L.push('- ' + x));
    L.push('');
    L.push('DISCOVERY QUESTIONS');
    c.questions.forEach(q => L.push('- ' + q.t));
    L.push('');
    L.push('UK FIT (verify against linked pages)');
    UK_FIT.forEach(f => L.push('- ' + f.t + ' (' + f.u + ')'));
    L.push('Say carefully:');
    c.careful.forEach(f => L.push('- ' + f.t));
    L.push('');
    L.push('SAMPLE RAMP-TEAM OUTREACH (hypothetical tool, role-only, not sent)');
    L.push(rec.draft);
    L.push('');
    L.push('ILLUSTRATIVE KEYWORD CHECKS (not a guarantee of accuracy or compliance)');
    checks.items.forEach(i => L.push('- ' + (i.flagged ? '[look] ' : '[ok] ') + i.label));
    return L.join('\n');
  }

  /* ---------- feedback ---------- */
  function validateFeedbackItem(raw) {
    const errors = {};
    const r = isObj(raw) ? raw : {};
    const s = k => (typeof r[k] === 'string' ? r[k].trim() : null);
    const theme = s('theme'), q = s('q'), origin = r.origin === undefined || r.origin === null ? '' : s('origin');
    if (!theme) errors.theme = 'Add a theme so others can scan for it.';
    else if (theme.length > LIMITS.theme || /\n/.test(theme)) errors.theme = 'Keep the theme to one line under 80 characters.';
    if (!q) errors.q = 'Write the question you want answered.';
    else if (q.length > LIMITS.question) errors.q = 'Keep the question under 280 characters.';
    if (!FOR_OPTS.includes(r.for)) errors.for = 'Choose product, positioning or targeting.';
    if (!OWNERS.includes(r.owner)) errors.owner = 'Choose an owner from the list.';
    if (!DISPS.includes(r.disp)) errors.disp = 'Choose a decision from the list.';
    if (origin === null || origin.length > LIMITS.origin) errors.origin = 'Origin must be short text.';
    if (r.sample !== undefined && typeof r.sample !== 'boolean') errors.sample = 'sample must be true or false.';
    [['theme', theme], ['q', q], ['origin', origin]].forEach(([k, v]) => {
      if (!errors[k] && typeof v === 'string' && CTRL.test(v)) errors[k] = 'Remove unusual control characters.';
    });
    const ok = Object.keys(errors).length === 0;
    return { ok, errors, value: ok ? { theme, for: r.for, q, owner: r.owner, disp: r.disp, origin, sample: r.sample === true } : null };
  }

  function addFeedback(state, value) {
    const item = Object.assign({ id: state.nextFbId++ }, value);
    state.feedback.unshift(item);
    state.fbTouched = true;
    return item;
  }

  function logUnknown(state, rec) {
    const c = contentOf(rec);
    const u = c.unknownPool[rec.unknownsLogged];
    if (!u) return null;
    rec.unknownsLogged++;
    return addFeedback(state, Object.assign({}, u, { disp: 'New', origin: 'From the ' + c.company + ' brief', sample: rec.kind === 'example' }));
  }

  function unknownsLeft(rec) { return contentOf(rec).unknownPool.length - rec.unknownsLogged; }

  function filterFeedback(list, owner, forv) {
    return list.filter(f => (owner === 'all' || f.owner === owner) && (forv === 'all' || f.for === forv));
  }

  function csvCell(v) {
    let s = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) s = '\'' + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function feedbackCsv(list) {
    const rows = [['Theme', 'Question for', 'Question', 'Owner', 'Decision', 'Origin', 'Kind']];
    list.forEach(f => rows.push([f.theme, f.for, f.q, f.owner, f.disp, f.origin, f.sample ? 'Illustrative sample' : 'Added by you']));
    return rows.map(r => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  /* ---------- serialise, import and storage ---------- */
  function recordOut(rec, withReview) {
    const out = { id: rec.id, kind: rec.kind };
    if (rec.kind === 'custom') INTAKE_FIELDS.forEach(k => { out[k] = clone(rec[k]); });
    Object.assign(out, {
      customerStatus: rec.customerStatus, qsel: rec.qsel.slice(), role: rec.role,
      draft: rec.draft, draftEdited: rec.draftEdited, unknownsLogged: rec.unknownsLogged
    });
    if (withReview) { out.review = clone(rec.review); out.exported = rec.exported; }
    return out;
  }

  function serializeForBackup(state, exportedAt) {
    return {
      schema: SCHEMA,
      exportedAt: exportedAt,
      note: 'UK launch desk backup. Review checks are not included and restart after import. Nothing in this file has been sent.',
      activeId: state.activeId,
      records: state.records.map(r => recordOut(r, false)),
      feedback: state.feedback.map(f => ({ theme: f.theme, for: f.for, q: f.q, owner: f.owner, disp: f.disp, origin: f.origin, sample: f.sample })),
      fbTouched: state.fbTouched
    };
  }

  function serializeForStorage(state) {
    const out = serializeForBackup(state, null);
    delete out.exportedAt; delete out.note;
    out.records = state.records.map(r => recordOut(r, true));
    return out;
  }

  function validateImport(input, opts) {
    opts = opts || {};
    const fail = msgs => ({ ok: false, errors: [].concat(msgs) });
    let data = input;
    if (typeof input === 'string') {
      if (input.length > LIMITS.fileBytes) return fail('The file is larger than 512 KB, which is too big for a desk backup.');
      try { data = JSON.parse(input); } catch (e) { return fail('This file isn’t valid JSON.'); }
    }
    if (!isObj(data)) return fail('The file doesn’t contain a desk backup.');
    if (data.schema !== SCHEMA) return fail('This isn’t a UK launch desk backup (expected schema “' + SCHEMA + '”).');
    if (!Array.isArray(data.records)) return fail('The backup has no list of records.');
    if (data.records.length > LIMITS.records) return fail('The backup holds more than 50 records.');
    if (data.feedback !== undefined && !Array.isArray(data.feedback)) return fail('Feedback must be a list.');
    if ((data.feedback || []).length > LIMITS.feedback) return fail('The backup holds more than 200 feedback items.');

    const errors = [];
    const records = [];
    const ids = new Set();
    const urls = new Set();
    let maxNo = 0;

    data.records.forEach((r, i) => {
      const p = 'Record ' + (i + 1);
      if (!isObj(r)) { errors.push(p + ' isn’t an object.'); return; }
      if (typeof r.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(r.id)) { errors.push(p + ': id must be short lowercase letters, numbers or hyphens.'); return; }
      if (ids.has(r.id)) { errors.push(p + ': duplicate id “' + r.id + '”.'); return; }
      ids.add(r.id);

      let rec;
      if (r.kind === 'example') {
        if (r.id !== EXAMPLE_ID) { errors.push(p + ': the example record must use id “' + EXAMPLE_ID + '”.'); return; }
        rec = newRecord(EXAMPLE_ID, 'example');
      } else if (r.kind === 'custom') {
        if (r.id === EXAMPLE_ID) { errors.push(p + ': a custom record can’t use the example id.'); return; }
        const v = validateIntake(r, { today: opts.today, existingUrls: Array.from(urls) });
        if (!v.ok) { Object.keys(v.errors).forEach(k => errors.push(p + ' (' + k + '): ' + v.errors[k])); return; }
        urls.add(v.value.sourceUrl);
        rec = newRecord(r.id, 'custom', v.value);
        const m = /^r-(\d{1,6})$/.exec(r.id);
        if (m) maxNo = Math.max(maxNo, Number(m[1]));
      } else { errors.push(p + ': kind must be “example” or “custom”.'); return; }

      const status = r.customerStatus === undefined ? null : r.customerStatus;
      if (status !== null && !STATUSES.includes(status)) { errors.push(p + ': customerStatus must be null, “no”, “yes” or “unsure”.'); return; }
      rec.customerStatus = status;

      if (r.role !== undefined) {
        if (!ROLES.includes(r.role)) { errors.push(p + ': role must be “founder” or “finance”.'); return; }
        rec.role = r.role;
      }
      if (r.qsel !== undefined) {
        const nq = contentOf(rec).questions.length;
        const okQ = Array.isArray(r.qsel) && r.qsel.length <= LIMITS.maxQuestions && r.qsel.every(n => Number.isInteger(n) && n >= 0 && n < nq) && new Set(r.qsel).size === r.qsel.length;
        if (!okQ) { errors.push(p + ': qsel must list up to three different question numbers.'); return; }
        rec.qsel = r.qsel.slice().sort((a, b) => a - b);
      }
      if (r.draftEdited !== undefined && typeof r.draftEdited !== 'boolean') { errors.push(p + ': draftEdited must be true or false.'); return; }
      if (r.draftEdited === true) {
        if (typeof r.draft !== 'string' || r.draft.length > LIMITS.draft || CTRL.test(r.draft)) { errors.push(p + ': draft must be plain text under 6000 characters.'); return; }
        rec.draft = r.draft;
        rec.draftEdited = true;
      } else {
        rec.draft = draftFor(rec);
      }
      if (r.unknownsLogged !== undefined) {
        const max = contentOf(rec).unknownPool.length;
        if (!Number.isInteger(r.unknownsLogged) || r.unknownsLogged < 0 || r.unknownsLogged > max) { errors.push(p + ': unknownsLogged is out of range.'); return; }
        rec.unknownsLogged = r.unknownsLogged;
      }
      if (opts.allowReview) {
        if (isObj(r.review)) REVIEW_KEYS.forEach(k => { rec.review[k] = r.review[k] === true; });
        if (rec.customerStatus !== 'no') rec.review.crm = false;
        rec.exported = r.exported === true;
      }
      records.push(rec);
    });

    const feedback = [];
    (data.feedback || []).forEach((f, i) => {
      const v = validateFeedbackItem(f);
      if (!v.ok) Object.keys(v.errors).forEach(k => errors.push('Feedback ' + (i + 1) + ' (' + k + '): ' + v.errors[k]));
      else feedback.push(Object.assign({ id: i + 1 }, v.value));
    });

    if (data.fbTouched !== undefined && typeof data.fbTouched !== 'boolean') errors.push('fbTouched must be true or false.');
    if (errors.length) return { ok: false, errors };

    if (!records.some(r => r.kind === 'example')) records.unshift(newRecord(EXAMPLE_ID, 'example'));
    const activeId = typeof data.activeId === 'string' && records.some(r => r.id === data.activeId) ? data.activeId : EXAMPLE_ID;
    return {
      ok: true,
      state: {
        schema: SCHEMA, activeId, records, feedback,
        nextFbId: feedback.length + 1, nextRecNo: maxNo + 1, fbTouched: data.fbTouched === true
      }
    };
  }

  return {
    SCHEMA, STORAGE_KEY, EXAMPLE_ID, OWNERS, FOR_OPTS, DISPS, STATUSES, ROLES, REVIEW_KEYS, LIMITS,
    EXAMPLE, UK_FIT, SEED_FEEDBACK, CHECKS,
    fmtDate, hostOf, slug, truncate, checkUrl,
    validateIntake, customContent, contentOf, draftText, draftFor, runChecks,
    initialState, newRecord, reviewCount, invalidateReview, setStatus, setDraft, setReview, canRelease,
    addCustomRecord, updateCustomRecord, nextAction, plainBrief,
    validateFeedbackItem, addFeedback, logUnknown, unknownsLeft, filterFeedback, csvCell, feedbackCsv,
    serializeForBackup, serializeForStorage, validateImport
  };
}));
