---
id: repair-shell-too-thick
title: Repair a shell thicker than half the solid
tags: [shell]
keywords:
  - feature.kernel-failed shell
  - shell thickness too large
  - hollow wall exceeds half bbox
  - repair_script shell
  - explicit hollow
when_to_use: evaluate_script reported feature.kernel-failed on a .shell() whose wall cannot be closed, and you need to stop retrying shell() and author an explicit hollow instead.
---

OCCT cannot close the wall offset for this body. Do not retry `.shell()` on the
same body with a thinner wall: compare the requested wall with the thinnest
local feature while redesigning the cavity. For an enclosure with cutouts, author
the cavity explicitly: build an inset inner solid, then subtract it from the
outer solid. For an origin-based box, use
`outer.subtract(inner.translate(wall, wall, wall))` and extend the inner cavity
through the intended opening; model cutouts in the cavity or outer body as
needed.

The snippet below is the explicit-hollow replacement for the old
`box(10, 10, 10).shell(8, { face: 'top' })` fixture.

```typescript
const wall = 4;
const outer = box(10, 10, 10);
const inner = box(10 - 2 * wall, 10 - 2 * wall, 10 - wall).translate(wall, wall, wall);
return outer.subtract(inner);
```
