# RoboParty ROBOTO 01 (RP1) — parametric B-rep assembly

This gallery entry is a fully parametric kernelCAD B-rep assembly built from the
RoboParty `urdf/rp1_24dof.urdf` skeleton: 25 named links and 24 named revolute
joints across the biped legs, waist and two arms. The URDF joint names,
parent/child links, origins, axes and limits are preserved exactly. Translations
are converted from metres to millimetres and limits from radians to degrees.

All geometry is newly authored: primitive/extruded solids, booleans, fillets and
the kernelCAD `joint.clevis(...)` revolute primitive. **No STL/STEP/mesh file is
bundled or imported.** The 25 link bodies are real B-rep solids with volume and
surface area.

## Joint construction

- **15 fork joints** (hip pitch/roll, knee, ankle pitch, waist roll, shoulder
  pitch/roll, elbow) use `joint.clevis(...)` with `liftPivot: false`, so the
  URDF joint origins stay exact. Each parent carries a fork, each child a
  tongue, and a pin is drilled through both. The parent-side support pod is
  offset to the parent side of the fork so the child body swings freely through
  the full URDF range. The mate carries `capacity: { structure }` from the
  clevis so the physical realization is evaluated against the real pin/plate
  dimensions.
- **9 coaxial joints** (hip yaw, waist yaw, shoulder yaw, wrist, ankle roll) use
  a bored collar boss on the parent and a shaft + flange on the child, with a
  0.5 mm radial clearance and a 0.6 mm axial gap. The parent body is cut on the
  child side of the gap plane and the child body on the parent side before the
  collar/shaft is unioned, so the bearing faces cannot become glue surfaces.
- Every moving interface has a visible bearing gap; the waist is a two-axis
  stack (roll fork + yaw collar) with a visible gap between the pelvis and the
  torso.

## Parameters

The 24 joint-angle params are the URDF poses. In addition, the model exposes
editable body dimensions (pelvis/torso/head, hip pods, thigh/shin/arm/forearm
envelopes, shoulder/waist pods, foot and hand sizes) and joint hardware radii
(hip/knee/ankle/waist/shoulder/elbow/wrist). The joint table is the single
source of truth, so left/right links are mirrored from the URDF data. The
clevis/collar hardware uses the matching numeric defaults (the clevis primitive
requires finite style dimensions); the 0.5 mm radial and 0.6 mm axial fits are
fixed by the joint builders.

The link envelopes are deliberately slim: the URDF hip-roll range reaches ±42°,
which sweeps one leg across the other's knee hardware, and hip pitch reaches
±163°. The slim shells plus the parent-side clevis pods keep all 73
single-joint limit poses collision-free without narrowing the published limits.

Colours follow the original four-colour language: shell white, graphite,
anodized aluminium and rubber.

## Validation

```bash
npx tsx src/agent/cli/index.ts evaluate examples/gallery/roboto-01.kcad.ts
npx tsx src/agent/cli/index.ts validate examples/gallery/roboto-01.kcad.ts \
  --include-interference --no-include-physics --physical
npx tsx src/agent/cli/index.ts parts examples/gallery/roboto-01.kcad.ts
npx tsx scripts/typecheckExamples.ts examples/gallery/roboto-01.kcad.ts
npx tsx src/agent/cli/index.ts render examples/gallery/roboto-01.kcad.ts \
  --preset publish --pose 35,10 -o examples/gallery/roboto-01/hero.png
```

The validate command checks 25 parts, 24 joints and the 73 motion poses (each
joint at its limits) for BREP interference, disconnected solids and mechanical
support. It is a local CAD check, not a full robot simulation, deployed
behaviour or hardware acceptance.

## Attribution

RoboParty authored the RP1 kinematic description and hardware design. See
[NOTICE](NOTICE) for the pinned upstream commits, license and scope. The
geometry in this entry is new parametric CAD; no upstream mesh files are
redistributed.

## Demo video

`docs/demos/gallery/roboto-01/demo.mp4` was removed from this change because
the capture machine has no `ffmpeg`; it can be regenerated with
`npx tsx src/agent/cli/index.ts animate ...` once `ffmpeg` is available.
