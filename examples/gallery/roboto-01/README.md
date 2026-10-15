# RoboParty ROBOTO 01 (RP1) — 24-DoF kinematic assembly

This kernelCAD assembly follows RoboParty's `urdf/rp1_24dof.urdf`: 25 named
links and 24 revolute joints across the biped legs, waist and two arms. The 25
URDF-referenced visual STLs are bundled in `meshes/` as quadric-decimated
derivatives capped at 2,500 faces per link; each import is below the 50 MB
per-import limit (about 3 MB total). `MESH-SOURCES.txt` records source and
bundled hashes, and `tools/decimate_meshes.py` reproduces the conversion. URDF visual origins are identity, and
each link mesh is placed at its accumulated URDF link frame. The source STLs
sew as open shells, so imports explicitly allow open meshes for visualization;
volume and boolean behavior are therefore not asserted. Joint translations
are converted from metres to millimetres, axes are preserved, and radians are
converted to degrees. Joint pose parameters default to zero and remain editable
within the published limits.

Per Andrii's decision, the RoboParty hardware visuals are attributed to
RoboParty and covered by CERN-OHL-W-2.0, following the `rp1_hardware` source.
See [NOTICE](NOTICE) for the pinned description commit, source links, license
text and scope. No Parasolid, SLDASM or STEP archives are included.

## Run

```bash
npx tsx src/agent/cli/index.ts evaluate examples/gallery/roboto-01.kcad.ts
npx tsx src/agent/cli/index.ts validate examples/gallery/roboto-01.kcad.ts --no-include-physics
npx tsx src/agent/cli/index.ts render examples/gallery/roboto-01.kcad.ts --pose 30,18 -o examples/gallery/roboto-01/hero.png
```

Evaluation and rendering establish local model behavior only. They are not a
full robot simulation, deployed behavior, or hardware acceptance.
