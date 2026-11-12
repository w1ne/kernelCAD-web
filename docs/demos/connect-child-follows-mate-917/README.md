# Connected child follows a mated parent — issue #917

[Watch the MP4 demo](./demo.mp4) · [start frame](./preview-start.png) · [90° frame](./preview-end.png)

The capture script builds the included kernelCAD assembly, lowers its BREP scene,
and reposes it through the actual mate solver. The video projects the transformed
part bounds into an XY top view. As the parent turns from 0° to 90°, the child
stays at the connected endpoint. The retained [verification record](./verification.json)
lists the measured bounds and shared connector point at both poses.

## Reproduce

From the repository root:

```sh
npx tsx docs/demos/connect-child-follows-mate-917/capture-demo.mts
```

The source model, capture script, settings, frame previews, MP4 and verification
record form the complete bundle.

## Evidence scope

This is local CAD lowerer and forward-kinematics evidence. It does not claim a
physics simulation, deployed behavior, or hardware acceptance.
