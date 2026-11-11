# Rest-pose joint continuity evidence

This bundle demonstrates an annular rim/disc model whose rest-pose mesh and
exact BREP pivot-distance queries are both unavailable. It does not claim a
measured bearing-contact result. The BREP pose sweep is forced off with a zero
budget, while the rest-pose joint check still runs. The mechanism remains
`unverified` because joint continuity could not be certified.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/fast/restJointContinuityUnavailableDemo.test.ts
python3 docs/demos/rest-joint-continuity-925/render_demo.py
```

The test constructs the annular rim/disc assembly with the local modeling API,
then stubs `restMeshBvh` and `brepExtremaDistance` to return unavailable pivot
measurements. It asserts that the joint warning and forced-skip warning are
emitted, the mechanism verdict is `unverified`, and sweep coverage is skipped. The test writes
[`demo-output.json`](demo-output.json); the renderer reads that report and
creates [`demo.mp4`](demo.mp4).

## Retained artifacts

- [`restJointContinuityUnavailableDemo.test.ts`](../../../tests/integration/fast/restJointContinuityUnavailableDemo.test.ts): model,
  invocation, deterministic measurement fault injection, and assertions.
- [`render_demo.py`](render_demo.py): video renderer and settings (1280×720,
  24 fps, H.264, 12 seconds).
- [`demo-output.json`](demo-output.json): actual local test result and scope.
- [`demo.mp4`](demo.mp4): readable four-slide summary of the model, verdict,
  diagnostic, and evidence limits.

The MP4 was inspected after rendering. It shows local CAD validation only; no
physics simulation, deployment, or hardware acceptance is claimed.
