# Test plan

## Approach

- **Unit and fidelity tests** (`tests/unit/`) run on Node's built-in test runner with no dependencies. They cover the pure logic in `desk-core.js` and check that the page keeps the approved stylesheet, the literal wordmark, the art hashes and the no-network, no-HTML-sink rules.
- **Browser tests** (`tests/browser/`) drive Chromium through Playwright against the page served from `127.0.0.1`. One case also opens it from disk. Each test uses a fresh browser context, so local storage starts empty.
- **Mutation spot checks:** key rules were broken on purpose to confirm the tests fail. See the results.
- **Visual review:** screenshots at 320, 390 and 1440 px, read by a person.

## Coverage

| Area | Unit | Browser |
|---|---|---|
| Intake validation | Required fields; HTTPS-only public links; duplicate, date and length limits; contact details; control characters | Inline errors, `aria-invalid`, focus on first error, URL and contact errors, successful build |
| Deterministic brief and draft | Same input gives an identical draft, content and export; role-only greeting; no keyword flags on benign input | Page draft equals core output for the same fields |
| Import | Round trip; ticks dropped; malformed JSON, wrong schema, bad ids, bad enums, http links, oversize file; example can't be overwritten | Malformed file leaves state unchanged; hostile payloads render as text; imported ticks ignored |
| XSS | Markup kept as plain data | Intake and import payloads produce no elements and don't run |
| Persistence and reset | Storage path keeps ticks | Reload keeps status, ticks and feedback; dismissed vs. accepted clear; storage key removed; storage-blocked mode |
| Review invalidation | Draft, status and fact changes reset; unchanged text doesn't | Typing in the draft, a status round trip and a fact edit each reset the checks |
| Manual CRM gate | Unknown, unsure and existing lock, including with every tick forced on | Disabled CRM tick; lock messages; copy to clipboard and export only when "not a customer" with five ticks; keyword flag holds |
| Draft editing | — | Edit kept on role change; rebuild; three-question limit; persists after reload |
| Feedback | Filters, logged unknowns, validation, CSV quoting and formula neutralising | Owner and audience filters and empty state; add with validation; decision persists; log unknowns until disabled; CSV equals filtered list |
| Keyboard and focus | — | Skip link; tab arrows, Home and End with wrap and roving tabindex; focus into intake and feedback forms |
| Mobile overflow | — | 320, 390 and 1440 px with both forms open and each brief tab shown |
| Fidelity | Approved CSS minus motion rules; wordmark bytes; art hashes; no motion code; no remote loads; no attribution strings | No errors, no external requests, art loads, logo attributes |

## Not covered by automated tests

- Firefox, Safari and real phones (only Chromium is automated).
- Screen readers and voice control.
- The clipboard fallback in browsers without the async clipboard API.
- Whether the public sources still say what they said on 27 Oct 2026.
