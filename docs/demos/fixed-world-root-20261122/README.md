# Explicit fixed world root

The existing `virtualJoint` declaration fixes the named base during topology
review, mate solving and geometry lowering. This fixture declares the moving
slide before the base so that a first-part assumption cannot pass the check.
It adds no MCP tool or public argument.

## Reproduce

Use Node 24 with the repository's locked dependencies:

```sh
npm ci --ignore-scripts
node scripts/build-cli.mjs
npm run build:player
node dist/cli/index.js evaluate docs/demos/fixed-world-root-20261122/model.kcad.ts --json
npx tsx docs/demos/fixed-world-root-20261122/capture-demo.mts
node dist/cli/index.js render inspect docs/demos/fixed-world-root-20261122/model.kcad.ts docs/demos/fixed-world-root-20261122/inspection --width 600 --height 450
```

The capture evaluates the source independently at 0, 5 and 15 mm travel. It
also evaluates the same source without the world joint and checks that the
existing `assembly.connectivity.assumed-root` diagnostic remains. It records
source and implementation hashes, solver positions and OCCT bounding boxes in
[verification.json](verification.json). Each declared pose holds the base at
X=20 mm. The slide's X coordinate is 20, 25 and 35 mm, respectively, with a
0.000001 mm comparison tolerance.

## Evidence

- [model.kcad.ts](model.kcad.ts): complete, editable two-body fixture.
- [capture-demo.mts](capture-demo.mts): measurement assertions and video generation.
- [demo.mp4](demo.mp4): 12 seconds, H.264, 1280×720, 20 fps.
- [verification.json](verification.json): machine-readable local results and invocation.
- `inspection/`: canonical RGB views and render manifest from the CLI.

The video uses a front projection of the measured BREP bounds. The fixture's
bodies are boxes, so those rectangles represent the actual projected geometry.
Its captions identify the local solver and OCCT build. The source is a placement
regression fixture, not a manufactured linear guide. It does not establish
load capacity, dynamics, deployed runtime behavior or hardware acceptance.

The focused verification run passed 435 tests in 38 files, including 12 new
root-selection cases and both `model()` and `solvedModel()` OCCT geometry paths.
Full type checking, targeted lint, and the unchanged complexity/cycle ratchets
also passed. The tests cover unknown children, internal parent frames, floating
and planar virtual joints, compatible multiple anchors, and incompatible mates
between fixed parts.
