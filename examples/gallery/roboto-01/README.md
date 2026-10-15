# RoboParty ROBOTO 01 (RP1) — 24-DoF kinematic scaffold

This kernelCAD assembly follows RoboParty's official `rp1_24dof.urdf`: 25
named links and 24 revolute joints across the biped legs, waist and two arms.
Joint origins are converted from metres to millimetres; URDF axes are preserved
and limits are converted from radians to degrees. Every joint has an editable
parameter bounded by the published URDF limits.

## Source and licensing

- Description source: [RP1_description](https://github.com/Roboparty/RP1_description),
  `urdf/rp1_24dof.urdf`, pinned at commit `84529a5`.
- Hardware attribution: RoboParty [RP1_hardware](https://github.com/Roboparty/rp1_hardware),
  licensed under CERN-OHL-W-2.0.
- Project hub: [ROBOTO 01](https://roboparty.com/documents/roboto-01).

`RP1_description` has no license file at the pinned revision. Its URDF-linked
STLs are not redistributed here. kernelCAD `lib.fromSTL` reads local paths, not
raw GitHub URLs. Until mesh redistribution terms are clarified, the current
viewport uses small joint datum markers only; those markers are not RP1 mesh
geometry and do not represent or validate the robot's physical body, fit, or
behavior. The source marks where licensed local `lib.fromSTL(...).scale(1000)`
imports can replace the markers later. Hardware license attribution does not
imply that the separately hosted description meshes share that license.

## Run

```bash
npx tsx src/agent/cli/index.ts evaluate examples/gallery/roboto-01.kcad.ts
npx tsx src/agent/cli/index.ts validate examples/gallery/roboto-01.kcad.ts --no-include-physics
npx tsx src/agent/cli/index.ts render examples/gallery/roboto-01.kcad.ts --pose 30,18 -o /tmp/roboto-01.png
```

An evaluation or replay validates only this local kinematic CAD scaffold. It is
not a full robot simulation, deployed behavior, or hardware acceptance.
