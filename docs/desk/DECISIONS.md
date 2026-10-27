# Decisions

Independent concept by Ayo Ahmed. These are the calls I made while building v1, and why.

## Platform

- **I kept it to one static page with vanilla HTML, CSS and JavaScript.** It runs offline, from disk or any static host, with nothing to install. Ramp's own stack is not something this concept has permission to integrate with, so I didn't imitate an integration.
- **I split pure logic (`desk-core.js`) from DOM wiring (`desk-ui.js`).** That lets the rules (validation, review gate, import schema) be unit-tested without a browser.
- **I added a content security policy that blocks network connections.** The page can't call out even by mistake, and it still works when opened from disk.

## Honesty in the product

- **Drafts come from fixed templates, not a model.** Given the same input, the desk gives the same output, so a reviewer can trust that nothing was invented between the facts and the draft. The page says this where the brief is built.
- **The Solve Intelligence record stays as a labelled example.** Import can't replace its content. I didn't seed any other companies, because invented leads would undercut the evidence-first point.
- **Customer status is entered by hand and clearly labelled as such.** The pill reads "Review control: not a customer". The exported brief says no live CRM check is evidenced.
- **Unknown, unconfirmed and existing-customer status always lock copy and export.** The lock sits in the release rule itself, not only in the disabled checkbox, and it's tested both ways.
- **Any change to the draft, the facts or the customer status clears every review check.** A partial reset would let a reviewer approve text they never read. The page says why the checks reset.
- **Keyword flags hold a draft even after review.** The checks are explicitly illustrative, but a flagged phrase, such as a European office mention, should be reworded or consciously removed before copying.
- **The JSON backup carries drafts but never review checks.** A backup is a way to move work, not a release path. Importing it always restarts review, and it can't unlock anything.

## Safety with untrusted text

- **Everything typed or imported is written with `textContent`.** The code has no HTML injection sinks, a test enforces that, and browser tests try script and image payloads through both intake and import.
- **Intake rejects email addresses, phone numbers and non-public links.** The desk works at company level, and drafts are addressed by role only.
- **CSV export prefixes cells that start with `=`, `+`, `-` or `@`.** That stops a feedback item turning into a spreadsheet formula.

## Design fidelity

- **The approved stylesheet is embedded unchanged, apart from three removed motion rules.** Those rules styled the video and play button, which I removed entirely. New controls (intake, record selector, data controls) reuse the approved classes. The few extra rules sit in a separate, labelled style block.
- **The wordmark is the literal header SVG, byte for byte.** The three art files are first-party captures with recorded hashes. I didn't substitute or generate any art.
- **I changed approved copy only where it would otherwise have been untrue for a working tool:**
  - The hero now says you enter the signals and that the brief comes from a fixed template. Previously it said the desk "reads" signals and "sends" learnings back.
  - The candidate card says "Researched example".
  - The signals intro no longer says "this week".
  - The facts row says "example sources last checked".
  - The feedback intro says the *seeded* items are samples.
  - "Add a sample item" became "Add an item".
  - The form note now says items are saved in this browser.
  - I added short audience, limits and storage notes in the footer rather than repeating disclaimers through the page.

## Storage

- **Data is device-local only, with a clear control and an explanation in the footer.** Clearing removes the stored key rather than saving an empty desk. If storage is blocked, the desk still works and says changes last only for the tab.
- **Import replaces the desk rather than merging, after a confirmation.** Merging two desks with review state is where mistakes would hide.

## Left out on purpose

- No analytics, telemetry or tracking of any kind.
- No send, mailto or share buttons.
- No claims about any team's internal tools, duties or hiring. The team workflow is a stated hypothesis.
