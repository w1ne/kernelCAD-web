# Mechanism budget outcomes: local primitive probe

This probe uses two small, locally generated box assemblies. It forces the joint-range sweep to skip once and the physics check to skip once. It is **not** vendor SO100 validation, a deployed check, a simulation result, or hardware acceptance.

The demo calls `checkMechanismTruth` directly. Its raw coverage fields are checker evidence; `evaluate_script` surfaces the typed diagnostics with `mechanism` and `mechanismSummary`, while `verify({ check: 'physics' })` returns `coverage` too.

From the repository root, run:

```sh
npx tsx docs/demos/so100-mechanism-budget/demo.ts
```

Settings: both assemblies have one revolute mate with limits `[-30, 30]` degrees. The first has coincident 10 mm boxes and `sweepBudget: 0`; its completed rest check reports an interpenetration error and the typed `mechanism.unverified-budget-exceeded` warning. The second has touching 10 mm boxes, `sweepBudget: Infinity`, `physicsCheck: true`, and `physicsBudget: 0`; it reports `mechanism.physics-budget-exceeded` as a warning and an unverified verdict. A throwing physics session factory counts calls, showing that MuJoCo was not started for the forced physics skip.

Each output line is JSON with the verdict, sweep and physics coverage, diagnostic codes and severities, and, for the physics case, the session-call count.

The observed JSON is retained in [demo-output.json](./demo-output.json). Recreate the short video with `python3 docs/demos/so100-mechanism-budget/render_demo.py`; the renderer and its settings are in [render_demo.py](./render_demo.py).

A bounded local attempt to load the vendor SO100 file stopped during build with `cli.script-exception: p.shape.transform is not a function`, before mechanism checks ran. It produced no SO100 mechanism verdict; the private handoff records this result.

[Workflow demo MP4](./demo.mp4) (four readable cards, captured from this source and invocation).
