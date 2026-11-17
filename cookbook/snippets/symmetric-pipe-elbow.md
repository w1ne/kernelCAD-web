---
id: symmetric-pipe-elbow
title: Centre a partial revolve on its sketch plane with a symmetric revolve
tags: [revolve, tube, symmetry, subtract]
keywords:
  - symmetric revolve
  - mid-plane revolve
  - midplane revolve
  - revolve both directions
  - pipe elbow centred on the sketch plane
when_to_use: A partial revolve (pipe elbow, arc segment, sector) must be centred on its sketch plane, for example so it mirrors about y = 0 or its end faces sit at ±angle/2; pass symmetric to Sketch.revolve instead of revolving one side and rotating by -angle/2.
example: examples/cookbook-parity/symmetric-pipe-elbow.kcad.ts
---

```typescript
// 90° elbow, Ø16 outside, Ø12 bore, 30 mm bend radius: end faces at ±45°.
const outer = path().circle(30, 0, 8).revolve({ angleDeg: 90, symmetric: true });
const bore = path().circle(30, 0, 6).revolve({ angleDeg: 94, symmetric: true });
return outer.subtract(bore);
// angleDeg is the total angle; a symmetric 360° revolve is the same as a plain one.
```
