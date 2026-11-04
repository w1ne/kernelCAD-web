---
id: split-keep-parts
title: Keep boolean overlap and both leftovers as parts
tags: [boolean, subtract, union]
keywords:
  - shape.split keeps intersection a_only and b_only
  - split_keep_parts returns the scrap as its own solid
  - overlapping boxes become three parts
  - disjoint operands omit the empty intersection
when_to_use: >-
  A cutter must carve a pocket and also yield the overlap and the leftover
  scrap as separate solids. Use shape.split. subtract, intersect and union
  still return one Shape.
---

```typescript
// Default keep 'parts' returns a Scene. Overlapping 20 mm boxes shifted by
// 10 mm yield intersection, a_only and b_only, each 10 × 20 × 20 mm.
// A fragment at or below 1e-6 mm³ is omitted.
return box(20, 20, 20).split(box(20, 20, 20).translate(10, 0, 0));
```
