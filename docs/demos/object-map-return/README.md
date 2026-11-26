# Object-map return demo

This local demo shows the object-map return repair for [issue #1799](https://github.com/w1ne/kernelCAD-web/issues/1799). Before the fix, `return { motor_plate: plate, drive_pinion: pinion }` fell back to the last captured feature: `evaluate_script` reported `ok: true` with one 1131 mm³ body (12 × 12 × 10 mm), and the plate was missing. The map now lowers to a named Scene, one part per key, the same way an array return does. A map that mixes Shapes with non-Shape values is rejected with `feature.invalid-args`.

The [8-second MP4](demo.mp4) shows the before state, the mixed-map diagnostic, and the corrected result: parts `motor_plate` (4800 mm³) and `drive_pinion` (1131 mm³), bounds 40 × 30 × 14 mm. The [poster](poster.png), [capture source](capture-demo.mts), [model source](drive-plate.kcad.ts), [settings](settings.json), [verification evidence](verification.json), and emitted [GLB](drive-plate.glb) are retained with the bundle.

## Reproduce

From the repository root, with dependencies and FFmpeg installed:

```sh
npx tsx docs/demos/object-map-return/capture-demo.mts
npx vitest run src/modeling/arrayReturnBuild.test.ts
```

The MP4's geometry is a software render of triangles parsed from the locally exported GLB. The before values come from a local `evaluate_script` probe on develop `f7231d509`. This is local source, mesh, and export verification; it does not claim hosted Studio/MCP deployment, simulation, or hardware acceptance.
