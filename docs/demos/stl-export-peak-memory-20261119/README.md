# STL export peak memory on dense meshes

Watch the [15-second MP4](demo.mp4). It shows the peak RSS of the process that
runs one STL export, before and after the change, for an arm assembly, a
planetary gear stage, a bracket and a dense 636 284-triangle plate.

The dense plate peaked at 1284 MB before the change and at 765 MB after. The
STL triangle data of all four parts is byte-identical before and after. The
evaluator memory cap is not changed.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/export/stlExportPeakMemory1585.test.ts \
  tests/unit/kernel/backends/occt/meshHeal.test.ts \
  tests/unit/kernel/backends/occt/assertWatertight.test.ts --reporter=dot
python3 docs/demos/stl-export-peak-memory-20261119/capture_demo.py
python3 docs/demos/stl-export-peak-memory-20261119/inspect_demo.py
```

`capture_demo.py` runs each export in its own vitest worker process and reads
that process's peak RSS. It writes
[measurements.after.json](verification/measurements.after.json); every value
on the slides is read from that file and from
[measurements.before.json](verification/measurements.before.json).

The "before" file was written by `capture_demo.py --measure before` with the
`src/` tree of commit `c8a11fc32` (the parent of the fix). To repeat it, check
out that commit's `src/`, run the command, and restore `src/`.

## Evaluator-like measurement

`evaluator-harness/` runs the export tool in a forked Node child with the
vendor evaluator flags (768 MB heap limit) and records the child's peak RSS:

```sh
node docs/demos/stl-export-peak-memory-20261119/evaluator-harness/build.mjs .
SKIP_EVAL=1 node docs/demos/stl-export-peak-memory-20261119/evaluator-harness/parent.mjs \
  . turbojet examples/gallery/turbojet-engine.kcad.ts /tmp/turbojet.json
rm -r .tmp-eval1585
```

The turbojet assembly (3 611 538 triangles) aborted at the heap limit on the
base commit, peaked at 1224 to 1227 MB after the first fix, and peaks at 826 to
837 MB now. Results are in
[evaluator-measurements.json](verification/evaluator-measurements.json). The
MP4 shows the first set of measurements only.

This is local measurement and test evidence, not a deployed-runtime claim. See
the [verification record](verification/verification.txt) and the
[video inspection contact sheet](verification/video-contact-sheet.png).
