---
id: pipe-route-swept-tube
title: Swept tube along 3D waypoints with corner bend radius
tags: [sweep, tube, route, sketch]
keywords:
  - pipe route through 3D waypoints
  - bend radius at each corner
  - swept circular tube profile
  - filleted polyline rail then Sketch.sweep
when_to_use: >-
  You need a pipe or tube that follows 3D waypoints, with a specified
  bend radius at each corner, by sweeping a circular profile along a
  rail whose sharp corners are replaced by sampled arcs of that radius.
---

```typescript
const bendR = 8;
const tubeR = 3;
// Sweep profiles live in XY, so the first rail segment must run along +Z.
// Local waypoints below map to world (0,0,0)→(50,0,0)→(50,0,40)→(50,30,40)
// after a -90° rotation about Y.
const waypoints = [
  [0, 0, 0],
  [0, 0, 50],
  [-40, 0, 50],
  [-40, 30, 50],
];

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function scale(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function len(a) { return Math.hypot(a[0], a[1], a[2]); }
function norm(a) {
  const n = len(a);
  return n < 1e-9 ? [0, 0, 0] : scale(a, 1 / n);
}

function filletedRail(pts, R, arcSamples) {
  const rail = [];
  rail.push(pts[0]);
  for (let i = 1; i < pts.length - 1; i += 1) {
    const A = pts[i - 1];
    const P = pts[i];
    const B = pts[i + 1];
    const uIn = norm(sub(P, A));
    const uOut = norm(sub(B, P));
    const alpha = Math.acos(Math.min(1, Math.max(-1, dot(uIn, uOut))));
    if (alpha < 1e-6) continue;
    const d = R / Math.tan(alpha / 2);
    const T1 = sub(P, scale(uIn, d));
    const cr = cross(uIn, uOut);
    const perp = norm(cross(cr, uIn));
    const center = add(T1, scale(perp, R));
    // Arc from T1 to T2 about `center` in the (uIn, uOut) plane.
    const v0 = sub(T1, center);
    const axis = norm(cr);
    for (let s = 0; s <= arcSamples; s += 1) {
      const t = s / arcSamples;
      const ang = alpha * t;
      const c = Math.cos(ang);
      const si = Math.sin(ang);
      const k = dot(axis, v0);
      const term = add(
        add(scale(v0, c), scale(cross(axis, v0), si)),
        scale(axis, k * (1 - c)),
      );
      rail.push(add(center, term));
    }
  }
  rail.push(pts[pts.length - 1]);
  return rail;
}

const sampled = filletedRail(waypoints, bendR, 10);
const rail = [sampled[0]];
for (let i = 1; i < sampled.length; i += 1) {
  const p = sampled[i];
  const q = rail[rail.length - 1];
  if (Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) > 1e-4) rail.push(p);
}
const profile = path().circle(0, 0, tubeR, 24);
return profile.sweep(rail, { spine: 'polyline', transitionMode: 'round' }).rotateY(-90);
```
