# `model()` capture-time mate transforms — issue #917

[Watch the MP4 demo](./demo.mp4) · [authoring frame](./preview-author.png) · [capture Scene frame](./preview-capture-scene.png) · [lowered SceneBackend frame](./preview-lowered-scene.png)

The demo builds the included three-part assembly, reads the `Scene` returned by
`arm.model()`, and compares its part transforms with the OCCT lowerer's
`SceneBackend`. The fastened mate moves `child` by 10 mm; the connected `tip`
inherits the same motion. The visible rectangles come from actual lowered BREP
bounds in an XZ projection.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/model-scene-mate-transforms-917/capture-demo.mts
npx vitest run tests/integration/lowering/sceneAssemblyModel.test.ts --reporter=dot
```

The bundle retains the `.kcad.ts` source, capture script, invocation/settings,
verification record, MP4 and still frames. `verification.json` records each
part's capture and lowerer transforms and measured BREP bounds.

## Evidence scope

This is local CAD capture and lowerer validation. If a referenced connector
uses a topology origin, the capture-time `model()` transform remains
unresolved; the lowered scene resolves it during recompute. The demo does not
claim a physics simulation, deployed behavior or hardware acceptance.
