# v2 roadmap

Independent concept by Ayo Ahmed. These are candidates, ordered by how much risk they remove. None is committed, and every item that touches company systems needs that company's permission.

| # | Candidate | Why | Needs | Main risk |
|---|---|---|---|---|
| 1 | Read-only customer-status lookup | Removes the most error-prone manual step | Permissioned access to a CRM or customer list; audit log | Over-trusting a lookup that can be stale |
| 2 | Source freshness prompts | Signals and pages go stale | Per-record "re-check by" date; a visible overdue state | Alert fatigue |
| 3 | Owned UK claim library | Keeps the UK fit and "say it carefully" lists current | A named owner; versioned wording with page links and dates | Library drifts from live pages |
| 4 | Shared team store | Briefs and feedback shared across people | Authentication, roles, retention policy, data-protection review | Turns company-level notes into a personal-data store |
| 5 | Feedback decisions with outcomes | Shows which questions changed product or positioning | Decision date, link to the change, owner sign-off | Becomes a backlog nobody reads |
| 6 | Several signals per company | Real accounts have more than one public sign | Records hold a list of sources, each with its own check date | More to review per brief |
| 7 | Exports to the team's own tools | Fewer copy-paste steps | Agreed formats (CSV/notes) and no automatic send | Scope creep towards automation |
| 8 | Assistive-technology review | v1 is keyboard-tested but not screen-reader-tested with users | Sessions with screen-reader and voice-control users | Fixes may change the approved layout |
| 9 | Other markets | Same pattern, different claims | Market-specific claim lists and eligibility answers | Copying UK claims into markets they don't fit |

**Out of scope for v2:** automatic sending, scraping, generated text presented as research, and lead scoring without an agreed, explainable rubric.
