---
id: blind-pocket-from-top
title: Blind pocket cut into one face only
tags: [subtract, pocket, plate, primitive]
keywords:
  - pocket that does not go through
  - blind hole from the top
  - partial-depth cut
when_to_use: You want a pocket cut into the top face only — the cylinder is shorter than the plate so it does not reach the bottom face.
---

```typescript
const t = 12;
const pocketDepth = 6;
const plate = box(40, 40, t);
const pocket = cylinder(pocketDepth + 1, 6).translate(20, 20, t - pocketDepth);
return plate.subtract(pocket);
```
