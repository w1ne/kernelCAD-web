---
id: engineering-material-presets-mass
title: Named engineering material presets driving mass
tags: [material, mass, density, assembly]
keywords:
  - mild-steel density driving mass
  - aluminum-6061 mass properties and finish
  - nylon pla petg abs material grades
  - fr4 pcb stainless-304 copper brass tpu silicone materials
  - polycarbonate delrin acrylic material grades
  - same material name for mass FEA and finish
  - named engineering material presets
when_to_use: >-
  You want engineering material presets by grade name (mild-steel,
  aluminum-6061, stainless-304, copper, brass, fr4, tpu-95a, silicone,
  polycarbonate, delrin, acrylic, pla, petg, abs, asa, nylon) to drive the
  mass, default finish and recorded material of identical geometry. One
  registry serves arm.part({ material }), inspect({ of: 'mass', material }),
  feaStudy({ material }) and .finish(), so the grade name works everywhere;
  steel / aluminum / stainless / fr-4 / tpu / pc / pom / pmma / pet are
  aliases for the same grades.
---

```typescript
// One vocabulary: each grade seeds the part's density (mass / inertia), its
// default finish, and the material name the part records; feaStudy({ material })
// takes the same spelling. Aliases (steel, aluminum, stainless, fr-4, tpu, pc,
// pom, pmma, pet) resolve to these grades, and an unknown name fails listing
// the accepted ones.
const arm = assembly('engineering-material-presets-mass');
arm.part('mild-steel-cube', box(20, 20, 20), { material: 'mild-steel', at: [0, 0, 0] });
arm.part('aluminum-6061-cube', box(20, 20, 20), { material: 'aluminum-6061', at: [40, 0, 0] });
arm.part('nylon-cube', box(20, 20, 20), { material: 'nylon', at: [80, 0, 0] });
// Hardware and electronics grades an enclosure assembly declares.
arm.part('fr4-pcb', box(20, 20, 1.6), { material: 'fr4', at: [0, 40, 0] });
arm.part('stainless-screw', cylinder(8, 1.5), { material: 'stainless-304', at: [40, 40, 0] });
return arm.model();
```
