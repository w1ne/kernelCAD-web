---
id: offline-cost-estimate
title: Ask for an offline print, CNC, or sheet cost estimate
tags: [manufacturing, assembly]
keywords:
  - offline cost estimate before choosing a process
  - compare 3d-print cnc and sheet-cut
  - declared stock blank changes the CNC material volume
  - USD heuristic not a supplier quote
  - estimate_cost material setup cycle
when_to_use: >-
  You have a fabricated part or assembly and want a labelled cost comparison
  before picking 3d-print, cnc, or sheet-cut. Declare material, process, and
  stock on assembly.part when you know them, then call the MCP tool
  estimate_cost. Omit process to compare all three. The numbers are offline
  heuristics (material + setup + cycle), not a supplier quote. Purchased
  catalog parts are skipped.
---

```typescript
// Shaft turned from a declared bar. estimate_cost({ file, process: 'cnc' })
// prices the bar volume, not the finished cylinder. Omit process to compare
// 3d-print, cnc, and sheet-cut. The reply is a USD estimate, not a quote.
const arm = assembly('shaft-job');
arm.part('shaft', cylinder(80, 5), {
  material: 'aluminum-6061',
  process: 'cnc',
  stock: { kind: 'bar', lengthMm: 90, diameterMm: 12 },
});
return arm.model();
```
