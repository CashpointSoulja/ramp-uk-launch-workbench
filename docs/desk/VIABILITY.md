# Viability memo

Independent concept by Ayo Ahmed. Public sources checked 27 Oct 2026.

## Summary

The workflow pattern looks worth testing: public signal, separated evidence, manual customer check, reviewed draft, owned feedback. The tool as built is a working local prototype that demonstrates the pattern. It is not production software. Using it for real outreach would need permissioned data, legal review and a shared store.

## Desirability: what the public record supports

- Ramp announced its UK launch publicly on 15 Sep 2026, covering corporate cards, expenses, supplier payments and accounting sync ([UK launch post](https://ramp.com/blog/uk-launch)). That points to a period of UK go-to-market work. It does not show what any team needs internally.
- Company-posted finance roles, such as the [Solve Intelligence posting](https://www.ycombinator.com/companies/solve-intelligence/jobs/ajtyl6e-financial-operations-lead), describe building approvals, AP and spend from scratch. That makes them a plausible timing signal. One posting is not evidence of buying intent, and it is not proof that the role is still open.
- **Team workflow hypothesis:** an international expansion team would benefit from a shared way to separate evidence from inference and to route market questions to product. This is untested. It is not based on any internal information, known vacancy or stated need.

## Feasibility

- Built and tested as one static page with vanilla JavaScript. No server, build step or dependencies are needed to run it.
- Deterministic templates keep output predictable and reviewable. No model, API key or paid service is involved.
- The hard parts of a real version are not technical. They are permission to read customer status, agreed UK claim wording, and keeping sources fresh.

## Viability and cost

- Running cost of the prototype: none beyond a browser.
- A team version would add a permissioned store, single sign-on and a read-only customer-status lookup, which means integration and security review effort.
- The value would depend on fewer bad contacts and faster, better-grounded first conversations. None of that has been measured (see [DISCOVERY.md](DISCOVERY.md)).

## Risks and mitigations

| Risk | Mitigation in v1 | Still open |
|---|---|---|
| Contacting an existing customer | Manual status gate; existing or unknown status locks copy and export | Depends on the person checking correctly |
| Overstated UK claims | UK fit tab with linked pages; "say it carefully" list; keyword prompts | Not a compliance review; pages change |
| Stale sources | Check date on every record and export | No automatic re-check reminder |
| Personal data | Intake rejects email addresses and phone numbers; role-only drafts | Names in free text can't all be detected |
| Brand and IP | Logo and art shown as captured, with provenance; independent-concept label | Public use of Ramp marks needs permission |
| Outreach rules | Nothing sends; review includes "I'll send it myself, if at all" | UK GDPR and PECR need proper review before any real outreach |

## What would need to be true

1. A team wants a shared evidence-first brief format and would use it.
2. Read-only customer status can be made available safely.
3. UK claim wording is owned by someone who keeps it current.
4. Feedback items get decisions, not just a backlog.

## Suggested next test

Run the desk for two weeks on public signals only. Log time to a reviewed brief and claim corrections at review. Count how many unknowns reach an owner's decision. Decide on a v2 only after that.
