# Unfinished assembly return demo

This local demo shows the authoring repair for [issue #1799](https://github.com/w1ne/kernelCAD-web/issues/1799). An unfinished assembly or fluent part reference now gets an actionable error. Appending `.model()` to the official color-enclosure example produces a named Scene with two emitted part meshes and bounds of 60 × 40 × 21 mm.

The [8-second MP4](demo.mp4) shows the diagnostic and corrected result. The [poster](poster.png), [capture source](capture-demo.mts), [intentional failure fixture](unfinished-assembly.kcad.ts), [settings](settings.json), [verification evidence](verification.json), and emitted [GLB](enclosure.glb) are retained with the bundle. The corrected source is [color-enclosure.kcad.ts](../../../examples/params/color-enclosure.kcad.ts).

## Reproduce

From the repository root, with dependencies and FFmpeg installed:

```sh
npx tsx docs/demos/unfinished-assembly-return/capture-demo.mts
npx vitest run src/modeling/runtime/runScript.test.ts src/modeling/arrayReturnBuild.test.ts
```

The MP4's geometry is a software render of triangles parsed from the locally exported GLB. This is local source, mesh, and export verification; it does not claim hosted Studio/MCP deployment, simulation, or hardware acceptance.
