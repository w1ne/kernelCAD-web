---
id: non-overlapping-l-bracket
title: Build an L-bracket as two non-overlapping plates
tags: [boolean, union, plate, bracket, stacking]
keywords:
  - L-shape from two plates
  - perpendicular plates joined at a right angle
  - L bracket without volume overlap
when_to_use: You're building two perpendicular plates joined at a right angle; both plates have the same thickness; volumes must not overlap at the joint.
---

```typescript
const t = 8;
const horiz = box(40, 30, t);
const vert = box(t, 30, 40).translate(0, 0, t);
return horiz.union(vert);
```
