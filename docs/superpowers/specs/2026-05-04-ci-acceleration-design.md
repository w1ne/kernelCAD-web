# CI Acceleration — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:writing-plans` to convert this spec into a task-by-task plan, then `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute it.

**Goal:** Cut wall-clock CI time from ~3:30 to ~1:30 (≈40-45% reduction) by parallelizing the `qc` step into three independent jobs and adding three caches: `node_modules`, `.tsbuildinfo`, and the vite/vitest cache.

**Architecture:** Today `ci.yml` and `deploy.yml` both run a single `qc` step that chains lint + typecheck + build:cli + cookbook:validate + cookbook:evaluate + cookbook:build + git diff + npm test sequentially (≈137s). After refactor: three parallel jobs (lint / build-and-checks / test) share the same setup via a new composite action; cache-on-hit skips `npm ci` and incremental TS recompile; deploy.yml mirrors the structure plus existing e2e + Pages-deploy.

**Tech Stack:** GitHub Actions YAML; existing `package.json` scripts (split into sub-scripts); new composite action under `.github/actions/setup-cad/`. No new build tools, no new runtime deps.

---

## Why this iteration

CI on every PR runs ~3:30 minutes today. Measured breakdown from PR #65's run (commit `b3d504e`, 2026-05-04):

| Step | Duration |
|---|---|
| Set up job + checkout + setup-node | ~10s |
| `npm ci` (with `~/.npm` cache) | 10s |
| `npm run qc` | **137s** ← 70% of total |
| `npm run build` | ~30s |
| Post-job teardown | ~5s |

`qc` is the bottleneck because it's a serial chain of 8 commands, each of which can run independently of the others (with one constraint — see A2 below). Parallelizing it captures the obvious gain without exotic infrastructure (vitest sharding, larger runners, monorepo task graphs).

Strategic fit: the kernelCAD-web roadmap is in daily-ship cadence (Day-N posts, per-iteration demos). Slow CI compounds — every PR waits 3:30, every tag-push deploy waits 4-5 min. Halving CI shortens the inner loop for every contributor (currently solo + AI agents per project memory).

This is **not** the first CI optimization iteration. Future iterations may add: vitest sharding (workstream "CI iter 2" candidate), larger runners (cost trade-off), or pre-built test fixtures. This iteration is the conservative win — caching + parallelization with no behavior change.

## Scope (closed-set list)

**In:**

- New npm scripts in `package.json`:
  - `qc:lint` — `npm run lint && npm run cookbook:validate`
  - `qc:build` — `npm run typecheck && npm run build:cli && npm run cookbook:build && git diff --exit-code src/skill/SKILL.md && npm run cookbook:evaluate`
  - `qc:test` — `npm test`
  - Existing `qc` becomes the meta-script: `npm run qc:lint && npm run qc:build && npm run qc:test` — preserves local-dev workflow.
- New composite action `.github/actions/setup-cad/action.yml` shared across all jobs:
  - `actions/setup-node@v4` with `cache: npm` (existing).
  - `actions/cache@v4` for `node_modules` keyed on `package-lock.json` hash.
  - `actions/cache@v4` for `.tsbuildinfo` + `node_modules/.cache` + `node_modules/.vite` keyed on TS source + config hashes.
  - Conditional `npm ci` (skipped when `node_modules` cache hit).
- `ci.yml` refactored — three independent jobs (`lint`, `build-and-checks`, `test`) + the existing e2e job (now `needs: [lint, build-and-checks, test]`).
- `deploy.yml` refactored — same three jobs plus the existing `e2e` and `deploy` jobs. The Pages deploy uploads `dist/` produced by `build-and-checks`, passed via `actions/upload-artifact` and `actions/download-artifact`.
- Drop the standalone `Build` step in CI workflows: `qc:build` already runs `tsc -b --noEmit` (typecheck) and `build:cli` (CLI bundle). The `build` step's `tsc -b && vite build` is redundant on the typecheck side; the Vite production build is only needed for the deploy.yml's Pages upload.
- Behavior preserved: `npm run qc` locally still runs the full chain in the original order.

**Out:**

- Vitest sharding — defer to a follow-up iteration. Test job currently dominates wall-clock; sharding into 2-4 jobs could push wall-clock under 60s, but adds shard-balancing complexity and cost.
- GitHub-larger-runners (`ubuntu-latest-large` etc.) — adds spend; revisit if free-tier runners can't keep up.
- Reusable workflow (`workflow_call`) sharing across `ci.yml` and `deploy.yml` — defer; composite action covers the setup duplication. Two workflows have different post-jobs (e2e + deploy in deploy.yml), so a shared parallel-qc workflow buys little versus duplication.
- Changes to `package.json`'s `qc:full` (used by some local scripts) — leave as-is.
- Changes to `lint-demos`, `cookbook:validate`, `cookbook:evaluate`, `cookbook:build` script bodies — these are called from new sub-scripts; the underlying scripts don't change.
- Path-conditional cookbook checks (only run cookbook:* when `cookbook/` files change) — defer; current cookbook:* steps are fast enough that the conditional logic isn't worth the complexity.

## Architecture decisions

### A1 — Three parallel jobs, no inter-job dependencies (within qc tier)

`lint`, `build-and-checks`, and `test` all start from the same base (checkout + setup-cad composite). They have no dependencies on each other. GitHub runs them concurrently. Wall-clock = max-of-three.

Job content:
- **lint** — `npm run qc:lint`. Runs eslint + cookbook frontmatter/tag validation. Estimated ~25-35s.
- **build-and-checks** — `npm run qc:build`. Runs typecheck + build:cli + cookbook:build + git diff (SKILL.md drift) + cookbook:evaluate. Estimated ~60-80s with `.tsbuildinfo` cache.
- **test** — `npm run qc:test`. Runs vitest. Estimated ~90-110s with vitest cache.

**Why these groupings**: lint is independent (no compile output needed). `build-and-checks` keeps cookbook:evaluate adjacent to `build:cli` because cookbook:evaluate executes via `dist/cli/index.js`; splitting them across jobs would require workflow-artifact passing for `dist/cli/`, which adds ~10-15s overhead per job + complexity for marginal gain. `test` is the longest single tool call (vitest); putting it in its own job lets the wall-clock floor at ~90-100s.

**Why not 4+ jobs**: each additional job adds setup overhead (~10s for checkout + setup-cad). Vitest is the floor; further parallelism via more jobs doesn't lower the floor.

### A2 — Cookbook:evaluate stays in `build-and-checks`, not `test`

`cookbook:evaluate` runs each snippet's TypeScript body through the bundled `kernelcad evaluate` CLI (`dist/cli/index.js`). It needs `build:cli` output. The simplest dependency satisfaction is to keep them in the same job.

Alternative considered: pass `dist/cli/` between jobs via `actions/upload-artifact` / `actions/download-artifact`. Rejected because: (a) artifact upload/download takes ~5-10s round trip, (b) `cookbook:evaluate` itself is ~30s — net wall-clock change is zero or slightly negative.

### A3 — Composite action, not reusable workflow

Setup steps (checkout was outside the composite; `setup-node` + cache restores + conditional `npm ci`) are shared across the three jobs. A composite action under `.github/actions/setup-cad/action.yml` is the right abstraction:
- Composite actions can have `runs.using: composite` + multi-step setup.
- Each job calls `uses: ./.github/actions/setup-cad`.
- DRY without the indirection of a separate `.github/workflows/` file.

A reusable workflow (`workflow_call`) was considered but adds a separate YAML file with `inputs:` / `outputs:` parameters. Overkill for setup steps — composite covers it.

### A4 — Three caches; keys chosen for high hit rate without staleness

| Cache | Path | Key | Hit-rate driver |
|---|---|---|---|
| `node_modules` | `node_modules` | `${{ runner.os }}-node-modules-${{ hashFiles('package-lock.json') }}` | Cache hit when `package-lock.json` hasn't changed. Most PRs don't add deps. |
| TS / vite build cache | `.tsbuildinfo` + `node_modules/.cache` + `node_modules/.vite` | `${{ runner.os }}-buildcache-${{ hashFiles('tsconfig*.json', 'src/**/*.ts', 'vite.config.ts', 'vitest.config.ts') }}` | Cache hit only on identical source — but partial hit (older cache for a different commit on same branch) is still useful for incremental compile. |
| (existing) `~/.npm` from `actions/setup-node` | `~/.npm` | `setup-node`'s built-in npm cache | Already in place; covers `npm ci` package downloads when node_modules cache misses. |

**Cache size**: `node_modules` ~500-800 MB, build caches ~50-100 MB. GitHub repo cache limit is 10 GB; well under. Eviction is automatic at 7d-unused.

**Cache poisoning**: keyed on source-content hashes — any source change invalidates. Worst case (corrupted `.tsbuildinfo` from a partial run): tsc detects mismatch and falls back to clean compile. No silent corruption.

### A5 — `Build` step removed from `ci.yml`; preserved differently in `deploy.yml`

`ci.yml` currently runs `npm run build` (= `tsc -b && vite build`) AFTER `qc`. Two issues:
1. `tsc -b` is redundant — `qc:build` already runs `typecheck` (`tsc -b --noEmit`).
2. `vite build` produces the production bundle for Pages deploy — only needed in deploy.yml.

Refactor: drop the `Build` step from `ci.yml` entirely. In `deploy.yml`, the `build-and-checks` job runs an extra `npm run build` step (or a new `build:web` script) that produces `dist/` for the Pages upload. The deploy job downloads the artifact and uploads to Pages.

Net effect: ci.yml gets ~30s faster (no second build); deploy.yml stays correct.

### A6 — `cancel-in-progress` concurrency stays unchanged

Existing `concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }` is correct for our cadence. New commits cancel in-progress runs for the same ref. No change.

### A7 — Behavior preservation: local `npm run qc` still works

Existing `qc` script becomes `npm run qc:lint && npm run qc:build && npm run qc:test`. Sequential, same result, same exit-code semantics. Anyone running `npm run qc` locally before pushing sees no change. The split benefits CI parallelism only.

## Implementation tasks (handoff to writing-plans)

Plan should organize roughly into these task buckets:

1. **Add `qc:lint` / `qc:build` / `qc:test` to `package.json`**, change `qc` to compose them sequentially. No CI change yet — local-dev parity verified by running `npm run qc` locally and confirming all 8 underlying commands still execute.
2. **Create `.github/actions/setup-cad/action.yml`** composite action (setup-node + 2 caches + conditional `npm ci`).
3. **Refactor `ci.yml`** — three parallel jobs (`lint` / `build-and-checks` / `test`) using the composite action. Update the existing `e2e` job's `needs:` to `[lint, build-and-checks, test]`. Drop the `Build` step.
4. **Verify CI on a test PR** — measure wall-clock vs current; confirm cache hit rate; confirm all gates green.
5. **Refactor `deploy.yml`** — three parallel jobs + existing e2e + deploy. Build artifact passing for Pages.
6. **Update CHANGELOG `[Unreleased]`** with the CI changes (no version bump).
7. **Optional follow-up**: write a brief README note in `docs/superpowers/specs/` describing the CI shape so future contributors understand the parallelism.

## Test plan

- **Local**: `npm run qc` runs the full chain — exits 0 on the current `develop` HEAD with no source changes. Same exit-code as today.
- **CI dry-run**: open a draft PR with the changes; observe:
  - Three parallel jobs in the Actions tab.
  - Wall-clock measurement: target ≤ 105s (vs current 167s).
  - Cache hit/miss telemetry in the action logs (cache restore prints "Cache hit" or "Cache miss").
- **CI cache-bust**: bump a `package.json` dep (or add a no-op dependency) and verify `node_modules` cache misses, full `npm ci` runs.
- **Failure mode**: induce a typecheck error; verify only `build-and-checks` fails (lint + test remain queued/running, then complete or get skipped per GitHub default).
- **Concurrency**: push two commits in rapid succession to the test branch; verify the in-flight CI run is cancelled and a fresh one starts.

## Anchor-property check

CI changes don't touch the four anchor properties directly (no kernel API change, no MCP surface change, no AST behavior, no diagnostic codes). Indirect effect:

- **Agent-first** ✓ — faster CI = faster agent inner loop when a kernelCAD agent opens a PR via the MCP layer.
- **Diagnostic-rigorous** ✓ — drift sentinels (HINTS coverage, SKILL.md tool count, etc.) all run in `qc:test` job. No regression.

## Risks

1. **Cache miss rate too high** — if every PR touches a tsconfig or src file, the build cache invalidates often. Mitigation: the cache key includes source content; partial cache hit (older cache for the same branch) still warm-starts incremental TS compile. Monitor cache hit rate after merge; if <50%, narrow the key.
2. **Composite action drift** — the composite is a single source of truth for setup, but if a job needs custom setup (e.g. Playwright browsers in e2e), it composes the action + adds steps. Risk: future contributor adds a step IN the composite that's only needed for one job. Mitigation: code-comment the composite as "minimal shared setup; per-job extras go in the job, not here."
3. **`Build` step removal hides regressions** — today's `Build` step at end of `ci.yml` catches edge cases where `qc:build`'s `build:cli` succeeds but the full `vite build` fails (e.g., import paths that work in dev but not in production). Mitigation: deploy.yml still runs `vite build` on tag pushes; if a `vite build` regression slips through PR, it surfaces at release time. Acceptable risk given release cadence.
4. **Pages-deploy artifact passing complexity** — `actions/upload-artifact` + `actions/download-artifact` add a moving piece in deploy.yml. Mitigation: well-documented GitHub action; failure mode is loud (deploy job fails to find artifact, easy to diagnose).
5. **Cookbook:evaluate's CLI dependency on `build:cli`** — if `build:cli` succeeds but the bundled CLI is broken in some edge case, cookbook:evaluate fails *in the same job* (`build-and-checks`). Today they're sequential in `qc`; same effective behavior. No new risk.

## What this milestone is NOT

- A test-suite shard. Vitest stays in one job. Sharding deferred to a separate iteration if the test job's wall-clock becomes the new bottleneck.
- A move to GitHub-larger-runners. Spend trade-off; revisit later.
- A monorepo task-graph migration (turbo, nx, etc.). Overkill for our scale.
- A change to `npm test`, `lint`, or any of the underlying script bodies. Only the orchestration around them changes.
- A change to local-dev workflow. `npm run qc` still works the same way for a contributor on their laptop.

---

**Next step:** invoke `superpowers:writing-plans` to convert this spec into a task-by-task plan on the `feat/ci-acceleration` branch.
