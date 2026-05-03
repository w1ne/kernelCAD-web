# First-wave dispatch order — 2026-05-03

Per gap-closure roadmap §I4 (open question 2, pre-decided). Each workstream below gets its own brainstorm session (`superpowers:brainstorming`) → spec → plan → execute cycle. This document orders the next ~5 brainstorm sessions to launch.

## Wave 1 (immediate, parallel-safe)

These three workstreams are cross-cutting infrastructure. They unblock everything else and have no dependencies on each other beyond the harness foundation (already in flight on `feat/eval-harness-v1`).

| Order | Workstream | Why first |
|---|---|---|
| 1 | **#19 — Corpus expansion** | Defines the parity-floor + differentiator-overlay split, wires in the difficulty bands, sets up the per-module task allocation. Every other workstream's "done" criterion depends on this corpus existing. |
| 2 | **#21 — Visual verifier loop** | Provides the rendering MCP tools (`render_views`, `compare_to_intent`) that all per-module ships need for their visual demo set (H11/H12). Demo automation infra is built here. |
| 3 | **#22 — `.kcad.ts` cookbook with retrieval** | Curated library of canonical part snippets for in-prompt retrieval. Independent of #19 and #21. Continuous (cookbook entries grow over time). |

## Wave 2 (after Wave 1 lands; fan out)

Independent module workstreams. No cross-dependencies among these; parallel-safe.

| Order | Workstream | Concurrency note |
|---|---|---|
| 4 | **v0.13 Sheet metal** | Largest module; start early to amortize. |
| 5 | **v0.14 SDF** | Independent; research-heavy. |
| 6 | **v0.6 Assemblies** | Unblocks v0.10 viewport (jointsView, explodeView). |
| 7 | **v0.9 Toolbox lib** | User-space, small. |
| 8 | **v0.11 finish — CLI extras** | Small. |
| 9 | **v0.12 finish — skill installer + bundler** | Small. |
| 10 | **v0.15 Wood** | Small. |
| 11 | **v0.17 GCode** | Independent; research-heavy. |
| 12 | **Patterns** | Benefits from v0.6 grouping but not blocked. |
| 13 | **#20 — Proactive clarification** | Cheap; cross-cutting. |
| 14 | **#24 — Public benchmark submission** | Lightweight; can run any time after Wave 1. |

## Serialized chain (runs concurrently with Wave 2 fan-out)

Touches shared kernel surfaces; must be serialized.

| Order | Workstream | Note |
|---|---|---|
| 15 | **v0.3** | Hole + cut + created refs + geometry fallback. Depends on v0.2 (shipped). |
| 16 | **v0.4** | Constrained sketches. Depends on v0.2; sketch state ties into v0.5. |
| 17 | **v0.5** | Studio UI. Depends on v0.2 (face/edge refs). |
| 18 | **v0.7 NURBS finish** | Independent of the chain but small enough to fold in here. |
| 19 | **v0.8 BOM/drawings** | Independent; folds in late. |
| 20 | **v0.10 Viewport extras** | Depends on v0.6 (jointsView, explodeView). |

## Vision spike (gates v0.16)

| Order | Workstream | Gate |
|---|---|---|
| - | **#20 — Vision spike (Phase 0)** | ≤7 days, parallel to all of the above. Outputs strong-go / weak-go / no-go report. |
| - | **v0.16 Vision module** | Triggers on strong-go or weak-go. Brainstorm runs post-spike. |

## v1.0 polish (terminal)

| Order | Workstream | Note |
|---|---|---|
| Last | **#18 — v1.0 polish + docs** | Gates final release. Brainstorm runs after G3 reached. |

## Concurrency budget

Per spec §E, recommend ≤4–5 active workstreams at once early. Wave 1 plus the in-flight harness work + the just-shipped v0.2 follow-up uses ~4 of the budget. Ramp to 8–10 after harness on `develop` proves stable (post-G1).

## Per-workstream brainstorm prompt template

Each per-workstream brainstorm should reference:

1. The gap-closure roadmap spec: `docs/superpowers/specs/2026-05-03-v0.2-to-v1.0-gap-closure-roadmap-design.md`
2. The relevant NORTHSTAR section if the workstream is a NORTHSTAR module
3. The cross-workstream-decisions log: `docs/superpowers/cross-workstream-decisions.md` (check before designing API surface)
4. Any prior reevaluations: `docs/superpowers/reevaluations/`
