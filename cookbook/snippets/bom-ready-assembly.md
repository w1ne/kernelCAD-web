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
  - stock blank bar plate
when_to_use: Before calling inspect({ of 'bom' }) or export({ format 'bom-csv' | 'bom-json' }), declare material, process, and stock on asm.part(name, shape, { material, process, stock }) so mass rows are real numbers and the blank size is on the row; instances placed in a loop with distinct names group into one BOM row by real quantity.
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
    process: 'cnc',
    // Sheet plate blank, millimetres. A round bar is
    // { kind: 'bar', lengthMm: 80, diameterMm: 20 }.
    stock: { kind: 'plate', lengthMm: 20, widthMm: 10, thicknessMm: 4 },
  });
}

return arm.model();
```
