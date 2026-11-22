# Edge picks after upstream edits

[Watch the 14-second demo](demo.mp4). It shows the authored edge selectors,
the parameter resize that preserves all intended picks, and the notch move that
replaces one edge lineage and produces a typed `feature.selection.no-match`
error. It is a rendered summary of the test run, not a Studio screen recording;
the clip is generated only after the real local Vitest/OCCT regression passes.

## Reproduce

From the repository root, run:

```sh
python3 docs/demos/edge-pick-topology-1300/render_demo.py
```

The script runs the focused mounting-plate, selection-drift, edge-lineage, and
edge-identity tests, saves their actual output to `run-output.txt`, then creates
the MP4 and `verification.json`. The central integration test is
[`mountingPlateEdgePicks.test.ts`](../../../tests/integration/examples/mountingPlateEdgePicks.test.ts).

## Evidence and scope

- `render_demo.py` — verification invocation, video source, and encoding settings.
- `run-output.txt` — captured output from the passing local test run, with
  trailing blank lines trimmed.
- `verification.json` — run time, command, pass counts, video metadata, and hashes.
- `demo.mp4` — 1280 × 720, 24 fps, H.264, no audio.

The resize test checks edge selection and resulting BREP geometry using the
OCCT backend. The moved-notch test checks the typed diagnostic from a full model
rebuild. This is local CAD validation. It does not show deployed behavior,
motion simulation, or hardware acceptance.
