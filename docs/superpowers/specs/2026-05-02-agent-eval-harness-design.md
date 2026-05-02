# Agent Eval Harness — v1 Design

**Status:** design (pre-implementation)
**Date:** 2026-05-02
**Owners:** kernelCAD core
**Related:** `2026-04-29-kernelcad-NORTHSTAR.md`, `2026-05-02-v0.1.0-northstar-rebaseline-design.md`

---

## Goal

Build the smallest tool that lets a kernelCAD author tweak an agent-facing surface (a tool description, a diagnostic hint, a SKILL.md section) and immediately see whether agents got better or worse at building parts.

The harness is an **inner-loop dev tool**, not a release gate or a public benchmark. Its primary user is the kernel author optimizing the agent surface. Its primary artifact is a per-task transcript that the author reads to figure out *why* a number changed.

This grounds two of the four anchor properties from the v0.1.0 NORTHSTAR re-baseline:
- **MCP-native** — measurable optimization of the MCP tool surface (deferred to v2 once CLI-mode v1 lands).
- **Diagnostic-rigorous** — measurable optimization of diagnostic-message agent-readability.

If we can't measure agent surface quality, we can't deliberately improve it.

---

## Non-goals (v1)

- Not a leaderboard. One model per invocation. Multi-model comparison is a later concern.
- Not a release gate. Run when you want to.
- Not a published benchmark. Outputs are repo-local artifacts.
- Not parallelized. Tasks run serially. Should still be sub-60s for ~10 tasks at the v1 scale.
- Not a web UI. Markdown transcripts and a terminal summary table are the entire UX.
- Not a multi-oracle suite. Functional rubric only; geometric reconstruction oracle is deferred.
- Not auto-attribution. The human reads the transcript and figures out which surface bled.

---

## The Karpathy loop

The intended flow:

1. Author edits `kernelCAD-web/src/skill/SKILL.md` (or a tool description, or a HINTS entry).
2. Author runs `npm run eval`.
3. Author reads `runs/<latest>/<failing-task>/transcript.md`.
4. Author sees where the agent flailed.
5. Author edits the surface, repeats.

The loop closes on transcripts, not on aggregate scores. The summary table tells you *that* something changed; the transcript tells you *why*.

---

## Architecture

Lives in `kernelCAD-web/eval/`. Single new entry point. No new package. No daemon.

```
kernelCAD-web/eval/
├── run.ts                        # ~200-line entry point: load task → drive agent → score → write transcript
├── oracle/
│   └── kernelcad-client.ts       # Thin wrapper over `kernelcad evaluate --json` and `kernelcad mcp` one-shot calls
├── tasks/
│   └── <task-id>/
│       ├── prompt.md             # What the agent reads
│       └── harness.ts            # default-exports `(scriptPath) => Promise<{ gates, scored }>`
└── runs/
    └── <ISO-timestamp>/
        └── <task-id>/
            ├── transcript.md     # Human-readable event log
            ├── output.kcad.ts    # Agent's final script (committed to repo)
            └── score.json        # Machine-readable result
```

A new `npm run eval` script is added to `package.json`. Default config is hard-coded in `run.ts`:

- Model: `claude-sonnet-4-6` (overridable via `EVAL_MODEL` env var).
- Mode: CLI single-shot (only mode in v1).
- Retry cap: 3 (agent gets up to 3 generation attempts per task; diagnostics fed back between attempts).
- API key: `ANTHROPIC_API_KEY` from env. Missing key ⇒ runner exits 1 with a clear message before any work.
- `kernelcad` CLI: must be resolvable on `PATH`. Missing binary ⇒ runner exits 1 with a clear message before any work. (Local development typically uses `npm link` from the kernelCAD-web checkout.)
- Tasks: every folder under `eval/tasks/` is a task. `npm run eval -- <task-id>` runs one; bare `npm run eval` runs all.

---

## The run loop (`run.ts`)

Per task, the runner does:

1. **Load** `prompt.md` and `harness.ts` from the task folder.
2. **Generate, evaluate, retry up to 3x:**
   - Send messages to the Anthropic Messages API. System prompt = the contents of `src/skill/SKILL.md`. User prompt = the task's `prompt.md` (on retries, with a follow-up user turn appending the diagnostics from the previous attempt).
   - Extract the script from the assistant response by finding the first fenced code block whose language tag is `typescript`, `ts`, `kcad`, or empty. If no fence is found, treat the entire assistant message text as the script. If multiple fenced blocks are present, use the first.
   - Write the script to `runs/<ts>/<task>/output.kcad.ts`.
   - Subprocess `kernelcad evaluate --json runs/<ts>/<task>/output.kcad.ts`. Parse the JSON.
   - If `ok: true` and `diagnostics` empty: break.
   - Otherwise: append the assistant turn and a follow-up user turn (`Diagnostics:\n<formatted>\nFix and return the full corrected script.`) to messages, increment attempt, loop.
3. **Score:** dynamic-import the task's `harness.ts`, call its default export with the final script path, get `{ gates, scored }`.
4. **Write artifacts:**
   - `transcript.md` — full event log in markdown (sections below).
   - `score.json` — `{ gates: { name: bool }, scored: { name: bool }, gate_pass: bool, score: 0..1, attempts: int, tokens: { input, output, total }, time_ms: int }`.
5. **Append** to the in-process aggregate, used to print the summary table at end.

After all tasks: print the summary table to stderr and exit 0.

The runner does not handle parallelism, baseline diffing, or auto-friction-tagging in v1. It does not own the MCP server lifecycle (CLI mode only).

---

## Task contract

A task is a folder under `eval/tasks/` containing exactly two required files:

### `prompt.md`

Plain markdown, what the agent sees as its user message. Should describe what to build in functional terms, with whatever parameters the harness will exercise. Example shape (this is illustrative, not the literal v1 seed task):

```md
# Task: Parametric L-Bracket

Build an L-shaped mounting bracket that works for different bolt sizes.

The script must accept:

```typescript
const boltDiam = param("Bolt Diameter", 5, { unit: 'mm', min: 3, max: 10 });
```

Requirements:
- L-shaped (two perpendicular flat plates joined at a right angle)
- A mounting hole in each plate, hole diameter = boltDiam + 0.5mm clearance
- Wall thickness at least 2x bolt diameter
- Each plate at least 3x bolt diameter in width and height

Return a single Shape from the script.
```

### `harness.ts`

A TypeScript module that default-exports an async function `(scriptPath: string) => Promise<HarnessResult>` where:

```typescript
type HarnessResult = {
  gates: Record<string, boolean>;   // hard pass/fail; any false ⇒ score = 0
  scored: Record<string, boolean>;  // soft tests; partial credit
};
```

The harness uses `oracle/kernelcad-client.ts` to introspect the agent's output. Example shape:

```typescript
import { evaluateScript, getShapeInfo } from '../../oracle/kernelcad-client';

export default async function harness(scriptPath: string): Promise<HarnessResult> {
  const ev = await evaluateScript(scriptPath);
  if (!ev.ok) {
    return { gates: { 'evaluates clean': false }, scored: {} };
  }

  const s = await getShapeInfo(scriptPath);
  const dims = [
    s.bbox.max[0] - s.bbox.min[0],
    s.bbox.max[1] - s.bbox.min[1],
    s.bbox.max[2] - s.bbox.min[2],
  ].sort((a, b) => b - a);
  const bboxVol = dims[0] * dims[1] * dims[2];

  return {
    gates: {
      'evaluates clean': true,
      'non-empty solid': s.volume > 0,
    },
    scored: {
      'L-shape (2 axes > 10mm)': dims[0] > 10 && dims[1] > 10,
      'has holes (vol < 50% bbox)': s.volume < bboxVol * 0.5,
      'not paper-thin (min dim > 2mm)': dims[2] > 2,
    },
  };
}
```

### Optional file

- `solution-expert.kcad.ts` — a hand-written reference solution. Not consumed by the runner in v1; lives next to the task as a sanity check that the harness rubric is achievable. Useful when designing a new task: write the expert solution first, run the harness against it, confirm it scores 100%.

---

## Oracle: `kernelcad-client.ts`

A thin (~50-line) wrapper. Two functions:

```typescript
export async function evaluateScript(scriptPath: string): Promise<{
  ok: boolean;
  diagnostics: Diagnostic[];
}>;

export async function getShapeInfo(scriptPath: string): Promise<{
  volume: number;
  surfaceArea: number;
  bbox: { min: [number, number, number]; max: [number, number, number] };
}>;
```

Implementation:

- `evaluateScript` — `child_process.spawn('kernelcad', ['evaluate', '--json', scriptPath])`, capture stdout, JSON-parse. The CLI already returns the right shape.
- `getShapeInfo` — spawn `kernelcad mcp` as a one-shot subprocess. Send a single JSON-RPC `tools/call` request for `get_shape_info` with `{ file: scriptPath }` over stdin. Read response from stdout. Kill the process. (The MCP server is stdio; one tool call per spawn is wasteful but simple, and v1's task count is small enough that the overhead is acceptable. Persistent MCP session is a v2 concern.)

No new MCP tools are added. The harness rubric stays expressible in terms of `volume`, `surfaceArea`, and `bbox` — the existing `get_shape_info` surface is sufficient. If a future task needs more (face counts, edge counts, feature counts), `harness.ts` calls additional existing MCP tools through the client wrapper; the client just gains thin functions per tool.

---

## Transcript format

Plain markdown, in turn order. Designed for the human author to skim in 30 seconds and spot the friction.

```md
# bracket-holes — claude-sonnet-4-6 — 2026-05-02 14:32:01

## Prompt
> Build an L-shaped mounting bracket...
> [full prompt verbatim]

## Turn 1 (in: 4,231 tok, out: 1,892 tok, 6.3s)

[assistant message text verbatim]

```typescript
[extracted script verbatim]
```

## Evaluate (attempt 1) — FAIL
- `feature.edge-feature.face-ref-not-resolvable` — Canonical face refs only work on un-transformed primitives. Apply transforms after the fillet/chamfer.
  - at fillet on line 7

## Turn 2 (in: 5,123 tok, out: 1,604 tok, 5.1s)

[assistant retry text + corrected script]

## Evaluate (attempt 2) — OK

## Score
- Gates: ✓ evaluates clean, ✓ non-empty solid
- Scored: 3/3 — 100%
- Tokens: 12,850 in / 3,496 out / 16,346 total
- Time: 14.7s
- Attempts: 2
```

---

## Scoring contract

Per task:

```typescript
type Score = {
  gates: Record<string, boolean>;
  scored: Record<string, boolean>;
  gate_pass: boolean;            // all gates true
  score: number;                 // gate_pass ? (passed_scored / total_scored) : 0
  attempts: number;              // 1..3
  tokens: { input: number; output: number; total: number };
  time_ms: number;
};
```

Aggregate (printed to terminal):

```
TASK              SCORE   ATTEMPTS   TOKENS    TIME
bracket-holes     ✓ 1.00  2          16,346    14.7s
crank-slider      ✗ 0.00  3          18,402    41.2s   gate fail
fillet-showcase   ✓ 1.00  1           3,120     4.8s
─────────────────────────────────────────────────────
3 tasks, 2 passed     37,868 total   60.7s
```

The summary intentionally has only five columns. The aggregate is not the iteration signal; the transcripts are. The summary's job is to point you at which transcript to read.

---

## v1 seed task set

v1 ships with 1 hand-curated task to prove the loop end-to-end:

1. **`bracket-holes`** — parametric L-bracket as in the example above. Exercises: `param`, `box`, `cylinder`, `subtract`, `translate`. Has a built-in answer to "did the agent get hung up on canonical face refs" because it's bracket-with-holes, not bracket-with-fillets.

Adding more tasks is a folder-drop with no runner changes. Expansion to ~10 tasks covering the major API surfaces (sketch+extrude, sketch+revolve, sketch+sweep, loft, mirror, fillet/chamfer, variable-radius blends, params with units, full part) is post-v1 work tracked outside this spec.

---

## Error handling

- **Anthropic API error** (network, rate limit, 5xx): retry up to 2x with exponential backoff. If still failing, mark the task `infra_error`, exclude from the summary aggregate (printed in a separate "infra failures" line), exit 0 (don't fail the whole run for one bad task).
- **Script extraction failure** (no code fence found, can't extract a script): treat as a failed attempt, retry. After 3 such attempts: score = 0, gates fail, `infra_error: false` (this is a real eval failure — the agent didn't produce a script).
- **`kernelcad evaluate` subprocess error** (binary missing, exit code != 0 unrelated to script content): mark task `infra_error`, log stderr.
- **MCP server crash during `getShapeInfo`**: harness raises; runner catches, marks gates `{ 'shape introspection': false }`, score = 0.
- **Harness module import error** (task author wrote broken TS): runner catches, marks task `infra_error`, prints stack trace.
- **Agent timeout** (no response in 5 min): abort the request, treat as failed attempt, retry.

The runner exits 0 unless every task is `infra_error` (in which case the harness itself is broken — exit 1).

---

## Testing

- Self-test mode: a `--mock` flag replays a checked-in fixture transcript instead of calling the API. Used in CI to verify runner / oracle / scoring logic without paying API costs.
- One golden run committed to the repo (`eval/runs/golden-2026-05-02/`). CI re-runs the mock against this and asserts the produced transcript / score.json match byte-for-byte.
- Per-component unit tests:
  - Code fence extraction: fixtures for `typescript`, `kcad`, `js`, no-fence, multiple-fences (use first), empty.
  - Diagnostic formatting (for retry feedback): fixtures of `kernelcad evaluate --json` outputs.
  - Score computation: gate-fail-zeroes-everything, partial-credit math.

---

## Extension points (deferred, not v1 work)

The v1 surface is intentionally small. The following are explicitly designed to be addable later without runner rework. Each is a separate spec when built.

### Tier-2 reconstruction oracle

A task folder containing `reference.stl` + `reference.meta.json` (instead of `harness.ts`) triggers `oracle/geometric.ts`. The geometric oracle:

- Runs `kernelcad evaluate --json` to confirm the agent's script produces a shape.
- Exports the agent's shape to STL via `kernelcad export stl`.
- Calls a Python subprocess (`trimesh` + `scikit-image` for voxelization) to compute volume ratio, bbox IoU, chamfer distance (normalized), voxel IoU at 64³.
- Returns the same `HarnessResult` shape with composite-quality gates and per-metric scored entries.

Tier-2 tasks are seeded by a one-shot import script that pulls from a public CAD model dataset, renders multi-view, and uses an LLM to generate the prompt from the renders + dimensions. The import script outputs into `tasks/` exactly like a hand-written task; the runner doesn't know the difference.

### MCP-mode agent loop

A `--mode mcp` flag swaps the generation step. Instead of single-shot script generation + retry, the runner spawns a persistent `kernelcad mcp` subprocess and drives the model in a tool-calling loop. The MCP server's tools become the agent's only way to build the model. Score / transcript / task contract / oracle are all unchanged.

The diff between MCP-mode and CLI-mode scores on the same task is itself a signal: if MCP-mode burns 3x the tokens to reach the same score, the tool surface is slowing the agent down for that task.

### Friction auto-tagger

`runner/friction.ts` walks the transcript event stream and auto-injects friction tags inline:

- `repeated_diagnostic_code` — same diagnostic code appears 2+ times in a run (the agent isn't learning from the hint).
- `tool_thrash` — same MCP tool called 3+ times in a row with similar args (MCP-mode only).
- `late_list_api` — `list_api` called after the first script generation (MCP-mode only; agent should know the API by this point).
- `skill_re_read` — assistant verbatim quotes a chunk of SKILL.md mid-task (heuristic match; SKILL.md content didn't stick).
- `unrecovered_failure` — a diagnostic code raised at attempt N was never resolved before the final output.
- `silent_giveup` — agent stopped before producing a returnable shape.

In v1, the human reads the transcript and notices these patterns by eye. The auto-tagger is added when eyeballing gets repetitive enough to be worth automating.

### Baseline / delta tooling

In v1, two runs are two folders under `runs/`. To diff: `diff -r runs/<a> runs/<b>` or `git diff` if the runs folder is committed.

When this gets old: a `npm run eval:promote -- <run-id>` symlinks `runs/baseline` to that run, and `npm run eval` writes a `runs/<latest>/delta.md` comparing each task's `score.json` to the baseline's. No machinery beyond file-diffing in v1.

### Parallelism

In v1, tasks run serially. If sub-60s with serial execution stops being achievable as the task count grows: the runner spawns N task subprocesses in parallel, each running one task. Per-task work is already isolated (separate output dir, separate harness module, separate kernelcad subprocess), so the parallelization is mechanical.

### LLM-judge rubric

For tasks where deterministic gates can't capture quality (e.g. "is this enclosure aesthetically reasonable"), an LLM-judge variant of the harness pattern: `judge.ts` (instead of `harness.ts`) takes the agent's output STL render + the prompt and returns `{ scored: { rubric_item: bool } }` based on a vision-model rubric. Same scoring contract.

---

## Open questions (to address in implementation, not blocking spec)

1. **MCP one-shot vs persistent in v1's `getShapeInfo`** — spawning `kernelcad mcp` per call costs WASM init time (likely 1-3s per call). If the v1 seed task batch becomes slow because of this, the wrapper can switch to a persistent MCP child process per `run.ts` invocation. Defer until measured.

2. **Diagnostic feedback format on retry** — the user message that gets appended on retry currently formats diagnostics as `code` + `hint`. May want to also include the offending source line or feature ID. Decide based on what makes the agent recover most reliably; instrument and tweak.

3. **Where to commit `runs/`** — committing all runs would balloon the repo. v1 commits one golden run for CI fixture; live runs are gitignored. Per-model output `.kcad.ts` commits (the "diff IS the signal" pattern from the design discussion) is not v1 work because v1 is single-model and runs serially; this becomes meaningful when multi-model leaderboard mode arrives.

---

## Acceptance for v1

The harness is shippable when:

1. `npm run eval -- bracket-holes` runs end-to-end against the live Anthropic API and produces:
   - `runs/<ts>/bracket-holes/transcript.md` that a human can read.
   - `runs/<ts>/bracket-holes/output.kcad.ts` that `kernelcad evaluate` accepts.
   - `runs/<ts>/bracket-holes/score.json` with the documented shape.
2. `npm run eval` (no arg) runs all tasks in `tasks/` and prints the summary table.
3. `npm run eval -- --mock` replays the golden fixture and produces byte-identical artifacts (CI gate).
4. The author can edit one section of `src/skill/SKILL.md`, re-run `npm run eval`, and observe the score and transcript change accordingly.

That's it. v1 is one entry point, one oracle wrapper, one seed task, one mode, one model. Every other axis is deferred behind a clear extension point.
