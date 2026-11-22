# Trade-study evidence contract

Use the same states as manufacturing readiness:

- `PASS`
- `FAIL`
- `WARN`
- `NOT_RUN`
- `UNSUPPORTED`
- `ASSUMPTION`

Every metric row carries its unit, source revision/digest, tool/run reference,
and limitation. Missing data is not zero. Unsupported data is not neutral.

## Comparability rules

Candidates are comparable only when these are equal or explicitly normalized:

- requirement set
- material basis
- manufacturing process
- load and boundary conditions
- tolerance ranges
- units
- solver and trust class
- evidence version

If one candidate uses a higher-fidelity solver or a different material, keep the
row but mark the cross-candidate comparison as limited. Do not blend unequal
confidence into one unqualified score.

## Hard constraints

Evaluate hard constraints before weighted criteria. A failed or unevaluated
mandatory constraint makes a candidate ineligible. Record the candidate and the
reason; do not delete it from the report.
