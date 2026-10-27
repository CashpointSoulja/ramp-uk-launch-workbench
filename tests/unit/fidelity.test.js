'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const read = p => fs.readFileSync(path.join(ROOT, p));
const sha = buf => crypto.createHash('sha256').update(buf).digest('hex');
const html = read('app/index.html').toString('utf8');

const MOTION_RULES = [
  '.fb-art video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:var(--stage)}\n',
  '.fb-art .play{position:absolute;right:14px;top:14px;z-index:2}\n',
  '#playBtn{display:none!important}\n'
];

test('approved CSS is preserved exactly, minus only the removed motion rules', { skip: !fs.existsSync(path.join(ROOT, 'design/approved-desk.css')) }, () => {
  let approved = read('design/approved-desk.css').toString('utf8');
  for (const rule of MOTION_RULES) {
    assert.equal(approved.split(rule).length - 1, 1, 'rule present once in approved file');
    approved = approved.replace(rule, '');
  }
  const first = /<style>([\s\S]*?)<\/style>/.exec(html)[1];
  assert.equal(first, approved);
});

test('literal wordmark SVG bytes are embedded unchanged', () => {
  const svg = read('assets/ramp-wordmark.svg');
  assert.equal(sha(svg), '863256f74db4e26933d38b22e01e99842e7a3909f561f0144b5fbe0147d3f744');
  assert.equal(html.split(svg.toString('utf8')).length - 1, 1);
});

test('art files match their recorded first-party hashes', () => {
  const sources = JSON.parse(read('app/ART_SOURCES.json'));
  assert.equal(sources.length, 3);
  for (const a of sources) assert.equal(sha(read(path.join('app', a.file))), a.sha256, a.file);
  for (const f of ['art-0.jpg', 'art-1.jpg', 'art-2.jpg']) assert.match(html, new RegExp('src="' + f.replace('.', '\\.') + '"'));
});

test('motion button and video code are gone', () => {
  const js = read('app/desk-ui.js').toString('utf8');
  for (const s of ['playBtn', '<video', 'createElement(\'video\')', 'cdn.air.inc', 'Play product motion']) {
    assert.ok(!html.includes(s), 'html: ' + s);
    assert.ok(!js.includes(s), 'js: ' + s);
  }
});

test('no remote loads, no network APIs and no HTML injection sinks in app code', () => {
  for (const m of html.matchAll(/<(script|link|img)\b[^>]*\b(src|href)="([^"]*)"/g)) {
    assert.ok(!/^(https?:)?\/\//.test(m[3]), 'remote resource: ' + m[3]);
  }
  for (const f of ['app/desk-core.js', 'app/desk-ui.js']) {
    const js = read(f).toString('utf8');
    for (const bad of ['innerHTML', 'outerHTML', 'insertAdjacentHTML', 'document.write', 'eval(', 'new Function', 'fetch(', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'mailto:']) {
      assert.ok(!js.includes(bad), f + ' uses ' + bad);
    }
  }
  assert.match(html, /connect-src 'none'/);
});

test('no tool, model or provider attribution in the app or release docs', () => {
  const files = ['app/index.html', 'app/desk-core.js', 'app/desk-ui.js', 'README.md']
    .concat(fs.readdirSync(path.join(ROOT, 'docs/desk')).map(f => 'docs/desk/' + f));
  for (const f of files) {
    const t = read(f).toString('utf8');
    assert.doesNotMatch(t, /\b(claude|anthropic|openai|chatgpt|gpt-\d|gemini|copilot)\b/i, f);
  }
});
