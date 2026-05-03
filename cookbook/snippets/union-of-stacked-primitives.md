---
id: union-of-stacked-primitives
title: Compose multiple primitives by translate then union
tags: [boolean, union, translate, stacking, primitive]
keywords:
  - stack two boxes
  - join multiple parts with union
  - compose primitives without overlap
when_to_use: You want to compose multiple primitives into one part by translating each into place and unioning them, without volume overlap.
---

````typescript
const lower = box(30, 30, 10);
const upper = box(20, 20, 10).translate(5, 5, 10);
return lower.union(upper);
````
