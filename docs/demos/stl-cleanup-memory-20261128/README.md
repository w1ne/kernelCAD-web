# Dense STL export memory replay

This bundle replays the 644,040-triangle fixture used by the STL export
regression test. It runs the native mesh export path, writes a temporary binary
STL, checks watertightness and file length, and renders a small view from the
exported facets. The video compares the same local test before and after the
cleanup-buffer change.

**Local engine replay only. This does not verify deployed behavior, slicer
acceptance, or hardware acceptance.**

## Reproduce

From the repository root with the locked dependencies installed and Node
24.22.2 (the repository's `.nvmrc` version):

```bash
node --import tsx docs/demos/stl-cleanup-memory-20261128/demo.ts
python3 docs/demos/stl-cleanup-memory-20261128/render_demo.py
```

The render step uses Pillow, DejaVu Sans Mono and FFmpeg. It writes an 18-second
1280 × 720 H.264 video at 12 fps, yuv420p, CRF 28, with no audio. The STL is a
temporary 20-sphere compound produced by the same `meshShapeForExport` path as
the regression test; the renderer draws its upper-facing Float32 facets for
the top view.

## Evidence

- `demo.ts` — model fixture, mesh export invocation, assertions and evidence
  generation.
- `render_demo.py` — deterministic video renderer reading the generated STL.
- `verification.json` — Node version, command, fixture, measured memory,
  triangle count, output hash, and explicit deployment/acceptance fields.
- `transcript.txt` — actual local run output.
- `test-transcript.txt` — the targeted memory-regression replay output.
- `demo.mp4` and `poster.png` — replay and inspected representative frame.
- Regression source: [`stlExportPeakMemory1585.test.ts`](../../../tests/integration/export/stlExportPeakMemory1585.test.ts)
  and [`meshCleanup.test.ts`](../../../tests/unit/kernel/backends/occt/meshCleanup.test.ts).

The pre-change local regression replay on `origin/develop` measured 318.64 MB
incremental peak RSS. The updated integration replay records its measurement
in `verification.json`. The test also checks the mesh is watertight and compares a
representative export with the reference read-back. These are local test
results, not deployment or manufacturing evidence.
