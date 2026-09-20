# Model Quality Gates — no-shape, interference repair, truncation

Status: design approved 2026-09-20. Drives the implementation plan
`docs/superpowers/plans/2026-09-20-model-quality-gates.md`. Follows the first
MUSE 106-case sweep (kernelCAD-private runbook §7), where 69/106 final scripts
failed gates and only 19 were judged.

## Evidence base

From run `muse106-1a94f82-…` (106 cases, driver DeepSeek-V4.1-Flash):

| Failure class | Cases | Mechanism |
|---|---|---|
| No returned shape | 16 | Scripts define data/features but never `return` a model. `evaluate` reports `ok: true, featureCount: 0`; 6 of them passed the gate suite and stopped after 1–2 attempts; 7 became MUSE sandbox failures (`STEP File could not be loaded`) |
| Interference not repaired | 11 | kernelCAD's interference gate **does** catch them (re-verified: 5–28 pairs, `ok:false`), but the repair verdict carries no `hint`; the model failed to fix within 2 repairs |
| Truncated replies | 4 | Exactly 8000 output tokens (`max_tokens` cap), cut mid-statement; `finish_reason` never read; truncated script that parses is treated as final |
| Multi-solid `Shape` returns unchecked | not exercised | `interference` skips any non-Scene return (`partCount: 0`); a `Shape` with ≥2 solids can silently interpenetrate |

Correction recorded: the earlier "interference gate is blind" claim was wrong —
the 11 cases are repair-convergence failures, not gate blindness.

## Scope

1. **P0 — `export.no-shape` from evaluate.** Emit the existing `export.no-shape`
   diagnostic (registry hint + `add-return` nextAction already exist) from
   `evaluateAndBuildScript` and `dryRunScript` when the return value is not an
   exportable artifact: `Shape` | `Scene` | `Region` | non-empty array of
   `Shape`. Flows to CLI `evaluate`, MCP `evaluate_script`, the `/__kernelcad/review`
   payload, and the eval gate runner (repair loop fires).
2. **P1a — interference repair hint.** Give `interference.overlap` verdicts in
   `verdictsFromOracles` a concrete hint (clearance guidance) so
   `buildRepairPrompt` renders an actionable root cause instead of pairs alone.
3. **P1b — truncation handling.** `AgentResponse.finish_reason`; the
   OpenAI-compatible client detects `length` and continues up to 2 times,
   concatenating text/usage; sweep default `--max-tokens` 8k → 16k.
4. **P1c — compound-solid interference (hardening).** `detectCompoundInterferences`
   over `ShapeBackend.solidComponents()` when the target is a Shape with ≥2
   solids; CLI reports `scope`; eval oracle picks up pairs unchanged.

## Non-goals

- No ParamRef arithmetic ergonomics work (larger API design; separate spec).
- No diagnostic-registry additions (reuse `export.no-shape`).
- No benchmark-specific behavior or threshold tuning.
- No change to `eval/runner.ts` MAX_TOKENS default (other evals unaffected);
  the sweep passes 16k explicitly.

## Design

### 1. No-shape detection

New pure module `src/modeling/validation/noShapeReturn.ts`:

```ts
export interface NoShapeReturnInput { returnValue: unknown }
export function detectNoShapeReturn(input): CompilerDiagnostic[]
```

Exportable predicate: `returnValue instanceof Shape || returnValue instanceof
Scene || isRegion(returnValue) || (Array.isArray(returnValue) && returnValue.length > 0
&& returnValue.every((el) => el instanceof Shape))`. Anything else (undefined,
numbers, strings, objects, mixed arrays) emits one error:

```
code: 'export.no-shape', target: 'export-occt', severity: 'error',
message: 'Script produced no model: evaluate requires the script to return a Shape, Scene, or Region.',
hint: NEXT_ACTIONS-adjacent text from registry ('End the script with `return <shape>`'),
nextAction: NEXT_ACTIONS['export.no-shape']  // { kind: 'add-return' }
```

Wiring:
- `evaluateAndBuildScript`: after `detectUnstructuredBodies`, only when
  `!fatal`; pushed diagnostics then drive `fatalAfterGates` → exit 1.
- `dryRunScript`: same check beside `detectUnstructuredBodies`, so agents get
  it from the cheap pre-check.

Risk: introspection-only scripts (return a number) now fail. Accepted contract:
`evaluate` is for models. Full repo suite must stay green; if a legitimate
caller surfaces, revisit.

### 2. Interference repair hint

`verdictsFromOracles` already emits one verdict per pair with
`message: '<A> overlaps <B> by N mm³'`, `margin`, `locus`. Add:

```
hint: 'Clear the overlap: shorten or offset the mating feature along its insertion axis, add clearance, or move the part. Target zero intersection volume for every listed pair.'
```

No message change (pairs are already precise). `buildRepairPrompt` renders the
hint as `fix:` — no prompt-template change needed.

### 3. Truncation

- `eval/types.ts`: `AgentResponse.finish_reason?: string`.
- `eval/agentOpenAICompat.ts`: parse `choices[0].finish_reason`; refactor the
  request/retry path into a private `request(body)`; on `length`, issue up to 2
  continuation requests (`messages + assistant(partial) + user('Continue exactly
  where you left off…')`), concatenating `text` and usage; return the combined
  response with the last `finish_reason`.
- `eval/agent.ts` (Anthropic): set `finish_reason: resp.stop_reason` when present.
- `scripts/runMuseSweep.ts`: default `--max-tokens` 16000.

### 4. Compound interference

- `src/modeling/runtime/detectInterferences.ts`: new
  `detectCompoundInterferences(shape: ShapeBackend, epsilonMm3, ignored,
  diagnostics): CheckInterferenceResult` — `solidComponents()`, bbox prefilter,
  `intersectionVolume`, names `solid[i] ↔ solid[j]`.
- `src/agent/script-runtime/checkInterference.ts`: when the lowered target is a
  Shape (not Scene), call it if `solidComponents().length >= 2`; otherwise keep
  today's `partCount: 0` no-op.
- CLI `interference`: JSON gains `scope: 'scene' | 'compound' | 'none'`; human
  output names the scope.

## Verification

- Unit: `detectNoShapeReturn`; `evaluate`/`dryRun` wiring; verdict hint;
  OpenAI continuation (length→continue, stop→no-op, cap at 2); compound pairs.
- Integration: a `.kcad.ts` whose Scene has overlapping parts still fails the
  eval oracle; a multi-solid Shape return now reports pairs.
- `npm run lint`, `npm run typecheck`, `npm test` green.
- Sweep: mock replay, 2-case live smoke, then a fresh full 106 run; delta vs
  run 1 (expected: up to 16 no-shape + 4 truncation + partial interference
  recovery; interference recovery depends on the driver model).
