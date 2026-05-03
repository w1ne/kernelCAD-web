---
id: mirror-half-part
title: Build half a symmetric part then mirror to complete it
tags: [mirror, symmetry, boolean]
keywords:
  - symmetric part
  - build half then mirror
  - reflect across a plane
when_to_use: The part is symmetric across a cardinal plane; build only one half and call mirror to produce the complete symmetric part.
---

````typescript
const half = box(20, 30, 10).translate(0, 0, 0);
return half.mirror('yz');
````
