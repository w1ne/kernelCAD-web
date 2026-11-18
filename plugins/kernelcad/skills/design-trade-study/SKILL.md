---
name: design-trade-study
description: >-
  Compare bounded parametric kernelCAD design variants on one evidence basis. Use for “compare options,” “optimize this design,” “which variant is best,” or a make-versus-design decision. Computes comparable metrics, shows evidence for and against each candidate, runs sensitivity analysis, and keeps the selected variant behind a human review gate.
---

# Design trade study

A trade study is not “generate several shapes and choose the nicest.” It is a
controlled comparison where every candidate uses the same requirements, units,
revision base, and scoring rule.

Read `references/evidence-contract.md` and
`references/scoring-and-sensitivity.md` before starting.

## Workflow

1. **Freeze the baseline.** Fetch the exact saved revision with
   `get_project_revision`, or hash the exact inline source. Preserve the
   baseline unchanged.
2. **Define the decision.** Record the hard constraints, metrics, direction of
   preference, units, weights, process/material assumptions, and the maximum
   number of variants. Use 3–8 variants unless the user supplied another
   bounded set.
3. **Confirm real parameters.** Use `set_param`, `evaluate_script`, and
   `diff_scripts` or `diff_geometry` to prove that each proposed parameter
   changes the intended geometry. A parameter that does not affect the model is
   not a design variable.
4. **Generate comparable candidates.** Change only declared variables. Keep
   interfaces, units, material basis, load cases, DFM process, and acceptance
   requirements constant. Give every candidate an ID and exact source digest.
5. **Evaluate every candidate.** Run full `evaluate_script`; inspect the same
   metrics for all candidates; run the same `dfm_review`; and, where the inputs
   are complete, the same `sweep_tolerance` and `run_fea` studies.
6. **Reject ineligible candidates first.** A hard-constraint failure, missing
   mandatory metric, `NOT_RUN` mandatory check, or `UNSUPPORTED` mandatory check
   makes a candidate ineligible. Do not rescue it with a high weighted score.
7. **Compute the score.** Normalize and calculate scores from returned values as
   specified in `references/scoring-and-sensitivity.md`. Do not rank by eye.
8. **Run sensitivity.** Perturb each nonzero weight by −20% and +20%,
   renormalize, and report winner flips. Also report the single criterion that
   contributes most to the selected candidate’s lead.
9. **Explain both sides.** For each candidate, list supporting evidence,
   contradicting evidence, and the smallest additional test that would resolve
   its largest uncertainty.
10. **Prepare, do not silently select.** Present the ranked matrix and
    recommendation. Save or open the selected variant only after the user
    approves it. Never overwrite the baseline.

## Required output

1. **Recommendation and confidence.**
2. **Baseline identity.**
3. **Decision criteria:** units, directions, hard constraints, weights.
4. **Candidate matrix:** exact revision/digest, eligibility, raw values,
   normalized values, score, and evidence states.
5. **For / against / uncertainty** for every candidate.
6. **Sensitivity:** weight perturbations, winner flips, dominant criterion.
7. **Cheapest discriminating test:** one test that resolves the most important
   remaining uncertainty for the least work.
8. **Approval gate:** the candidate is recommended, not committed.

Never call the highest-scoring variant “optimal” outside the tested candidate
set and assumptions.
