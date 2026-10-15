# SG90 community reference geometry

Author: **Juan Fenoy**, as recorded in the original FreeCAD documents.
Source: [FreeCAD community parts library](https://github.com/FreeCAD/FreeCAD-library/tree/f5ca01cdcaa2f69b9295a6382719c2d90628780c/Electrical%20Parts/Servos/SG-90), pinned at `f5ca01cdcaa2f69b9295a6382719c2d90628780c` (retrieved 2026-10-15).

The upstream SG90 models are **CC-BY-SA-4.0**,
<https://creativecommons.org/licenses/by-sa/4.0/>. The original FCStd metadata
explicitly specifies this license; it is more specific than the repository's
CC-BY-3.0 default. Retain attribution and this license when sharing geometry or
adaptations. These third-party models are separate from kernelCAD's MIT code.
The editable FCStd sources stay upstream at the pinned commit.

The committed geometry is `assets/parts-seed/micro-servo/sg90-servo.step` and
`assets/parts-seed/servo-horn/sg90-horn-single-arm.step`: the genuine upstream
STEP, with coordinates translated only. `sha256.json` holds the hashes of the
upstream STEP files. The catalog records and connector sidecars carry
CC-BY-SA-4.0 and the attribution. It is not procedurally approximated geometry.

## Coordinates and interfaces (millimetres)

- Motor: source translation `(0,-16.6,0)`, bottom Z=0, shaft output +Z.
  Bounds `[-5.9,-21.3,0] .. [5.9,11.1,29.9]`.
  Main body 11.8 × 22.5 × 22.7. Ear holes diameter 2, through 2.5,
  centers `(0,-18.95,15.9)` and `(0,8.25,15.9)` at lower ear face.
  `ear-mount-low` / `ear-mount-high` normals point -Z; `shaft-output` is
  an axis connector at `(0,0,29.9)` pointing +Z, the shaft tip rather than
  an assertion about spline engagement or seating depth.
- Single arm horn: source translation
  `(-26.9697124226,-36.3361995732,-25.6721712781)`.
  Faceplate Z=0..2; socket extends to Z=5, with opening facing +Z.
  `horn-face` at Z=0 faces -Z; `spline-socket` at Z=5 faces +Z.
  Rotate the horn 180 degrees about X for a socket facing the motor.
  Seven diameter 1.4 holes have axes `(5,0)`, `(7,0)`, ... `(17,0)`;
  each named `mount-hole-5`, etc. Core hole diameter 2, recess diameter 5,
  socket diameter 6. Socket/spline teeth and actual engagement are not
  certified by these cylindrical reference surfaces.

These dimensions describe the imported community model, not a measurement of
an individual purchased servo. **Compatibility with the exact Modulshop SG90
variant, horn spline, included screws, tolerances and hardware fit is unverified.**
Use the imported bodies for design reference and check real hardware before
manufacture. Only the single arm horn is currently bundled; the upstream two
and four arm variants are not represented by this catalog entry.

## Use

After building/installing this catalog version:

```ts
const motor = await lib.standard.sg90();
const horn = await lib.standard.sg90HornSingleArm();
```

The same ids are available through `find_part` (query `SG90`) and `fetch_part`
(`sg90-servo` or `sg90-horn-single-arm`). They are in the committed seed as well
as the full generated catalog, so no remote download is needed. The hosted MCP
will gain these entries only after a normal release/deployment of this change.
See `examples/parts/sg90-reference.kcad.ts` for a local inspection assembly.
Refresh the committed normalized geometry with
`npx tsx scripts/refreshSg90Seed.ts` (downloads the pinned upstream STEP and
checks `sha256.json`). `npm run generate:parts` copies the committed seed STEP
into the full catalog.
