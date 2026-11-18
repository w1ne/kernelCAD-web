# Manufacturing evidence contract

## States

| State | Meaning |
| --- | --- |
| `PASS` | A named requirement was checked on this revision and met. |
| `FAIL` | A named requirement was checked on this revision and did not meet. |
| `WARN` | The check completed, but the result needs engineering review or carries a non-blocking limitation. |
| `NOT_RUN` | The check was applicable but did not execute, was skipped, timed out, or lacked required input. |
| `UNSUPPORTED` | The current tool or model cannot evaluate the requested check. |
| `ASSUMPTION` | A value was supplied without revision-bound evidence. It is not a test result. |

`null`, absent, empty, skipped, and zero are different values. Never convert one
into another.

## Evidence row

Every decision-relevant row must include:

- `check`
- `state`
- `requirement`
- `observed`
- `source_revision`
- `tool_and_run`
- `limitations`

When a tool reports a native status or diagnostic code, quote it. Do not replace
it with a softer summary.

## Evidence hierarchy

1. Exact revision identity and source.
2. Deterministic geometry and requirement checks.
3. Process-specific DFM result.
4. Tolerance sampling with explicit coverage.
5. Solver result with material, boundary conditions, mesh and trust status.
6. Visual review.
7. Assumption.

A lower item cannot overwrite a conflict from a higher item. A visual review
cannot clear a deterministic failure.

## Readiness decision

`READY FOR <scope>` requires all mandatory checks for that scope to be `PASS` or
explicitly accepted `WARN`, with no `FAIL`, `NOT_RUN`, or `UNSUPPORTED` row on a
mandatory requirement. Optional checks may remain unrun, but the decision must
name that limitation.

`BLOCKED` does not mean the design is bad. It means the current evidence cannot
support release for the requested scope.
