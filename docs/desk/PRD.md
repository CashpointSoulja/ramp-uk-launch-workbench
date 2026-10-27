# UK launch desk: product requirements

Independent concept by Ayo Ahmed. Version 1.0, built as a local, client-side tool.

## Problem

A team launching a finance product in a new country has to decide which companies to approach and what to say to them. It has to do that without overstating what the product does there. Public signals, such as a company posting its first finance hire, can point to good timing. Turning a signal into outreach carries three risks:

- facts, guesses and unknowns get blended together;
- claims from the home market leak into the new one (for the UK: VAT filing, US banking language, entity eligibility);
- the step of checking whether the company is already a customer gets skipped.

## Who it is for (hypothesis)

Someone planning UK go-to-market work from public signals, such as a researcher, an account executive or a launch lead, who checks a company before any outreach happens. This is a hypothesis about how an international expansion team could work. It is not a description of any team's actual process, tools or vacancies.

## Goals

1. Keep **observed**, **hypothesis** and **unknown** visibly separate from signal to draft.
2. Make the customer-status check a manual step that cannot be skipped, because no CRM is connected.
3. Hold every draft for human review, and reset that review whenever the reviewed content changes.
4. Keep UK product claims tied to linked UK pages and flag common overreach.
5. Capture what the field learns as structured, owned questions for product, positioning and targeting.

## Non-goals

- Automated research, scraping, enrichment or lead scoring.
- AI-generated text: drafts come from fixed templates.
- Sending email or messages of any kind.
- A CRM integration, shared database, accounts or analytics.
- Legal or compliance sign-off: the keyword checks are illustrative only.

## Requirements

| ID | Requirement | Covered by |
|---|---|---|
| R1 | Show the researched Solve Intelligence record as an example, with its sources and check date. Import cannot overwrite its content. | Unit: example draft, example cannot be overwritten. Browser: hostile import |
| R2 | Intake for a custom public signal: company, public HTTPS source, observed facts, hypothesis, unknowns, check date, and an optional source description. Inline errors and focus moves to the first invalid field. | Unit: intake suite. Browser: intake |
| R3 | Reject non-HTTPS, credentialed, local or IP-literal links, duplicate sources, future dates, over-long input, control characters and contact details. | Unit: intake suite |
| R4 | Build the brief, questions and role-only draft deterministically from the fields entered, with no names in the greeting. | Unit: determinism. Browser: intake |
| R5 | Record customer status by hand. Unknown, unconfirmed and existing-customer status always lock copy and export. | Unit: gate. Browser: manual CRM gate |
| R6 | Five review checks gate copy and export. Changes to the draft, facts or customer status reset them. | Unit: invalidation. Browser: review invalidation |
| R7 | Keyword checks run as the draft is edited. A flagged draft is held even after review. | Unit: keyword checks. Browser: CRM gate (Munich case) |
| R8 | Draft editing keeps user edits. Role and question changes don't overwrite them unless the user rebuilds. At most three questions. | Browser: draft editing |
| R9 | Feedback: filter by owner and audience, add with validation, update decisions, log unknowns from the active brief, and export the filtered list as CSV with formula cells neutralised. | Unit: feedback, CSV. Browser: feedback |
| R10 | Save to this device's local storage, with a visible explanation and a confirmed clear control. If storage is blocked, the desk still works. | Browser: persistence, storage blocked |
| R11 | JSON backup and import with schema validation. Rejected files change nothing; accepted imports replace the desk after confirmation and restart review. | Unit: import suite. Browser: import, backup round trip |
| R12 | Untrusted text renders as text, never markup. No remote loads or network APIs; the content security policy blocks connections. | Unit: fidelity. Browser: intake text, hostile import, loads clean |
| R13 | Keyboard: skip link, tabs with arrow/Home/End keys and a roving tabindex, focus moved into forms. | Browser: keyboard |
| R14 | No horizontal overflow at 320, 390 and 1440 px with the forms open and every tab shown. | Browser: overflow ×3 |
| R15 | Preserve the approved stylesheet, art composition and literal wordmark. Remove the optional motion code. | Unit: fidelity |

## Data

One local object holds:

- **records:** the example plus custom records, each with customer status, review checks, chosen questions, role and draft;
- **feedback items;**
- **a flag** for whether feedback has been touched.

It is stored under one local-storage key. Backups use the same schema (`uk-launch-desk/v1`) without review checks.

## Acceptance

Every requirement above has at least one automated test. The suites and their latest results are listed in [TEST-PLAN.md](TEST-PLAN.md) and [TEST-RESULTS.md](TEST-RESULTS.md).

## Open questions

- Which customer-status source could a real team grant read-only access to, and would that remove the manual step or only pre-fill it?
- How long does a "first finance hire" signal stay useful before it goes stale?
- Which non-UK entities can a UK customer cover? The desk treats this as unknown throughout.
