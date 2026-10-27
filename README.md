# UK launch desk

Independent concept by Ayo Ahmed. Not affiliated with or endorsed by Ramp.

A single local page that turns one public signal, such as a company-posted finance job, into a source-backed UK account brief and a role-only sample draft. It holds both for a person to review and logs what the field learns as structured questions for product, positioning and targeting.

It works offline in a modern browser. It uses no AI, no scraping, no CRM, no tracking, no accounts and no paid service, and it never sends anything.

## What it does

- **Researched example.** One record, Solve Intelligence, built from a company-posted job checked on 27 Oct 2026. It is an example, not a lead list.
- **Public-signal intake.** You enter a company, a public `https://` source, the facts the source states, your hypothesis and the unknowns. The desk builds the brief, discovery questions and a role-only draft from a fixed template, so the same input always gives the same output. Nothing is fetched from the link.
- **Manual customer check.** You record customer status after looking it up yourself. If the status is unknown, unconfirmed or an existing customer, copy and export stay locked.
- **Human review.** Five checks gate the draft. Any change to the draft, the facts or the customer status resets them.
- **Illustrative keyword checks.** These catch a few risky phrases, such as a VAT filing promise, US banking language, savings figures, European eligibility, contact details or a named greeting. They are prompts for a reviewer, not a compliance check.
- **Feedback.** Filter by owner or audience, add items, update decisions, log unknowns from a brief, and export the filtered list as CSV.
- **Saved on this device.** Data lives in this browser's local storage, with a visible "Clear desk data" control. A JSON backup can be downloaded and imported; imports are checked against a schema and always restart review.

## Run it

- Open `app/index.html` in a browser, or
- run `npm run serve` and open the `127.0.0.1` address it prints (Node 20+).

## Test it

```sh
npm test               # unit and fidelity tests, Node's built-in runner, no dependencies
npm run test:browser   # Chromium tests; needs the playwright package with Chromium installed
```

The latest run is recorded in [docs/desk/TEST-RESULTS.md](docs/desk/TEST-RESULTS.md).

## Layout

| Path | Contents |
|---|---|
| `app/index.html` | The page: approved layout and stylesheet, plus a small block of added styles for new controls |
| `app/desk-core.js` | Pure logic: validation, templates, review gate, import/export and CSV |
| `app/desk-ui.js` | DOM wiring; all user and imported text is written with `textContent` |
| `app/art-*.jpg`, `app/ART_SOURCES.json` | First-party product art with source URLs and SHA-256 hashes |
| `assets/ramp-wordmark.svg` | Literal header wordmark, embedded unchanged in the page |
| `tests/` | Unit, fidelity and browser tests |
| `docs/desk/` | Product and decision documents |

## Documents

- [Product requirements](docs/desk/PRD.md)
- [5 Whys, jobs to be done and metrics](docs/desk/DISCOVERY.md)
- [Viability memo](docs/desk/VIABILITY.md)
- [v2 roadmap](docs/desk/ROADMAP-V2.md)
- [Decisions](docs/desk/DECISIONS.md)
- [Test plan](docs/desk/TEST-PLAN.md) and [results](docs/desk/TEST-RESULTS.md)
- [Source register](docs/desk/SOURCES.md)
- [30-second explanation](docs/desk/EXPLAIN-30S.md)

## Limits

- Public sources were checked on 27 Oct 2026. Product, pricing and eligibility claims must be re-checked on the live UK pages before any use.
- Data stays in one browser on one device. There is no sharing, sync or multi-user review.
- The team workflow it supports is a hypothesis about international expansion work, not a description of any team's actual process or a known vacancy.
- The Ramp name, wordmark and product art belong to Ramp and its licensors. They are reused here only for this independent demonstration, and no licence or endorsement is implied. Lausanne is not bundled; the page falls back to Arial.
