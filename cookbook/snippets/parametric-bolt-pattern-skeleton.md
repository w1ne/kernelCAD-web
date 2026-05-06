---
id: parametric-bolt-pattern-skeleton
title: Parametric bolt-hole skeleton
tags: [parameter, bolt, hole, subtract]
keywords:
  - parametric bolt hole with editable diameter
  - symbolic bolt diameter parameter
  - edit hole clearance after build
when_to_use: You want a compact bolt-hole part with an editable bolt-diameter parameter that can be changed later.
---

```typescript
const boltDia = param('boltDia', 5, { min: 3, max: 10 });

return box(24, 24, 10)
  .hole('top', { u: 0, v: 0, diameter: boltDia, depth: 'through', name: 'centerBolt' });
```
