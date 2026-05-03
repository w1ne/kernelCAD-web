---
id: chamfer-rotated-face
title: Chamfer a canonical face after the part is rotated
tags: [chamfer, rotate, face-ref, edge-features]
keywords:
  - bevel the top edge after rotate
  - chamfer after rotation
  - face name survives rotate
when_to_use: You rotated a primitive and now want to chamfer one of its canonical faces by name (face-name semantics survive transforms).
---

````typescript
return box(40, 30, 20).rotate([1, 0, 0], 30).chamfer(1.5, { face: 'top' });
````
