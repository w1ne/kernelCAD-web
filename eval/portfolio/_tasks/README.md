# eval/portfolio/_tasks

One subdirectory per portfolio entry, mirroring the slug under `examples/portfolio/`.

```
eval/portfolio/_tasks/<slug>/
  prompt.md     # the same paraphrased prompt used in the portfolio entry README
  harness.ts    # gates that the agent's output must pass to count as "built"
```

The portfolio attempt runner (`scripts/portfolioAttempt.ts`) reads from these paths and writes score data into `eval/runs/portfolio-<slug>-<timestamp>/`.

Harness contracts mirror the `eval/tasks/` shape — see `eval/runner.ts:runTask`.
