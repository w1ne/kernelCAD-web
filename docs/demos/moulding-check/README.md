# Injection-moulding DFM check: draft, undercuts, walls, inside corners

`dfmSpec({ process: 'moulding' })` checks a part against injection-moulding
design rules on its actual geometry. This bundle runs it on three revisions of
an 80 × 50 × 25 mm enclosure base with a 2 mm wall, pulled along +Z:

| revision | source | gate | what the report measured |
| --- | --- | --- | --- |
| straight walls | `straight-walls.kcad.ts` | FAIL (exit 1) | 8 side faces at 0.00° draft, 8 sharp inside corners (radius 0, 90° turn) |
| 1.5° draft, wrong way | `wrong-draft.kcad.ts` | FAIL (exit 1) | 5534.6 mm² of undercut on 16 faces: the four inner walls and their fillets lean inward toward the opening, so the core cannot be pulled |
| 1.5° draft flaring to the opening, r1 inside fillets | `enclosure.kcad.ts` | PASS (exit 0) | draft min 1.50°, no undercut, walls 2.000–3.03 mm, no sharp corners, no diagnostics |

```sh
kernelcad dfm docs/demos/moulding-check/enclosure.kcad.ts
# MCP: verify({ check: 'dfm', file })
```

Watch the [12-second demo](demo.mp4). Each revision is coloured by its own
report: red faces are the face refs listed as `dfm.moulding.undercut`, amber
faces are listed as `dfm.moulding.draft-insufficient`, blue-grey faces pass.
The mesh is the kernel's per-face tessellation of the evaluated model. The
stills `still-*.png` come from the same renderer. `transcript.txt` is the
CLI output for the three runs and `result.json` has the per-revision numbers
(`npx tsx docs/demos/moulding-check/demo.ts` regenerates the result, stills
and video).

## What is checked

- **Draft** on every face whose normal is not parallel to the pull, against
  `minDraftDeg` (default 1°). It is measured per BREP face. Planar faces use
  the facet normal. Near the limit, curved faces use the exact surface normal,
  so a 1.5° cone reads 1.50°.
- **Undercut**: the two mould halves separate along ±pull, and each face
  releases into the half it faces. A face is an undercut where a ray toward
  that half hits the part. Overhangs shallower than 0.02 mm are ignored.
- **Thin walls** below `minWallMm`, measured with the same ray sampler as the
  `minWall` gate.
- **Thick sections** above `maxWallMm`, measured as the largest inscribed
  sphere. A voxel distance transform finds candidates, which are then
  re-measured against the exact mesh. The value is a lower bound, within about
  one voxel. This is a warning (sink / warp), not an error.
- **Sharp inside corners**: concave creases with radius 0, and concave
  cylindrical fillets below `minRadiusMm`.

A quantity the check cannot measure is reported as `dfm.moulding.unmeasured`
and is never counted as a pass. `limitations` in the report lists what the
check does not cover: parting-line construction, torus/spline fillet radii,
rib-to-wall ratio, bosses, gates and weld lines.

## Provenance

This is a local run of this repository's evaluate path on a development
machine. It is not the hosted Studio, the part was not moulded, and no
moulder reviewed it. Unit tests: `tests/unit/dfm/mouldingCheck.test.ts`.
Snippet test: `tests/integration/examples/mouldingEnclosureCookbook.test.ts`.
