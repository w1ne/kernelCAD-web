---
id: g2-bridge-and-intersection-curve
title: G2-blend adjacent spines then sweep a weld along a surface intersection
tags: [sketch, primitive, intersect]
keywords:
  - G2 blend between existing curves
  - curveBridge hermite join
  - surface intersection weld seam
  - section curve of crossing cylinders
when_to_use: You need a curvature-continuous blend between adjacent 3D curves, or the exact intersection curve of crossing faces (a weld seam, a trim spine) as a Curve3D you can sweep.
---

```typescript
const left = spline3d([
  [-24, 0, 0],
  [-12, 5, 0],
  [0, 0, 0],
]);
const right = spline3d([
  [14, 0, 0],
  [26, -5, 0],
  [38, 0, 0],
]);
const blend = curveBridge(left, right, { continuity: 'G2' });
const ribProfile = path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close();
const rib = variableSweep(blend, [
  { t: 0, profile: ribProfile },
  { t: 1, profile: path().moveTo(-1, -1).lineTo(1, -1).lineTo(1, 1).lineTo(-1, 1).close() },
]);

const run = cylinder(30, 8);
const branch = cylinder(20, 6).rotateY(90).translate(-4, 0, 15);
const seams = await surfaceIntersection(run, branch);
const hit = seams[0].pointAt(0.5);
const marker = box(3, 3, 3, true).translate(hit[0], hit[1], hit[2]);

return rib.union(run.union(branch)).union(marker);
```
