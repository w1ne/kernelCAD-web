---
id: adhesive-panel-mate
title: Bond two panels with a planar adhesive mate
tags: [assembly, mate, plate]
keywords:
  - adhesive glued bonded MDF wood panel joint without screws
  - partial planar face contact separate panel solids
when_to_use: >-
  Two parts are glued along a planar interface and should remain separate
  for review and export.
---

```typescript
const panels = assembly('Bonded panels');
panels.part('base', box(10, 40, 30, true))
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [10, 8, 0] } });
panels.part('panel', box(10, 40, 30, true))
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });

panels.mate('glue', 'base.seat', 'panel.seat', 'fastened', {
  adhesive: { faceA: 'right', faceB: 'left' },
});

return await panels.solvedModel({}, { validate: 'error' });
```

The connectors place the panel with an 8 mm offset along the bonded plane.
The opposing faces share 32 × 30 mm of modeled contact and the two parts stay
separate. A gap or edge-only contact fails adhesive validation. The contact
check does not measure bond strength or certify the assembly.
