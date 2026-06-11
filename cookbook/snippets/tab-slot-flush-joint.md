---
id: tab-slot-flush-joint
title: Flat-pack tab-and-slot joint — flush tab, clearance on the slot
tags: [joinery, subtract, union, plate, pocket, parameter]
keywords:
  - tab and slot joint for laser-cut or CNC flat stock
  - through-tab flush or slightly proud of the mating face
  - slot widened by fit clearance, tab stays nominal
  - finger joint box joint plywood acrylic
  - kerf and endmill clearance for interlocking parts
when_to_use: You are joining flat stock (laser/CNC plywood, acrylic, sheet) with an interlocking tab-and-slot. The through-tab must span the full mating wall thickness — flush or slightly proud, never recessed — and the fit clearance belongs on the slot, not on the tab.
---

```typescript
// Rule 1: the through-tab spans the FULL wall thickness and stands slightly
// proud of the outer face (flush-trim after assembly) — never recessed.
// Rule 2: the fit clearance widens the SLOT; the tab stays at nominal size.
const t = 6;      // stock thickness
const tabW = 18;  // nominal tab width
// Per-side slot clearance — process-dependent: laser 0–0.1 (kerf supplies the
// rest), CNC router 0.1–0.25, mating 3D-printed parts 0.15–0.3.
const tabFit = param('tabFit', 0.15, { min: 0, max: 0.5 });
const tabProud = param('tabProud', 0.3, { min: 0, max: 1 });

// Vertical wall: outer face at x = 0, inner face at x = t.
const wall = box(t, 60, 50);

// Horizontal shelf butting the inner wall face at mid-height (z = 22).
const shelf = box(40, 60, t).translate(t, 0, 22);

// Tab at nominal cross-section (tabW × t): through the wall, proud of the
// outer face, with 1 mm overlap into the shelf so the union is unambiguous.
const tab = box(tabProud.add(t + 1), tabW, t).translate(tabProud.negate(), 21, 22);

// Slot: tab cross-section + tabFit per side, cut clean through the wall.
const slot = box(t + 2, tabFit.multiply(2).add(tabW), tabFit.multiply(2).add(t))
  .translate(-1, tabFit.negate().add(21), tabFit.negate().add(22));

return wall.subtract(slot).union(shelf.union(tab));
```
