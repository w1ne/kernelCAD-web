# MUSE 106-Case Sweep — Open-Weight Driver + kernelCAD Agent Stack

Status: design approved 2026-09-19 (brainstorming session). This spec is the
source of truth for the implementation plan. Target: an official MUSE
leaderboard submission run.

## Goal

Run the full 106-case MUSE text-to-CAD benchmark (`dongxiaoyu/MUSE`, arXiv
2605.28579) with `deepseek-ai/DeepSeek-V4.1-Flash` (DeepInfra) driving the
kernelCAD agent stack — skills + gates + repair loop — and produce numbers,
artifacts, and a protocol document rigorous enough to become an official
MUSE leaderboard row. Wall-clock target: under ~90 minutes for all 106 cases
on the local 12-core box, versus days for the interactive pilot.

## Decision record

| Decision | Choice |
|---|---|
| Benchmark | MUSE, all 106 cases, 1 sample/case (their protocol) |
| Result usage | Official leaderboard submission; run first, negotiate package with maintainers after |
| Driver model | `deepseek-ai/DeepSeek-V4.1-Flash` via DeepInfra (OpenAI-compatible) |
| Protocol | kernelCAD product loop: 1 generation + up to 2 diagnostic-driven repairs; candidates=1 (no best-of-N) |
| Architecture | Dedicated batch runner (`scripts/runMuseSweep.ts`) reusing `runTask` internals |
| Judge | MUSE's own judge prompt + `generate_score_sp`; `google/gemini-3.1-pro` served via DeepInfra (preflight validates the exact model id; upstream/calibration defaults use OpenRouter preview serving — recorded as a deviation) |

## Current state (gap analysis)

Exists:
- `eval/oracle/museScorer.ts` + `museScorerWrapper.py` — pushes a kernelCAD
  STEP through MUSE's own sandbox, interpenetration check, and VTK render.
  Pilot-proven on 10 cases.
- `eval/tasks/muse-*` for 10 pilot cases; `eval/lib/importMuseTasks.ts`
  generates `prompt.md` + `harness.ts` from the dataset (idempotent).
- `eval/runner.ts` `runTask()` — closed loop (generate → gate → repair) +
  harness scoring + `score.json`/`transcript.md`; `candidates=1` already
  supported.
- MUSE checkout at `~/projects/muse` with all 106 cases of the HF dataset
  under `data/muse/cases/`; a full qwen-2.5-72b calibration run under
  `out/calib106_qwen72b/` (reproduces published stage-1 rate).

Missing:
- 96 of 106 MUSE tasks not imported.
- No non-Anthropic `AgentClient` (DeepInfra adapter).
- No batch orchestration, resume, aggregation, or judge batching.
- MUSE Python venv not present on this machine (cadquery + vtk).
- `loadCombinedSkillMd()` concatenates all 18 skills (300,511 bytes ≈ 75k
  tokens/turn) — unusable for a 106-case sweep.

## Non-goals

- No bare-model CadQuery run (existing leaderboard rows already cover that).
- No multi-model comparison in this run.
- No benchmark-specific prompt hints beyond the documented retarget to
  `.kcad.ts` (same adaptation contract as the cqe importer).
- No gate/scorer tuning to fit the benchmark; MUSE thresholds and code only.
- No changes to the interactive skills' content for this run.

## Architecture

New files, all in `kernelCAD-web`:

| File | Responsibility |
|---|---|
| `eval/agentOpenAICompat.ts` | `OpenAICompatAgentClient implements AgentClient`. Global `fetch`, no new npm deps. Retries 429/5xx/timeout with exponential backoff + jitter. No Anthropic `cache_control` blocks. |
| `eval/lib/systemPrompt.ts` | `buildSystemPrompt(skillDirs: string[]): string` — reads selected `SKILL.md` files, sorted, joined with `---`. Default selection for the sweep: `kernelcad`, `kernelcad-authoring`, `kernelcad-assemblies`, `kernelcad-parts` (pilot parity). |
| `scripts/runMuseSweep.ts` | Batch entry point: CLI parsing, preflight, worker pool, resume, progress, run envelope, budget guard, STOP-file drain. |
| `eval/oracle/museJudgeWrapper.py` | Calls MUSE's own judge (`generate_score_sp` prompt + `_run_alignment_judge`) for one sample; applies funnel forced-zero; emits `judge.json`. |
| `scripts/museJudge.ts` | Parallel judge pass over `scored` samples (pool, retries, per-case `judge.json`). |
| `scripts/museReport.ts` | Aggregates all cases into `leaderboard.json/csv`, `summary.md`, `protocol.md`. |
| `scripts/musePreflight.ts` | Env/asset verification + one no-agent scorer run on a known STEP. |

Refactor in `eval/runner.ts` (behavior-preserving):
split `runTask` into
- `generateCase(args)` → runs the closed loop, writes `output.kcad.ts`,
  returns loop stats; sets `state.phase = 'generated'`. Accepts
  `maxAttempts`, `maxTokens`, and an explicit `temperature` (today
  `MAX_ATTEMPTS=3`, `MAX_TOKENS=8000` and `variantTemperature()` are
  hardcoded in the runner; the sweep threads its CLI values through).
- `scoreCase(args)` → final evaluate + harness + `score.json`; sets
  `state.phase = 'scored'`.
- `runTask(args)` → compose both (existing callers unchanged; existing
  tests must stay green).

Resume needs `scoreCase` without `generateCase`, which is why the split is
required.

### Interfaces

```ts
// eval/agentOpenAICompat.ts
export interface OpenAICompatOptions {
  baseUrl: string;          // default https://api.deepinfra.com/v1/openai
  apiKey: string;
  maxRetries?: number;      // default 5
  retryBaseMs?: number;     // default 1000
  retryMaxMs?: number;      // default 30000
  fetchImpl?: typeof fetch; // tests
}
```

```ts
// scripts/runMuseSweep.ts (flags)
--cases <a b c>        default: all imported muse-* tasks
--workers <n>          default 6
--model <id>           default deepseek-ai/DeepSeek-V4.1-Flash
--base-url <url>       default https://api.deepinfra.com/v1/openai
--temperature <f>      default 0.2
--max-attempts <n>     default 3 (1 generation + 2 repairs)
--skills <a,b,c,d>     default the 4 above
--run-id <id>          default muse106-<sha7>-<modelSlug>-<ts>
--force <case...>      ignore existing state for these cases
--skip-judge           target phase = scored instead of judged
--max-tokens-in <n>    budget guard, default 25_000_000
--mock-fixture <path>  mock agent replay for integration tests
--preflight-only
```

## Data flow per case

1. `prompt.md` (dataset `design_description.md`, retargeted to `.kcad.ts`) →
   DeepSeek-V4.1-Flash; system = trimmed skills; temp 0.2; max_tokens 8000.
2. `extractScript` → write `output.kcad.ts` → gates: `kernelcad evaluate
   --json` + `kernelcad interference --json` (existing `webGateRunner`).
3. Gate failure → diagnostic-driven repair prompt, up to 2 repairs
   (existing closed loop; `candidates=1`).
4. `kernelcad export step` → `museScorerWrapper.py` with
   `MUSE_PYTHON=<muse>/.venv/bin/python` (direct venv, no `uv run`):
   MUSE sandbox execution, interpenetration check, VTK render.
5. Harness scores stage 1 + overlap; `score.json` written.
6. Judge phase: `museJudgeWrapper.py` (MUSE venv python), candidate = MUSE's
   VTK render, reference = `<case>.png` (or `<case>_stp_render.png` for cases
   listed in `render_only_cases.txt`); temp 0.1, n=1; forced-zero on stage
   1/overlap failure; `judge.json` written.
7. Report phase: aggregate only (no re-computation of scores).

## State machine and resume

`cases/<case>/state.json`:

```json
{ "phase": "pending|generated|scored|judged|infra_error",
  "attempts": 2, "tokens": { "in": 0, "out": 0 },
  "firstFailureCode": "eval.no-script-extracted",
  "protocol": "muse-v1", "updatedAt": "..." }
```

Resume rules (resume is always on; `--force <case>` is the override):
- Target phase is `judged`, or `scored` when `--skip-judge` is set. Cases at
  or past the target phase are skipped.
- `generated` but scoring crashed → reuse `output.kcad.ts`, do not re-call
  the model.
- `judged` is terminal for a sweep invocation; `--force <case>` restarts it.
- Infra errors are retried on the next invocation automatically.

## Error handling, budgets, concurrency

- Retries: agent HTTP 5 (backoff 1s→30s, jitter); CLI gate 2; scorer 2;
  judge 5. Only transport/5xx/429 errors are retried — model-level failures
  are legitimate low scores, never retried.
- Timeouts: agent request 180s; gate 300s; scorer 300s; judge 180s.
- One case never kills the pool. Infra failures are excluded from aggregate
  denominators but always listed.
- Budget guard: cumulative input-token cap (`--max-tokens-in`); checked at
  phase boundaries; abort leaves a resumable run.
- Kill switch: `touch <runRoot>/STOP` → pool drains, no new cases start.
- Exit codes: 0 = all cases at target phase; 1 = infra failures present.
- Concurrency: 6 cases in parallel default; agent calls within a case are
  sequential. Lower to 4 if python stages OOM (14 GB box).

## Outputs and packaging

```
eval/runs/<runId>/
  run.json            # git SHA (+dirty flag), model, temp, skills, workers,
                      # protocol version, judge model/serving, totals, timings
  protocol.md         # MUSE protocol mapping + every deviation (generated)
  cases/<case>/
    output.kcad.ts
    transcript.md
    score.json        # existing Score shape + metrics.muse_*
    state.json
    generated.step
    muse/             # code.py shim, render PNG/STL/STEP, geometry payload
    judge.json        # categories + overall + forced_zero reason
  leaderboard.json
  leaderboard.csv
  summary.md
```

`leaderboard.json` uses MUSE's column names
(`sandbox`, `overlap_free`, `functionality`, `manufacturability`,
`assemblability`, `final`, six category columns). Validator-dependent
columns (`watertight`, `manifold`, `self_int_free`, `geom_valid`) are
`null` with `"validator_status": "unpublished"` — never fabricated.

Aggregation arithmetic (upstream definition, verified against the deleted
`scripts/bench_evaluate/generate_latex_tables_gemini.py` at MUSE commit
`547a724^`; pin the reference in the aggregator source):

| Pillar | Definition |
|---|---|
| Functionality | mean(Functional Adaptation, Usage Stability) |
| Manufacturability | mean(Tolerance, Manufacturability) |
| Assemblability | mean(Assembly Readiness, Joint Design) |
| Final | mean(Functionality, Manufacturability, Assemblability) |

Forced zero: any stage-1 or stage-2 failure zeroes all six categories.
Locally, stage 2 covers only `sandbox` + `overlap_free`; upstream's rule
also zeroes on the unpublished validator's `watertight`/`manifold`/
`self_int_free` failures — `protocol.md` must state this gap.

`summary.md`: funnel attrition (counts per stage), defect taxonomy grouped
by `firstFailureCode`, tokens/cost/wall-clock, infra-error list.

## Prerequisites and environment

1. `npm run build:cli` in `kernelCAD-web`; `KERNELCAD_BIN=./dist/cli/index.js`.
2. MUSE venv (missing on this box):
   `cd ~/projects/muse && uv venv .venv --python 3.12 && uv pip install -e .`
   (cadquery + vtk). Set `MUSE_ROOT`/`MUSE_PYTHON` for the oracle.
3. Dataset present at `~/projects/muse/data/muse/cases/` (106 cases — yes).
4. `DEEPINFRA_API_KEY` from `~/.local/secrets/deepinfra.env` (sourced, never
   written into artifacts).
5. Import remaining 96 tasks via `importMuseTasks.ts` and commit all 106
   `eval/tasks/muse-*` dirs (prompt snapshots = reproducibility).
6. Working tree: implement in a fresh worktree off `develop` (the current
   checkout is a stale hotfix branch); pin the SHA in `run.json`.

## Speed levers (vs the pilot)

| Lever | Saving |
|---|---|
| Trimmed 4-skill prompt (142 KB ≈ 35k tokens vs 300 KB ≈ 75k for all 18) | smaller prefill on every turn |
| `candidates=1` (the runner's default; only `eval/run.ts` sets `BEST_OF_N=4`) | 4× fewer agent calls than the batch eval default, 1× vs protocol |
| 6-case parallel pool | ~6× wall-clock |
| Direct venv python instead of `uv run` per case | ~2–4s × 106 scorer startups |
| Batched/parallel judge | minutes vs sequential hours |
| Resume checkpoints | crashed runs continue instead of restarting |

Not doing: batching MUSE's Python stages into a persistent worker (complexity
justified only if smoke shows scorer startup dominating).

## Testing and verification

- Unit (vitest): OpenAI-compat client (mock fetch: success, 429→retry,
  bad JSON, timeout), `buildSystemPrompt` selection, resume state machine,
  aggregator arithmetic vs fixture (forced-zero, `final` mean), `run.json`
  schema.
- Integration (no API): `--mock-fixture` replay of 2 cases through the real
  MUSE venv, asserting artifacts and `score.json` shape.
- Preflight: `--preflight-only` verifies keys, venv imports, CLI, task
  count, and runs the scorer on a calibration STEP
  (`out/calib106_qwen72b/.../business_card_holder...step`).
- Live smoke: 2 cases with the real model, then full 106.
- Sanity: stage-1 sandbox rate vs the qwen calibration run (plumbing check,
  not accuracy).
- Gates before merge: `npm run lint`, `npm run typecheck`, `npm test`.

## Acceptance criteria

1. All 106 tasks imported; importer re-run is a no-op diff.
2. Full run completes unattended with `--workers 6`; kill/rerun resumes
   without regenerating completed cases.
3. Every case has the artifact set above; infra failures are listed with
   retry evidence and excluded from denominators.
4. `leaderboard.json` arithmetic matches upstream definitions
   (unit-tested); `protocol.md` lists every deviation.
5. Lint, typecheck, unit + integration tests green; no secrets in repo or
   artifacts.
6. Numbers reviewed by Andrii before any external outreach.

## Risks and open questions (for maintainer negotiation)

1. External `validator` module is unpublished (their GitHub issue #3):
   official `geom_valid` cannot be computed locally. We report overlap-free
   + kernelCAD watertight export evidence and ask maintainers to run their
   validator on the submitted package.
2. Judge serving: DeepInfra serves the same model family as the paper's
   OpenRouter preview; serving differs. Documented in `protocol.md`;
   consider an OpenRouter re-run if a key is available.
3. Leaderboard row naming for a tool-assisted entry
   (`deepseek-v4.1-flash + kernelCAD`) — to agree with maintainers.
4. Prompt trim to 4 skills changes nothing semantically but is a protocol
   difference vs the interactive pilot; stated in `protocol.md`.
5. Judge candidate image: upstream uses DrawCAD 4-view PNGs for the 97
   non-render-only cases; DrawCAD is unpublished here, so all 106 use the
   MUSE VTK render (same as the 9 render-only cases). Stated in
   `protocol.md`; ask maintainers for the DrawCAD path at negotiation time.
6. Parallel python stages may pressure memory; workers knob documented.
7. `eval/` and `scripts/` are outside `tsconfig.app/node` includes, so
   `npm run typecheck` doesn't cover the new files; verification relies on
   eslint + vitest, with an optional tsconfig include as part of the plan.
