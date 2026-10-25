# RoboParty ROBOTO 01 (RP1) — 24-DoF kinematic assembly

This kernelCAD assembly follows RoboParty's `urdf/rp1_24dof.urdf`: 25 named
links and 24 revolute joints across the biped legs, waist and two arms. The 25 URDF-referenced visual STLs are bundled in `meshes/` as byte-for-byte
copies of the full-detail upstream files. Each of the 25 imported files is below the 50 MiB per-import limit
(`IMPORT_MAX_BYTES`); they total 65,154,800 bytes (62.1 MiB). The upstream
mesh directory has 31 files totaling 82,935,004 bytes (79.1 MiB). `MESH-SOURCES.txt` records source and bundled hashes. URDF visual
origins are identity, and
each link mesh is placed at its accumulated URDF link frame. The meshes are
imported with `lib.meshFromSTL` as display-only bodies (indexed triangles, no BRep topology),
so volume, booleans and mass properties are not available for them. Joint translations
are converted from metres to millimetres, axes are preserved, and radians are
converted to degrees. Joint pose parameters default to zero and remain editable
within the published limits.

## Exact-surface reimport

This entry is an exact-surface reimport, not a from-scratch reconstruction.
Every link body is the original upstream STL, unchanged. `verify-identity.mjs`
checks each part against the pinned `MESH-SOURCES.txt` manifest and against the
model source:

- the bundled file hash and byte count match the pinned upstream mesh;
- the model loads that exact `roboto-01/meshes/<link>.STL` file;
- the only operations applied to a loaded body are the metre→millimetre
  `.scale(1000)` and the PBR `.material(...)` finish.

```bash
node examples/gallery/roboto-01/verify-identity.mjs
```

The expected result is `25/25 parts are byte-identical to the pinned upstream meshes`.

Two finish-only adjustments keep the supplied visual shells readable:

- `base_link` is painted anodized light grey. Its mesh contains the waist joint
  cover, an open multi-shell surface; rendering it white made the hollow
  interior read as a blown-out "glue" patch between the torso and hips.
- all bodies use a matte PBR finish (metalness 0.05, roughness 0.75) instead of
  a glossy one, which suppresses coplanar-surface speckle on the dark shells.

Neither change touches the geometry. The upstream visual meshes are open,
multi-shell display geometry (for example `waist_yaw_link.STL` has ~41k open
boundary edges and `base_link.STL` has non-manifold overlapping faces), so
they are intentionally not converted into watertight BRep solids. A true
solids/booleans model would need RoboParty's original per-link CAD assembly
rather than these visual STLs.

Per Andrii's decision, the RoboParty hardware visuals are attributed to
RoboParty and covered by CERN-OHL-W-2.0, following the `rp1_hardware` source.
See [NOTICE](NOTICE) for the pinned description commit, source links, license
text and scope. No Parasolid, SLDASM or STEP archives are included.

## Run

```bash
node examples/gallery/roboto-01/verify-identity.mjs
npx tsx src/agent/cli/index.ts evaluate examples/gallery/roboto-01.kcad.ts
npx tsx src/agent/cli/index.ts validate examples/gallery/roboto-01.kcad.ts --no-include-physics
npx tsx src/agent/cli/index.ts render examples/gallery/roboto-01.kcad.ts --pose 30,18 -o examples/gallery/roboto-01/hero.png
```

Evaluation and rendering establish local model behavior only. They are not a
full robot simulation, deployed behavior, or hardware acceptance. Because the
link bodies are display meshes, `validate --include-interference` is a kinematic
mate/pose check, not a BRep common-volume clash check.
