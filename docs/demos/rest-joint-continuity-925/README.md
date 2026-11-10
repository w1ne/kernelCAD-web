# Rest-pose joint continuity evidence

This bundle demonstrates a valid annular rim and disc joint whose rest-pose
mesh and exact BREP point-distance queries are both unavailable. The mated
bodies still provide measurable bearing contact, and the articulated BREP pose
sweep is skipped at budget zero, but the rest-pose check still runs. The
mechanism remains `unverified` because joint continuity could not be certified.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/fast/restJointContinuityUnavailableDemo.test.ts
python3 docs/demos/rest-joint-continuity-925/render_demo.py
```

The test constructs the annular-bearing assembly with the local modeling API,
then stubs only `restMeshBvh` and `brepExtremaDistance` to return unavailable
measurements. It asserts that the joint warning and budget warning are emitted,
the mechanism verdict is `unverified`, and sweep coverage is skipped. The test writes
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
