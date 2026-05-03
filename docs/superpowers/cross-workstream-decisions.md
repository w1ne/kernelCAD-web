# Cross-Workstream Decisions Log

Append-only log of API arbitration decisions when multiple workstreams touch the same surface. Per the v0.2-to-v1.0 gap-closure roadmap §E (Parallel-execution policy, Cross-workstream API arbitration).

**Rules:**
- One entry per decision. Most-recent at the top.
- Date format: `YYYY-MM-DD`.
- Workstreams referenced by their NORTHSTAR module ID (e.g. `v0.6`) or roadmap workstream number (e.g. `#21`).
- Include rationale, not just the decision — future you (and dispatched agents) need to know *why*.
- Never delete an entry. Supersede with a new entry that references the prior one.

## Entry template

```
### YYYY-MM-DD — [decision title]

**Workstreams affected:** [list]
**Surface:** [API / type / file / convention being arbitrated]
**Decision:** [what was decided, in one sentence]
**Rationale:** [why; what was rejected and why]
**Supersedes:** [prior entry date, if any]
**Followup:** [what each affected workstream must do to comply]
```

---

## Entries

(none yet — first entry will be appended above this line as workstreams begin landing)
