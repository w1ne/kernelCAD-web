---
id: bom-ready-assembly
title: Assign material and quantity so a bill of materials can be extracted
tags: [bom, material, density, fasteners, catalog]
keywords:
  - bill of materials
  - bom extraction
  - part quantity from pattern
  - purchased vs fabricated parts
  - material density mass
when_to_use: Before calling inspect({ of 'bom' }) or export({ format 'bom-csv' | 'bom-json' }), declare material/density on assembly.part(...) so mass rows are real numbers instead of bom.material.unassigned gaps; instances placed in a loop with distinct names group into one BOM row by real quantity.
---

```typescript
const arm = assembly('bracket-set');

// A named engineering material seeds BOTH density (for BOM mass) and a
// default finish. Purchased parts (lib.fetchPart) carry their own catalog
// identity automatically — no material needed there.
for (let i = 0; i < 3; i++) {
  arm.part(`bracket_${i}`, box(20, 10, 4), {
    at: [i * 25, 0, 0],
    material: 'aluminum',
  });
}

return arm.model();
```
