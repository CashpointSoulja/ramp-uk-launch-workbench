# Test results

**Run:** 27 Oct 2026, 19:47 UTC. Node v22.22.0; Playwright 1.63.0 with Chromium 153.0.8010.12 (headless, Linux).

| Suite | Command | Tests | Pass | Fail | Skipped |
|---|---|---|---|---|---|
| Unit and fidelity | `npm test` | 25 | 25 | 0 | 0 |
| Browser | `npm run test:browser` | 15 | 15 | 0 | 0 |

## Unit and fidelity

1. ok — intake: accepts a complete public signal and normalises it
2. ok — intake: requires company, source, date, at least one fact and a hypothesis
3. ok — intake: only public https links are accepted
4. ok — intake: rejects a duplicate source, future or malformed dates and over-long input
5. ok — intake: rejects contact details and control characters
6. ok — custom record: brief and draft are deterministic and role-only
7. ok — example record: draft matches the approved Solve template
8. ok — keyword checks flag the illustrative risky phrases
9. ok — gate: unknown, unsure and existing-customer status always lock copy/export
10. ok — gate: the status lock holds even if every tick is forced on
11. ok — invalidation: draft, status and fact changes reset every review tick
12. ok — next action follows the manual CRM gate
13. ok — import: a backup round-trips and drops review ticks
14. ok — storage: ticks persist only through the storage path
15. ok — import: malformed files are rejected with readable reasons
16. ok — import: example content cannot be overwritten and markup stays as plain data
17. ok — import: an unedited draft is rebuilt rather than trusted from the file
18. ok — feedback: filters, logged unknowns and validation
19. ok — feedback CSV: quotes cells and neutralises spreadsheet formulas
20. ok — approved CSS is preserved exactly, minus only the removed motion rules
21. ok — literal wordmark SVG bytes are embedded unchanged
22. ok — art files match their recorded first-party hashes
23. ok — motion button and video code are gone
24. ok — no remote loads, no network APIs and no HTML injection sinks in app code
25. ok — no tool, model or provider attribution in the app or release docs

## Browser (Chromium)

1. ok — loads clean: no errors, no external requests, literal art and logo (also opened from disk)
2. ok — intake: validation messages, focus and a deterministic brief
3. ok — intake text is rendered as text, never markup
4. ok — import: malformed and hostile files
5. ok — persistence: survives reload; clear resets after confirmation
6. ok — backup download round-trips through import
7. ok — review invalidation after draft, status and fact changes
8. ok — manual CRM gate: unknown and existing customer always lock copy and export
9. ok — draft editing, role switch, rebuild and question limit
10. ok — feedback: filters, add, update decision, log unknowns and CSV export
11. ok — keyboard: skip link, tab arrows and form focus
12. ok — no horizontal overflow at 320px
13. ok — no horizontal overflow at 390px
14. ok — no horizontal overflow at 1440px
15. ok — storage blocked: the desk still works and says changes last only for the tab

## Mutation spot checks

Each rule was broken on purpose, the suites were run, and the code was restored.

| Change | Caught by |
|---|---|
| Release gate allows unknown or unsure status | Unit: "the status lock holds even if every tick is forced on". This test was added after the first version of the suite missed the change, because the disabled CRM tick masked it. |
| Draft edits no longer clear review checks | Unit: invalidation; Browser: review invalidation |
| Feedback theme written as HTML instead of text | Browser: hostile import |

## Visual review

I captured screenshots at 1440, 390 and 320 px and read them for:

- the hero with art and candidate card;
- the overview flow;
- signals with a custom record;
- the intake form with errors;
- the brief with an unlocked review;
- feedback and the footer.

All art loaded from the local first-party files.

One observation: at 320 px, the hero card's "Do it" button wraps onto two lines. That comes from the approved stylesheet, and I left it unchanged.

## Not run

- Firefox, Safari, and real iOS or Android devices.
- Screen-reader and voice-control testing.
- The clipboard fallback path in browsers without the async clipboard API. Chromium used the async API.
- Re-checking the public sources. They were last checked on 27 Oct 2026, and the build had no access to ramp.com.

## Independent release check

27 October 2026, 19:49 UTC: independently downloaded authored implementation files and reran all 25 unit/fidelity tests and all 15 browser tests. All passed. Browser run used the installed Google Chrome with Playwright; only its launch path was adjusted for this check. Rendered and inspected desktop 1440px, phone 390px and narrow 320px views. Release footer now describes an independent demonstration rather than private review. Backups include draft text even for locked records: the review gate controls copy/brief export, not data ownership or JSON backup. This is not an access-control or compliance boundary.
