/* UK launch desk: DOM wiring. All user or imported text is written with textContent. */
(function () {
  'use strict';
  const C = window.DeskCore;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function extLink(href, text, cls) {
    const a = el('a', cls, text);
    a.href = href; a.rel = 'noopener noreferrer'; a.target = '_blank';
    return a;
  }

  /* ---------- device-local storage ---------- */
  let storageOk = true;
  function storageGet() { try { return window.localStorage.getItem(C.STORAGE_KEY); } catch (e) { storageOk = false; return null; } }
  function storageSet(v) { try { window.localStorage.setItem(C.STORAGE_KEY, v); storageOk = true; } catch (e) { storageOk = false; } }
  function storageClear() { try { window.localStorage.removeItem(C.STORAGE_KEY); } catch (e) { storageOk = false; } }

  let state;
  let dataNote = '';
  (function load() {
    const raw = storageGet();
    if (raw) {
      const res = C.validateImport(raw, { today: todayIso(), allowReview: true });
      if (res.ok) state = res.state;
      else { state = C.initialState(); dataNote = 'Saved desk data in this browser couldn’t be read, so the desk started fresh.'; }
    } else state = C.initialState();
  })();
  function save() { storageSet(JSON.stringify(C.serializeForStorage(state))); }

  let draftMsg = '';
  let reviewMsg = '';
  const active = () => state.records.find(r => r.id === state.activeId) || state.records[0];

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 2800); }

  /* ---------- art failure fallback ---------- */
  $$('[data-art] img').forEach(img => {
    const fail = () => { img.closest('[data-art]').classList.add('failed'); };
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0 && img.currentSrc) fail();
  });

  /* ---------- header ---------- */
  const hdr = $('.hdr');
  const onScroll = () => hdr.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const navLinks = $$('.nav a');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', a.dataset.sec === e.target.id ? 'true' : 'false')); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-section]').forEach(s => io.observe(s));
  }

  /* ---------- lens ---------- */
  $$('[data-lens-group] input').forEach(inp => inp.addEventListener('change', () => {
    const v = inp.value; document.body.dataset.lens = v;
    $$('[data-lens-group] input').forEach(o => { o.checked = (o.value === v); });
  }));

  /* ---------- tabs ---------- */
  const tabs = $$('.tab');
  function selectTab(tab, focus) {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; $('#' + t.getAttribute('aria-controls')).hidden = !on; });
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      let n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selectTab(n, true); }
    });
  });
  const tabById = { ev: 't-ev', why: 't-why', qs: 't-qs', fit: 't-fit', draft: 't-draft' };
  $$('[data-tab-target]').forEach(a => a.addEventListener('click', () => selectTab($('#' + tabById[a.dataset.tabTarget]))));
  $('#toBrief').addEventListener('click', () => {
    selectTab($('#t-why'));
    $('#brief').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setTimeout(() => $('#t-why').focus({ preventScroll: true }), reduce ? 0 : 500);
  });

  /* ---------- records on the desk ---------- */
  const recordSel = $('#recordSel');
  function renderRecordSel() {
    recordSel.textContent = '';
    state.records.forEach(r => {
      const o = el('option', null, r.kind === 'example' ? C.EXAMPLE.company + ' (researched example)' : C.contentOf(r).company);
      o.value = r.id;
      recordSel.appendChild(o);
    });
    recordSel.value = state.activeId;
    const custom = active().kind === 'custom';
    $('#editRecord').hidden = !custom;
    $('#removeRecord').hidden = !custom;
  }
  recordSel.addEventListener('change', () => {
    state.activeId = recordSel.value;
    draftMsg = ''; reviewMsg = '';
    closeIntake();
    save(); renderRecordSel(); renderRecordView(); render();
    toast('Showing ' + C.contentOf(active()).company + '.');
  });
  $('#removeRecord').addEventListener('click', () => {
    const rec = active();
    if (rec.kind !== 'custom') return;
    const name = C.contentOf(rec).company;
    if (!window.confirm('Remove ' + name + ' from the desk? Its brief, draft and review go too. Feedback items stay.')) return;
    state.records = state.records.filter(r => r.id !== rec.id);
    state.activeId = C.EXAMPLE_ID;
    draftMsg = ''; reviewMsg = '';
    closeIntake();
    save(); renderRecordSel(); renderRecordView(); render();
    recordSel.focus();
    toast(name + ' removed from this browser.');
  });

  /* ---------- public-signal intake ---------- */
  const intake = $('#intake');
  const intakeToggle = $('#intakeToggle');
  let editingId = null;
  const FIELDS = { company: '#iCompany', signalTitle: '#iTitle', sourceUrl: '#iUrl', checkedOn: '#iChecked', facts: '#iFacts', hypothesis: '#iHyp', unknowns: '#iUnk' };
  function showIntakeErrors(errors) {
    Object.keys(FIELDS).forEach(k => {
      const input = $(FIELDS[k]);
      const msg = errors[k] || '';
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      $(FIELDS[k] + '-err').textContent = msg;
    });
  }
  function openIntake(rec) {
    editingId = rec ? rec.id : null;
    showIntakeErrors({});
    $('#intakeMsg').textContent = '';
    if (rec) {
      $(FIELDS.company).value = rec.company;
      $(FIELDS.signalTitle).value = rec.signalTitle;
      $(FIELDS.sourceUrl).value = rec.sourceUrl;
      $(FIELDS.checkedOn).value = rec.checkedOn;
      $(FIELDS.facts).value = rec.facts.join('\n');
      $(FIELDS.hypothesis).value = rec.hypothesis;
      $(FIELDS.unknowns).value = rec.unknowns.join('\n');
    } else {
      intake.reset();
      $(FIELDS.checkedOn).value = todayIso();
    }
    $('#intake-h').textContent = rec ? 'Edit this public signal' : 'Add a public signal';
    $('#intakeSubmit').textContent = rec ? 'Save and rebuild the brief' : 'Build the brief from these fields';
    intake.hidden = false;
    intakeToggle.setAttribute('aria-expanded', 'true');
    $(FIELDS.company).focus();
  }
  function closeIntake() {
    intake.hidden = true;
    intakeToggle.setAttribute('aria-expanded', 'false');
    editingId = null;
  }
  intakeToggle.addEventListener('click', () => { if (intake.hidden || editingId) openIntake(null); else closeIntake(); });
  $('#editRecord').addEventListener('click', () => { const rec = active(); if (rec.kind === 'custom') openIntake(rec); });
  $('#intakeCancel').addEventListener('click', () => { closeIntake(); intakeToggle.focus(); });
  intake.addEventListener('submit', e => {
    e.preventDefault();
    const raw = {};
    Object.keys(FIELDS).forEach(k => { raw[k] = $(FIELDS[k]).value; });
    const existingUrls = state.records.filter(r => r.id !== editingId).map(r => C.contentOf(r).sourceUrl);
    const res = C.validateIntake(raw, { today: todayIso(), existingUrls });
    showIntakeErrors(res.errors);
    if (!res.ok) {
      const n = Object.keys(res.errors).length;
      $('#intakeMsg').textContent = n + (n === 1 ? ' field needs' : ' fields need') + ' a change before the brief can be built.';
      const first = Object.keys(FIELDS).find(k => res.errors[k]);
      $(FIELDS[first]).focus();
      return;
    }
    if (editingId) {
      const rec = state.records.find(r => r.id === editingId);
      const r = C.updateCustomRecord(rec, res.value);
      if (r.changed) {
        reviewMsg = r.cleared ? 'Checks reset because the facts changed.' : '';
        draftMsg = rec.draftEdited ? 'Facts changed. Use “Rebuild from brief” to apply them over your edits.' : 'Rebuilt from the updated brief. Edit freely.';
        toast('Signal updated. Review starts again.');
      } else toast('Nothing changed.');
    } else {
      C.addCustomRecord(state, res.value);
      draftMsg = ''; reviewMsg = '';
      toast('Brief built from your fields with a fixed template. Nothing was fetched.');
    }
    closeIntake();
    save(); renderRecordSel(); renderRecordView(); render();
    $('#paper-h').focus({ preventScroll: true });
    $('#signals').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- record view: everything that changes with the active record ---------- */
  function fillList(ul, items, kind) {
    ul.textContent = '';
    items.forEach(t => { const li = el('li', null, t); if (kind) li.dataset.kind = kind; ul.appendChild(li); });
  }
  function renderRecordView() {
    const rec = active();
    const c = C.contentOf(rec);
    const checked = C.fmtDate(c.checkedOn);

    $('[data-bind="openBrief"]').textContent = 'Open the ' + c.company + ' brief';
    const sl = $('[data-bind="srcLink"]'); sl.href = c.sourceUrl; sl.textContent = c.signalTitle;
    $('[data-bind="srcMeta"]').textContent = c.sourceHost + ', checked ' + checked;
    $('[data-bind="candKind"]').textContent = c.candKind;
    $('[data-bind="candName"]').textContent = c.company;
    $('[data-bind="candSummary"]').textContent = c.candSummary;

    $('.flow').setAttribute('aria-label', 'Signal to feedback, for ' + c.company);
    $('[data-bind="n1d"]').textContent = c.flow.n1;
    $('[data-bind="n2d"]').textContent = c.flow.n2;
    $('[data-bind="n3d"]').textContent = c.flow.n3;

    $('[data-bind="paperKind"]').textContent = c.paperKind;
    $('[data-bind="paperChecked"]').textContent = 'Checked ' + checked;
    $('#paper-h').textContent = c.paperTitle;
    $('[data-bind="paperMeta"]').textContent = c.paperMeta;
    fillList($('#paperLines'), c.paperLines);
    $('[data-bind="paperFoot"]').textContent = c.paperFoot;
    $('[data-bind="paperSrc"]').href = c.sourceUrl;
    $('[data-bind="hypShort"]').textContent = c.signalHypothesis;
    fillList($('#unkList'), c.stillUnknown);

    $('#acct-h').textContent = c.company;
    const chips = $('#chipDyn'); chips.textContent = '';
    c.chips.forEach(t => chips.appendChild(el('span', 'pill', t)));

    $('[data-bind="evIntro"]').textContent = c.evIntro;
    const ev = $('#evList'); ev.textContent = '';
    c.evidence.forEach((t, i) => {
      const li = el('li'); li.dataset.kind = 'observed';
      li.appendChild(el('span', null, t));
      li.appendChild(el('span', 'mk mk-obs', 'Observed'));
      if (i === c.evidence.length - 1) {
        const src = el('span', 'src', 'Source for all lines: ');
        src.appendChild(extLink(c.sourceUrl, c.evSourceText));
        src.appendChild(document.createTextNode('. Checked ' + checked + '.'));
        li.appendChild(src);
      }
      ev.appendChild(li);
    });

    $('[data-bind="hypothesis"]').textContent = c.hypothesis;
    fillList($('#restsList'), c.restsOn);
    fillList($('#wrongList'), c.wrong);

    const fit = $('#fitList'); fit.textContent = '';
    C.UK_FIT.forEach(f => {
      const li = el('li', null, f.t);
      li.appendChild(el('br'));
      li.appendChild(extLink(f.u, f.u.replace(/^https:\/\//, '')));
      fit.appendChild(li);
    });
    const careful = $('#carefulList'); careful.textContent = '';
    c.careful.forEach(f => { const li = el('li', null, f.t); if (f.kind) li.dataset.kind = f.kind; careful.appendChild(li); });

    $('[data-bind="roleFinance"]').textContent = c.roleFinanceLabel;
    $$('input[name="role"]').forEach(r => { r.checked = r.value === rec.role; });
    ta.value = rec.draft;
    renderQs();
  }

  /* ---------- questions ---------- */
  function renderQs(focusIndex) {
    const rec = active();
    const c = C.contentOf(rec);
    const ol = $('#qs'); ol.textContent = '';
    c.questions.forEach((q, i) => {
      const on = rec.qsel.includes(i);
      const full = !on && rec.qsel.length >= C.LIMITS.maxQuestions;
      const li = el('li');
      const label = el('label');
      const txt = el('span');
      txt.appendChild(el('span', 'qt', q.t));
      txt.appendChild(el('span', 'why', q.w));
      const inc = el('span', 'inc', 'In draft ');
      const box = el('input', 'box');
      box.type = 'checkbox'; box.checked = on; box.disabled = full;
      box.setAttribute('aria-label', 'Include question ' + (i + 1) + ' in the sample draft');
      box.addEventListener('change', () => {
        if (box.checked && !rec.qsel.includes(i)) rec.qsel.push(i);
        if (!box.checked) rec.qsel = rec.qsel.filter(n => n !== i);
        rec.qsel.sort((a, b) => a - b);
        if (!rec.draftEdited) rebuildDraft(false);
        else { draftMsg = 'Questions changed. Use “Rebuild from brief” to apply them over your edits.'; save(); render(); }
        renderQs(i);
      });
      inc.appendChild(box);
      label.appendChild(txt);
      label.appendChild(inc);
      li.appendChild(label);
      ol.appendChild(li);
    });
    if (focusIndex !== undefined) { const b = $$('#qs .box')[focusIndex]; if (b) b.focus(); }
  }

  /* ---------- draft ---------- */
  const ta = $('#draft');
  function rebuildDraft(announce) {
    const rec = active();
    const r = C.setDraft(rec, C.draftFor(rec), false);
    ta.value = rec.draft;
    draftMsg = 'Built from the brief. Edit freely.';
    if (r.cleared) reviewMsg = 'Checks reset because the draft changed.';
    save(); render();
    if (announce) toast('Draft rebuilt from the brief.');
  }
  ta.addEventListener('input', () => {
    const rec = active();
    const r = C.setDraft(rec, ta.value, true);
    draftMsg = 'Edited by you. The brief won’t overwrite it unless you rebuild.';
    if (r.cleared) reviewMsg = 'Checks reset because the draft changed.';
    save(); render();
  });
  $$('input[name="role"]').forEach(r => r.addEventListener('change', () => {
    const rec = active();
    rec.role = r.value;
    if (!rec.draftEdited) rebuildDraft(false);
    else { draftMsg = 'Role changed. Use “Rebuild from brief” to apply it over your edits.'; save(); render(); }
  }));
  $('#regen').addEventListener('click', () => rebuildDraft(true));

  function renderChecks(result) {
    const ul = $('#checks'); ul.textContent = '';
    result.items.forEach(c => {
      const li = el('li', c.flagged ? 'flag' : 'pass');
      const ic = el('span', 'ic'); ic.setAttribute('aria-hidden', 'true');
      const body = el('span');
      body.appendChild(el('span', 'ct', (c.flagged ? 'Check: ' : '') + c.label));
      body.appendChild(el('span', 'hit', c.hit));
      li.appendChild(ic); li.appendChild(body);
      ul.appendChild(li);
    });
  }

  /* ---------- review, copy and export ---------- */
  $$('[data-rev]').forEach(b => b.addEventListener('change', () => {
    const rec = active();
    if (!C.setReview(rec, b.dataset.rev, b.checked)) b.checked = false;
    reviewMsg = '';
    save(); render();
  }));

  function download(text, type, name) {
    try {
      const blob = new Blob([text], { type });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      return true;
    } catch (e) { return false; }
  }

  $('#copyBtn').addEventListener('click', async () => {
    const rec = active();
    if (!C.canRelease(rec, C.runChecks(rec.draft).flags)) return;
    let ok = true;
    try { await navigator.clipboard.writeText(rec.draft); }
    catch (e) { ta.focus(); ta.select(); try { ok = document.execCommand('copy'); } catch (_) { ok = false; } }
    if (!ok) { toast('This browser blocked copying. Select the draft and copy it yourself.'); return; }
    rec.exported = true; save(); render(); toast('Draft copied. Nothing was sent.');
  });
  $('#exportBtn').addEventListener('click', () => {
    const rec = active();
    if (!C.canRelease(rec, C.runChecks(rec.draft).flags)) return;
    if (download(C.plainBrief(rec, new Date().toLocaleString('en-GB')), 'text/plain', C.slug(C.contentOf(rec).company) + '-brief-reviewed.txt')) {
      rec.exported = true; save(); render(); toast('Brief exported as a text file. Nothing was sent.');
    } else toast('This browser blocked the download. Use “Copy draft” instead.');
  });

  /* ---------- customer status, recorded by hand ---------- */
  $$('input[name="crm"]').forEach(r => r.addEventListener('change', () => {
    const rec = active();
    const res = C.setStatus(rec, r.value);
    if (res.cleared) reviewMsg = 'Checks reset because customer status changed.';
    save(); render();
    toast(r.value === 'no' ? 'Recorded: not a customer. Review can go ahead.' : r.value === 'yes' ? 'Recorded: existing customer. Outreach is stopped.' : 'Recorded: couldn’t confirm. Outreach stays on hold.');
  }));

  /* ---------- feedback ---------- */
  function fillOptions(sel, opts, first) {
    sel.textContent = '';
    if (first) { const o = el('option', null, first[1]); o.value = first[0]; sel.appendChild(o); }
    opts.forEach(t => sel.appendChild(el('option', null, t)));
  }
  fillOptions($('#fOwner'), C.OWNERS);
  fillOptions($('#fDisp'), C.DISPS);
  fillOptions($('#fFor'), C.FOR_OPTS);
  fillOptions($('#fbFor'), C.FOR_OPTS, ['all', 'Everything']);

  function ownerFilterOpts() {
    const sel = $('#fbOwner');
    const cur = sel.value || 'all';
    const owners = Array.from(new Set(state.feedback.map(f => f.owner)));
    fillOptions(sel, owners, ['all', 'All owners']);
    sel.value = owners.includes(cur) ? cur : 'all';
  }
  function currentFbList() { return C.filterFeedback(state.feedback, $('#fbOwner').value, $('#fbFor').value); }
  function renderFb() {
    ownerFilterOpts();
    const list = currentFbList();
    const box = $('#fbCards'); box.textContent = '';
    if (!list.length) box.appendChild(el('div', 'empty', 'No items match these filters. Change a filter or add an item.'));
    list.forEach((f, idx) => {
      const c = el('article', 'fb' + (idx === 0 && list.length % 2 === 1 ? ' lead' : ''));
      const top = el('div', 'fb-top');
      top.appendChild(el('h3', null, f.theme));
      top.appendChild(el('span', 'pill', f.sample ? 'Illustrative' : 'Your note'));
      c.appendChild(top);
      if (f.origin) c.appendChild(el('span', 'origin', f.origin));
      const qd = el('div');
      qd.appendChild(el('span', 'q-lbl', 'Question for ' + f.for.toLowerCase()));
      qd.appendChild(el('p', 'q', f.q));
      c.appendChild(qd);
      const dl = el('dl');
      dl.appendChild(el('dt', null, 'Owner')); dl.appendChild(el('dd', 'o', f.owner));
      dl.appendChild(el('dt', null, 'How often')); dl.appendChild(el('dd', null, 'Not measured'));
      c.appendChild(dl);
      const lab = el('label', 'field disp');
      lab.appendChild(el('span', null, 'Decision'));
      const s = el('select');
      fillOptions(s, C.DISPS); s.value = f.disp;
      s.setAttribute('aria-label', 'Decision for ' + f.theme);
      s.addEventListener('change', () => {
        f.disp = s.value; state.fbTouched = true;
        save(); render();
        toast('Decision set to “' + s.value + '” for ' + f.theme + '.');
      });
      lab.appendChild(s);
      c.appendChild(lab);
      box.appendChild(c);
    });
  }
  $('#fbOwner').addEventListener('change', renderFb);
  $('#fbFor').addEventListener('change', renderFb);

  const form = $('#addform'), tog = $('#addToggle');
  const FORM_NOTE = 'Saved in this browser only. Nothing is sent.';
  function openForm(open) { form.hidden = !open; tog.setAttribute('aria-expanded', open); if (open) $('#fTheme').focus(); }
  tog.addEventListener('click', () => openForm(form.hidden));
  $('#addCancel').addEventListener('click', () => { openForm(false); tog.focus(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const res = C.validateFeedbackItem({ theme: $('#fTheme').value, for: $('#fFor').value, q: $('#fQ').value, owner: $('#fOwner').value, disp: $('#fDisp').value, origin: 'Added by you', sample: false });
    $('#fTheme').setAttribute('aria-invalid', res.errors.theme ? 'true' : 'false');
    $('#fQ').setAttribute('aria-invalid', res.errors.q ? 'true' : 'false');
    if (!res.ok) {
      const first = res.errors.theme ? 'theme' : res.errors.q ? 'q' : Object.keys(res.errors)[0];
      $('#formMsg').textContent = res.errors[first];
      (first === 'q' ? $('#fQ') : $('#fTheme')).focus();
      return;
    }
    C.addFeedback(state, res.value);
    form.reset(); $('#formMsg').textContent = FORM_NOTE;
    $('#fbOwner').value = 'all'; $('#fbFor').value = 'all';
    openForm(false); save(); renderFb(); render();
    tog.focus();
    toast('Item added. It’s saved in this browser only.');
  });
  $('#logUnknown').addEventListener('click', () => {
    const rec = active();
    const item = C.logUnknown(state, rec);
    if (!item) { toast('Every unknown from this brief is already logged.'); render(); return; }
    $('#fbOwner').value = 'all'; $('#fbFor').value = 'all';
    save(); renderFb(); render();
    toast('Logged “' + item.theme + '” as a feedback item.');
  });
  $('#fbExport').addEventListener('click', () => {
    const list = currentFbList();
    if (!list.length) { toast('No items match the filters, so there’s nothing to export.'); return; }
    if (download(C.feedbackCsv(list), 'text/csv', 'uk-launch-desk-feedback.csv'))
      toast('Exported ' + list.length + ' feedback item' + (list.length === 1 ? '' : 's') + ' as CSV, matching the current filters. Nothing was sent.');
    else toast('This browser blocked the download.');
  });

  /* ---------- backup, import and clear ---------- */
  function setDataMsg(text, list) {
    const box = $('#dataMsg'); box.textContent = '';
    if (text) box.appendChild(el('p', 'small', text));
    if (list && list.length) {
      const ul = el('ul', 'small data-errors');
      list.forEach(t => ul.appendChild(el('li', null, t)));
      box.appendChild(ul);
    }
  }
  $('#backupBtn').addEventListener('click', () => {
    const json = JSON.stringify(C.serializeForBackup(state, new Date().toISOString()), null, 2);
    if (download(json, 'application/json', 'uk-launch-desk-backup-' + todayIso() + '.json'))
      setDataMsg('Backup downloaded. It holds your records, drafts and feedback, but not review checks.');
    else setDataMsg('This browser blocked the download.');
  });
  const importFile = $('#importFile');
  $('#importBtn').addEventListener('click', () => importFile.click());
  importFile.addEventListener('change', () => {
    const f = importFile.files && importFile.files[0];
    importFile.value = '';
    if (!f) return;
    if (f.size > C.LIMITS.fileBytes) { setDataMsg('Import stopped. Nothing changed. The file is larger than 512 KB.'); return; }
    f.text().then(text => {
      const res = C.validateImport(text, { today: todayIso() });
      if (!res.ok) {
        const shown = res.errors.slice(0, 5);
        if (res.errors.length > 5) shown.push('…and ' + (res.errors.length - 5) + ' more.');
        setDataMsg('Import stopped. Nothing changed.', shown);
        $('#importBtn').focus();
        return;
      }
      if (!window.confirm('Replace the desk in this browser with this backup? Anything not in the file is removed, and review checks start again.')) {
        setDataMsg('Import cancelled. Nothing changed.');
        return;
      }
      state = res.state;
      draftMsg = ''; reviewMsg = '';
      closeIntake(); save(); renderAll();
      const nr = state.records.length, nf = state.feedback.length;
      setDataMsg('Imported ' + nr + ' record' + (nr === 1 ? '' : 's') + ' and ' + nf + ' feedback item' + (nf === 1 ? '' : 's') + '. Review checks start again.');
    }, () => setDataMsg('Import stopped. The file couldn’t be read.'));
  });
  $('#clearBtn').addEventListener('click', () => {
    if (!window.confirm('Clear all desk data from this browser? Records you added, drafts, review checks and feedback changes are removed. Download a backup first if you need them.')) return;
    storageClear();
    state = C.initialState();
    draftMsg = ''; reviewMsg = '';
    closeIntake(); renderAll();
    setDataMsg('Cleared. This browser no longer holds desk data; the desk shows the researched example and sample feedback again.');
    toast('Desk data cleared from this browser.');
  });

  /* ---------- render everything state-derived ---------- */
  function render() {
    const rec = active();
    const checks = C.runChecks(rec.draft);
    const flags = checks.flags;
    const st = rec.customerStatus;

    const crmTxt = st === null ? 'CRM check needed' : st === 'no' ? 'Review control: not a customer' : st === 'yes' ? 'Existing customer' : 'Status unconfirmed';
    const crmCls = 'pill' + (st === null ? '' : st === 'no' ? ' pill-solar' : st === 'yes' ? ' pill-stop' : ' pill-hold');
    ['crmPill', 'crmPill2', 'crmPill3'].forEach(k => { const e = $(`[data-bind="${k}"]`); e.textContent = crmTxt; e.className = crmCls; });
    $$('input[name="crm"]').forEach(r => { r.checked = r.value === st; });

    const na = C.nextAction(rec, state.fbTouched, flags);
    $('[data-bind="nextShort"]').textContent = na.short;
    $('[data-bind="nextTitle"]').textContent = na.title;
    $('[data-bind="nextBody"]').textContent = na.body;
    const go = $('[data-bind="nextGo"]'); go.textContent = '';
    na.go.forEach(([h, t, cl]) => { const a = el('a', cl, t); a.href = h; go.appendChild(a); });

    C.REVIEW_KEYS.forEach(k => { $('[data-rev="' + k + '"]').checked = rec.review[k]; });
    $('#rev-crm').disabled = st !== 'no';
    $('#crmHint').textContent = st === null ? 'Record it in Next action first' : st === 'no' ? 'Recorded as not a customer' : st === 'yes' ? 'Existing customer: review is stopped' : 'Not confirmed yet: review is on hold';

    const n = C.reviewCount(rec);
    $('#meter').style.width = (n / 5 * 100) + '%';
    const ok = C.canRelease(rec, flags);
    $('#copyBtn').disabled = !ok; $('#exportBtn').disabled = !ok;
    let note;
    if (st === 'yes') note = 'Locked: existing customer.';
    else if (st === null) note = 'Locked until customer status is recorded. ' + n + ' of 5 checks done.';
    else if (st === 'unsure') note = 'On hold: customer status isn’t confirmed. ' + n + ' of 5 checks done.';
    else if (ok) note = 'Unlocked. Copying or exporting doesn’t send anything.';
    else if (n === 5 && flags) note = 'Hold: ' + flags + ' keyword check' + (flags > 1 ? 's' : '') + ' to look at in the draft.';
    else note = n + ' of 5 checks done.';
    $('#stopnote').textContent = (reviewMsg ? reviewMsg + ' ' : '') + note;

    $('[data-bind="n5"]').textContent = st === 'yes' ? 'Stopped: existing customer' : ok ? (rec.exported ? 'Reviewed and exported' : 'Reviewed') : n + ' of 5 checks';
    $('[data-node="5"]').dataset.st = st === 'yes' ? 'stop' : (ok && rec.exported) ? 'done' : 'now';
    $('[data-node="6"]').dataset.st = state.fbTouched && rec.exported ? 'done' : (ok && rec.exported) ? 'now' : 'wait';
    const nf = state.feedback.length;
    const allSamples = state.feedback.every(f => f.sample);
    $('[data-bind="n6"]').textContent = nf + (allSamples ? ' sample item' : ' item') + (nf === 1 ? '' : 's');

    renderChecks(checks);
    const words = (rec.draft.trim().match(/\S+/g) || []).length;
    $('#wc').textContent = words + ' words' + (flags ? ', ' + flags + ' line' + (flags > 1 ? 's' : '') + ' to look at' : '');
    $('#draftState').textContent = draftMsg || (rec.draftEdited ? 'Edited by you. The brief won’t overwrite it unless you rebuild.' : 'Built from the brief. Edit freely.');

    $('#logUnknown').disabled = C.unknownsLeft(rec) <= 0;
    $('#logUnknown').textContent = 'Log an unknown from this brief';
    const nr = state.records.length;
    $('[data-bind="recCount"]').textContent = String(nr);
    $('[data-bind="recCountLabel"]').textContent = 'research candidate' + (nr === 1 ? '' : 's');
    $('#storeNote').textContent = storageOk
      ? 'Records, drafts, review checks and feedback are saved in this browser’s local storage on this device. Nothing is uploaded, and there’s no account.'
      : 'This browser isn’t allowing local storage, so changes last only while this tab is open.';
  }

  function renderAll() { renderRecordSel(); renderRecordView(); renderFb(); render(); }

  /* ---------- init ---------- */
  renderAll();
  if (dataNote) setDataMsg(dataNote);
})();
