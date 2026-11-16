---
id: open-ended-duct-sleeve
title: Shell a solid open on several faces
tags: [shell]
keywords:
  - multi-face shell
  - shell remove multiple faces
  - open-ended sleeve
  - hollow duct open both ends
  - thin-wall channel
when_to_use: A hollow part must be open on more than one face, such as a sleeve, duct or channel; pass an array of faces to one shell() instead of shelling and then cutting the far face away.
example: examples/cookbook-parity/open-ended-duct-sleeve.kcad.ts
---

```typescript
const block = box(40, 30, 20);
// 2 mm wall, open at the top and the bottom: a 36 × 26 mm bore.
return block.shell(2, { face: ['top', 'bottom'] });
// Corner channel: .shell(2, { face: ['top', 'front'] })
```
