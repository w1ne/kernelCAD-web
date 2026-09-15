---
id: rebuild-editable-model-from-mesh
title: Rebuild an editable model from an STL, OBJ or 3MF mesh
tags: [mesh, reverse-engineering, parameter]
keywords:
  - stl to editable model
  - scan to parametric model
  - mesh to feature tree
  - mesh_to_features
  - kernelcad reconstruct
  - reverse engineer a mesh
  - volume iou fidelity verdict
  - turned flange with bolt circle
when_to_use: >-
  You were handed an STL, OBJ or 3MF of a mostly prismatic mechanical component
  and need named params and real features, not the faceted solid lib.fromSTL
  gives you. Call mesh_to_features({ file, out }) (CLI: kernelcad reconstruct
  scan.stl -o rebuilt.kcad.ts). It measures the mesh, emits a script like the one below —
  a revolve or extruded profile, drilled and counterbored bores placed on face
  queries relative to the entry face centroid — then evaluates that script and
  compares it with the mesh. Rely on the dimensions only when fidelity.verdict
  is faithful; otherwise read unmatchedRegions and the ledger. Snapped values
  are ledger facts whose ids are the param names, so resolve_assumptions turns
  a correction straight into set_param overrides.
---

```typescript
// What mesh_to_features emits for a turned flange: params measured from the
// mesh, the revolved (radius, height) profile, then the bores. A hole's u/v
// are measured from the centroid of the face it enters, as that face exists
// at that point in the chain.
const step1Radius = param('step1Radius', 30, { min: 7.5, max: 120 });
const step1Height = param('step1Height', 8, { min: 2, max: 32 });
const step2Radius = param('step2Radius', 15, { min: 3.75, max: 60 });
const step2Height = param('step2Height', 20, { min: 5, max: 80 });
const hole1Diameter = param('hole1Diameter', 12, { min: 3, max: 48 });
const holes2Diameter = param('holes2Diameter', 6, { min: 1.5, max: 24 });

const z2 = step1Height.add(step2Height);
const body = path()
  .moveTo(0, 0)
  .lineTo(step1Radius, 0)
  .lineTo(step1Radius, step1Height)
  .lineTo(step2Radius, step1Height)
  .lineTo(step2Radius, z2)
  .lineTo(0, z2)
  .close()
  .revolve();

return body
  .hole({ byNormal: 'Z', atZ: 28 }, { u: 0, v: 0, diameter: hole1Diameter, depth: 'through', name: 'hole1' })
  .holes({ byNormal: 'Z', atZ: 8 }, {
    positions: [
      { u: 22, v: 0 },
      { u: 0, v: 22 },
      { u: -22, v: 0 },
      { u: 0, v: -22 },
    ],
    diameter: holes2Diameter,
    depth: 'through',
    name: 'holes2',
  });
```
