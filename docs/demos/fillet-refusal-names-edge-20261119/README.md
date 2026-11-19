# Fillet and chamfer refusals name the failing edge

Watch the [15-second MP4](demo.mp4). It shows three refusals captured on the
drafting-review mounting plate: an oversized chamfer on one named top edge, an
oversized fillet on a different top edge, and a corner fillet where the
selected edges limit each other.

A refused constant fillet or chamfer now carries the failing edge as a stable
`@kc[<base>/edge/s…]` selector in `refuse.location.edge` and
`details.failingEdgeRef`, with a locator and the largest size the same-edge
kernel probe built. A retry at that size on that selector builds.

## Reproduce

From the repository root:

```sh
npx vitest run tests/integration/examples/filletRefusalNamesEdge1588.test.ts \
  src/modeling/backends/occt/lowerers/limitingEdges.test.ts --reporter=dot
python3 docs/demos/fillet-refusal-names-edge-20261119/capture_demo.py
python3 docs/demos/fillet-refusal-names-edge-20261119/inspect_demo.py
```

`capture_demo.py` evaluates the seeded plate scripts and writes the refusals
it receives to [refusals.json](verification/refusals.json). Every value on the
slides is read from that file. This is local OCCT validation and test
evidence, not a deployed-runtime claim. See the
[verification record](verification/verification.txt) and the
[video inspection contact sheet](verification/video-contact-sheet.png).
