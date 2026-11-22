# Scoring and sensitivity

## Normalize

For an eligible candidate `i` and criterion `j`:

- Benefit criterion: `(x_ij - min_j) / (max_j - min_j)`
- Cost criterion: `(max_j - x_ij) / (max_j - min_j)`

When all eligible candidates have the same value, set the normalized value to
`0.5` and state that the criterion does not discriminate.

The weighted score is `sum(weight_j * normalized_ij)`. Weights must be
non-negative and normalized to sum to 1. Show raw values and normalized values;
a score without its inputs is not evidence.

Do not assign a numeric value to missing, `NOT_RUN`, or `UNSUPPORTED` mandatory
data. Mark the candidate ineligible. For optional data, exclude that criterion
from every candidate or present a separate scenario; do not score candidates on
different denominators.

## Sensitivity

For each nonzero weight:

1. Multiply it by `0.8`, renormalize all weights, and recompute.
2. Multiply the original weight by `1.2`, renormalize all weights, and recompute.
3. Record whether first place changes and the new margin.

Report all winner flips. If no tested perturbation flips the winner, say only
that the recommendation is stable to the tested ±20% weight changes.

## Uncertainty

A tie or small score margin does not justify invented precision. Report the
margin, evidence limitations, and the cheapest discriminating test. Examples:
one higher-fidelity FEA run, one tolerance sweep around a binding wall, or one
supplier-specific DFM check.
