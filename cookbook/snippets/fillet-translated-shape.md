---
id: fillet-translated-shape
title: Fillet a face by name on a translated primitive
tags: [fillet, translate, face-ref, edge-features]
keywords:
  - round the top after moving the part
  - fillet the top face after translate
  - face name survives translate
when_to_use: You translated a primitive and now want to fillet one of its canonical faces by name (canonical face refs survive translate).
---

````typescript
return box(40, 30, 10).translate(5, 7, 0).fillet(2, { face: 'top' });
````
