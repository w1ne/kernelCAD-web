# Geometry quality handoff

MCP `verify({ check: 'geometry-quality', file | code, ... })` now reports BREP
tiny faces and short edges with ids/locations, and sampled mirror-symmetry
planes/deviations with worst-point witnesses. An asserted plane gates `ok`.
Existing APIs and the DFM triangle BVH are reused; no dependency or UI changes.

[User guide](../../guide/geometry-quality.md) · [MP4 demo](demo.mp4) ·
[Actual request/result evidence](results.json) · [Test output](tests.txt) ·
[Video verification](video-verification.json) · [Licenses](LICENSES.md).

Reproduce from repository root (existing dependencies; no install):

```sh
npx tsx docs/demos/geometry-quality/run.ts
swift docs/demos/geometry-quality/render.swift
```

The first command dispatches the real MCP `verify` handler on the retained
`tiny-step.kcad.ts`, `symmetric-bracket.kcad.ts` and
`asymmetric-bracket.kcad.ts`. It asserts the expected gates, records source
hashes and full results, and derives readable `cards.json` excerpts. The Swift
source renders those cards and encodes H.264 using macOS AVFoundation:
1280×720, 15 fps, 300 frames, 20 seconds, no audio. It then decodes frames at
1/6/11/16 seconds and reads the encoded track dimensions, duration and frame
rate back into `video-verification.json`.

The video is a **local validation replay of actual recorded requests/results**,
not a Studio screen recording or live hardware demonstration. The tiny step
has 2 tiny faces and 8 short edges. The symmetric bracket passes x=0 mirror
symmetry; the off-axis notch fails with a 2 mm worst sampled deviation at a
0.05 mm tolerance. Face/edge ids are rebuild-scoped. Explicit degenerated
sphere pole edges are reported separately rather than as physical short-edge
defects. Candidate planes remain discovery-only unless asserted.

Visual inspection: all four decoded MP4 frames were opened. White monospace
requests and measured findings are readable on the dark background with cyan
local-replay captions; there is no clipping. The failed bracket card clearly
shows the source/reflected/closest coordinates and 2 mm versus 0.05 mm result.
The video contains textual checker evidence, not a rendered CAD acceptance
claim.

Validation includes synthetic BREP step/edge, rotated/translated symmetric
parts, asymmetric notch, healthy sphere, real face/multi-solid compounds,
threshold boundaries, malformed input, analytic closest points, global BVH
search, mesh coverage/budget, DFM regressions, verify routing, schema/fixture,
MCP bridge and skill/tool discovery checks. Application and CLI typechecks and
changed-file ESLint are also run. See `verification.json` for exact commands.

Independent review found the sphere-pole issue and verified its correction;
no blocking findings remain. Private dated comparison notes are retained in
kernelCAD-private, outside this public repository.

Distribution: commit and push only the requested feature branch. There is no
PR, merge, release tag or deployment. The guide's live public page cannot be
verified as deployed until this branch is integrated and the documented deploy
runs; that post-deployment check remains a release follow-up. Local validation,
sampled symmetry, deployed behavior and hardware acceptance are distinct.
