# Error attribution policy

## Status

Position document, written 2026-05-01 during v0.4-rc.12. Captures a decision deferred during rc.11. Revisit during rc.13+ design discussion.

## Context

`RecomputeEngine` (`src/compute/recomputeEngine.ts`) drives feature evaluation. When a feature's input is unavailable — typically because an upstream feature failed to lower — the engine emits `recompute.input.missing` and skips the downstream feature's lowering entirely.

Consequence: downstream feature-specific diagnostics that would describe a missing-input case (e.g. `feature.loft.bad-sketch`, future `feature.sweep.bad-sketch`) are unreachable through the engine path. They can only fire if the lowerer is invoked directly (e.g. unit test).

rc.10 introduced `feature.sweep.multi-face-profile` as forward-looking infrastructure. rc.11 introduced `feature.loft.bad-sketch` for the same reason. Two precedents, no written policy.

## Trade-off

**Current behavior — root-cause-first attribution.** Agents see `feature.sketch.failed` from the upstream + `recompute.input.missing` from the downstream. Pro: the ultimate cause is named directly. Con: the downstream feature has no specific code to surface intent ("this loft failed because the loft caller chose a bad input slot").

**Proposed alternative — feature-specific attribution.** `RecomputeEngine` would let lowerers opt into receiving a `MISSING_SHAPE_SENTINEL` for unavailable inputs. The lowerer can then emit a feature-specific diagnostic (e.g. `feature.loft.bad-sketch`) describing the slot. Pro: agents see actionable, feature-scoped codes. Con: the engine becomes more complex; root cause may be obscured if multiple downstream features each emit their own diagnostic for the same upstream failure.

## rc.12 position

No engine change. The architectural shift is real and worth doing, but rc.12 is a quality milestone. Implementing it requires:
1. A sentinel value or signal for "missing input" passed through `inputs.byKey`.
2. Per-lowerer opt-in (which features want feature-specific codes vs default behavior).
3. Care around when the engine should still short-circuit (suppressed inputs, intentionally optional inputs, etc).
4. Test updates throughout the integration suite.

This is rc.13+ design work.

## Forward-looking codes — interim policy

Until the engine is changed:

1. **Mark unreachable codes via the `reachable` field.** Any new diagnostic code that is currently unreachable through the engine path must be marked `'direct-lowerer-only'` in `src/mcp/tools/whyDidThisFail.ts` HINTS. Reserved codes use `'reserved'`. The default `'engine-path'` is for codes that fire during normal recompute.

2. **Cite this memo in the introducing PR.** When a future PR introduces a `'direct-lowerer-only'` code, the PR description and CHANGELOG entry must cite `docs/superpowers/specs/2026-05-01-error-attribution-policy.md` as the policy basis. This makes the pattern visible rather than normalized.

3. **Don't accumulate without a plan.** If a third forward-looking code is being introduced, that's the trigger to revisit the engine-side decision. Two precedents with citations is acceptable; three or more without engine work is not.

## Open questions for rc.13+

- Should the engine carry a per-input "missing" sentinel, or should each lowerer poll for input availability before processing?
- Should the engine emit BOTH `recompute.input.missing` AND the downstream feature-specific code (so agents see the chain), or only one?
- Do we need a notion of "soft-required" inputs (where missing-input is fine and the downstream proceeds with a default)?

These are placed for rc.13+ design discussion. No commitment in rc.12.
