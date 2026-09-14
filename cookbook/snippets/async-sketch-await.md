---
id: async-sketch-await
title: Await sectionSketch/faceSketch/silhouette before chaining extrude
tags: [sketch, extrude]
keywords:
  - sectionSketch extrude is not a function
  - faceSketch is not a function
  - silhouette is not a function
  - await sectionSketch
  - promise sketch extrude
  - missing await
when_to_use: You called shape.sectionSketch(...), .faceSketch(...), or .silhouette(...) and chained a Sketch method (.extrude, .revolve, .sweep, .loft, .reflect) directly on the result. All three producers are async and return Promise<Sketch> — chaining without awaiting throws feature.async-result.missing-await instead of silently doing the wrong thing.
---

```typescript
// WRONG — sectionSketch() returns Promise<Sketch>; .extrude() does not exist
// on a Promise. This throws feature.async-result.missing-await, naming the
// exact fix, rather than a cryptic "extrude is not a function" TypeError:
//
//   const plate = box(60, 40, 10)
//     .hole('top', { u: -15, v: 0, diameter: 10, depth: 'through' })
//     .hole('top', { u: 15, v: 0, diameter: 8, depth: 'through' });
//   return plate.sectionSketch({ plane: 'xy', offset: 5 }).extrude(3);

// RIGHT — await the Promise<Sketch>, then chain.
const plate = box(60, 40, 10)
  .hole('top', { u: -15, v: 0, diameter: 10, depth: 'through' })
  .hole('top', { u: 15, v: 0, diameter: 8, depth: 'through' });

const section = await plate.sectionSketch({ plane: 'xy', offset: 5 });
return section.extrude(3);
```
