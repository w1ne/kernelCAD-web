---
id: engineering-material-presets-mass
title: Named engineering material presets driving mass
tags: [material, mass, density, assembly]
keywords:
  - mild-steel density driving mass
  - aluminum-6061 mass properties
  - pla mass from the catalog
  - named engineering material presets
when_to_use: >-
  You want engineering material presets by name (mild-steel, aluminum-6061,
  pla) to drive mass of identical geometry. kernelCAD's mass catalog spells
  those grades steel / aluminum / pla; map the engineering name onto the
  catalog key so inspect({ of: 'mass', material }) and arm.part({ material })
  both see a real density (7850 / 2700 / 1240 kg/m³).
---

```typescript
// Engineering grade → mass-catalog key. FEA grades use the left-hand
// names; arm.part({ material }) and inspect({ of: 'mass', material })
// accept the catalog spelling on the right.
const PRESETS = {
  'mild-steel': 'steel',
  'aluminum-6061': 'aluminum',
  'pla': 'pla',
};

const arm = assembly('engineering-material-presets-mass');
arm.part('mild-steel-cube', box(20, 20, 20), { material: PRESETS['mild-steel'], at: [0, 0, 0] });
arm.part('aluminum-6061-cube', box(20, 20, 20), { material: PRESETS['aluminum-6061'], at: [40, 0, 0] });
arm.part('pla-cube', box(20, 20, 20), { material: PRESETS['pla'], at: [80, 0, 0] });
return arm.model();
```
