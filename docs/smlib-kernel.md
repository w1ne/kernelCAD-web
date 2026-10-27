# Experimental guarded SMLib kernel

OCCT remains the default. Select `kernel: 'smlib'` in `buildModel` /
`buildModelFromFile`, `evaluate_script`, or `execute_cookbook`; the CLI accepts
`--kernel smlib` where the kernel option is advertised. `HeadlessKernel` runs
raw replicad scripts and remains OCCT-only. No Studio layout changes are required.
The pinned SMLib package requires Node 22.18 or newer for Node execution.
0.6.0 keeps that engine range (`>=22.18`). kernelCAD itself stays on
`>=22.12`; selecting `kernel: 'smlib'` still needs 22.18.

```ts
await buildModel({
  code: 'export default kc.extrudePolygon([[0,0],[10,0],[10,10],[0,10]], 5).fillet(0.5);',
  fileName: '<guarded-example>',
  kernel: 'smlib',
});
```

The registry loads `@classcad/smlibwasm@0.6.0` only during an eligible opt-in
feature build. Factory creation and capability inspection do not load WASM.
Native candidates cover boxes, cylinders, spheres, straight primitive/profile
extrusions, Booleans, constant G1 fillets, `moveFaces`, `offsetFaces` and
single-solid STEP imports. `moveFaces` / `offsetFaces` are accepted only when
the OCCT reference succeeds and volume and area agree; an OCCT
`feature.face-edit.rejected` result is returned with `OCCT_REFERENCE_FAILED`.
Fillets pass `propagate: false` so 0.6's tangent-run default does not round
edges the record did not select. Supported
sketch commands are move/line, three-point arc, unconstrained spline and close.
The capability manifest includes the OCCT fallback feature set; it is not a
claim that every advertised feature has a native SMLib implementation.

Every rejected candidate returns the existing OCCT reference with a warning
`recompute.kernel.guard-fallback`, naming the guard. `SmlibLowerer.guardRecords`
retains acceptance/fallback records for direct callers. Unsupported features,
transforms, ambiguous edge correspondence, failed reference builds and kernel
exceptions also emit named fallback diagnostics. OCCT errors remain errors.

| Guard | Behavior |
| --- | --- |
| Profile crossings | AABB broad phase followed by segment crossing/touch predicates, with 1e-9 tolerance. Polygon lines are tested directly. Curves are sampled at 32 points per supported segment: screening only, not certified curve intersection. |
| OCCT reference | Native volume **and area**, and the final interchange result, must agree within 0.1% relative / 1e-5 absolute. Nonfinite/nonpositive measures reject. |
| STEP import invariant | Compare normalized OCCT producer volume/area to SMLib post-import measures at 1e-5 relative / 1e-5 absolute. Kept on 0.6.0. GT2 direct import now preserves its volume; an smlib torus face round-trips. The old OCCT single-face collapse is not shown gone, so the check stays. |
| Cut no-op | Independently computed OCCT material-intersection volume certifies positive overlap; an unchanged SMLib cut then rejects. AABB overlap never certifies this guard. |
| STEP normalization | Every SMLib STEP input is first exported by OCCT, including original imported files. Raw producer bytes never reach the guarded reader. |

The 0.3.1 published importer does not expose pre-seam geometry. The import
invariant is a conservative **whole-import** check against the producer, not an internal
pre/post seam-repair measurement; it cannot attribute drift exclusively to
repair. Only closed solids are accepted; sheet imports fall back. Strict
import tolerance can reject otherwise usable inputs. Small absolute thresholds
are guard limits, not manufacturing tolerances.

Accepted candidates are STEP-imported back into OCCT-compatible ShapeBackend
objects so downstream synchronous operations and exporters keep working. STEP
reconstruction loses native history; ambiguous selectors fall back, and full
face-lineage equivalence is not promised. Primitive canonical names are
re-seeded on the returned solid; candidates carrying non-primitive lineage
fall back with `NAMING_HISTORY` so the OCCT reference retains that lineage.
Smooth profiles may differ between
interpolators; curve sampling does not prove absence of crossings. Measurements
do not prove geometric equivalence, topology quality, placement, or continuity.

Full OCCT reference construction, measurements and two-way STEP interchange add
cost. This initial safety path has **no claimed performance advantage**. Native
core patches remain untested in this integration and are not shipped. CI runs
recorded guard regressions plus small live unpatched WASM controls. Local
validation does not establish deployed behavior or hardware acceptance.

Dependency notices and license texts are retained in [ATTRIBUTION.md](../ATTRIBUTION.md),
[NOTICE](../NOTICE) and [licenses/smlibwasm](../licenses/smlibwasm/).

## ClassCAD validation

On 0.3.1, direct Node `fromStep` of the full GT2 STEP repro returned
1613.939256648 mm³ with 49 faces on Node 22.23.2. The isolated torus-face STEP
collapsed from 23.777406229 mm² to 6.57e-11 mm² during seam repair. Bow-tie and
1200-point self-intersecting profile cuts returned unchanged, valid target
solids.

Re-checked on 0.6.0, Node 22.23.2, this machine:

- GT2 `fromStep` of `tests/fixtures/smlib/gt2-raw.step` returns
  1613.939256648 mm³ and 49 faces. The 0.3.1 volume is preserved. The import
  invariant stays, as a check against drift, not because this file still loses volume.
- The bow-tie cut no longer returns the uncut solid. 0.6 throws
  `ModelingError` ("the kernel returned a result that is the part given back
  uncut"). The profile self-intersection guard and `cutNoOp` stay, for a
  candidate that still comes back unchanged.
- An smlib torus face written with `toStep` and read with `fromStep` keeps its
  area (631.654681670 mm² both ways). The 0.3.1 OCCT-exported single-face
  collapse (23.777 mm² to ~0) was not reproduced here; the import invariant
  stays until that file is shown to survive seam repair.

The profile guard and the certified cut no-op stay enabled.
These are local Node repro results, not deployed or hardware acceptance. See the
[capture notes and sources](demos/smlib-guarded/README.md); bulky visual and
machine-readable evidence is kept out of the repo at
`/Volumes/LabWired/gb/smlib-evidence/docs/demos/smlib-guarded/`.
