---
id: fea-study-safety-factor-gate
title: Check a design against a load with FEA and gate on the safety factor
tags: [fea, stress, load]
keywords:
  - will this hold the load
  - stress analysis
  - FEA
  - finite element
  - von Mises
  - safety factor
  - yield strength
  - deflection
  - how strong is this design
  - is this wall thickness enough
  - structural check
when_to_use: >-
  The design has to carry a real load and you need evidence, not a guess:
  peak von Mises stress, peak displacement, and a safety factor against the
  material's yield. Declare the study on the shape with
  shape.feaStudy({ material, fixed, loads, meshSize?, minSafetyFactor? }) —
  `fixed` and `loads[].faces` take the same FaceQuery / @kc[...] selectors as
  the rest of the API, and `force` is the TOTAL newtons on those faces.
  Declaring minSafetyFactor makes it an enforcement gate: evaluate_script
  fails with fea.safety-factor.below-min and names the governing region. Then
  run run_fea for the full summary, per-region hot spots and heatmap PNGs.
  Needs the external CalculiX + gmsh toolchain; check with fea_summary({}).
  Use this instead of verify({ check: 'load-capacity' }) when the geometry is
  not a plain cantilever beam or when you need to know WHERE it is overloaded.
---

```typescript
const wall = param('wall', 8, { min: 3, max: 20 });

// L-bracket: wall leg bolts to the wall, shelf leg carries the load.
const bracket = box(wall, 40, 90)
  .union(box(90, 40, wall))
  .fillet(4, { parallel: [0, 1, 0], concave: true });

bracket.feaStudy({
  name: 'shelf-load',
  material: 'aluminum-6061',              // or mild-steel / pla / petg / abs / nylon
  fixed: { atX: 0 },                      // held rigid: the wall face
  loads: [{ faces: { atZ: wall }, force: [0, 0, -400] }],  // 400 N TOTAL, downward
  meshSize: 4,
  // minSafetyFactor: 2,  // uncomment to make evaluate SOLVE and FAIL below SF 2
});

// Report-only as written: evaluate stays fast and needs no solver. Get the
// evidence with the run_fea MCP tool:
//   run_fea({ file: 'bracket.kcad.ts', output_dir: '/tmp/bracket-fea' })
//   -> run_fea refines the mesh itself: summary.refinement.passes
//      4 mm 42.5 MPa, 2.62 mm 46.3 MPa, 1.91 mm 49.7 MPa (stoppedBy 'max-passes'),
//      so summary.minSafetyFactor ~5.4, maxVonMisesMPa ~49.7 (the finest pass),
//      hotSpots[0].region = the root fillet face, plus heatmap PNGs.
// Read summary.trust first: meshTrusted false means the STRESS number is
// still mesh-limited (here it climbs ~7 % per step); keep a margin or continue
// with run_fea({ mesh_size: 1.9 }).
return bracket;
```
