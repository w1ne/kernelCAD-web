---
id: variable-sweep-ring-band
title: Ring band with a swelling crown (variableSweep on a closed spine)
tags: [sweep, ring, subtract]
keywords:
  - finger ring
  - ring band
  - jewelry ring
  - signet crown
  - organic swept loop
  - closed spine sweep
  - spline3d closed true
  - variableSweep closed loop
  - tapering tube around a loop
  - smooth handle loop
when_to_use: >-
  You need a smooth organic loop whose thickness changes around it: a finger
  ring with a thicker crown, a loop handle, a bangle, a torus-like grip. Build a
  closed spline3d spine, sweep circular (or any closed) profiles that grow and
  shrink along it with variableSweep, then cut any functional surface — here a
  true round bore — with a boolean. On a closed spine t = 1 is the seam and
  reuses the t = 0 profile. The add_variable_sweep MCP tool authors the same
  sweep from spine_points + spine_closed + per-section radius.
---

```typescript
// Ring band, US size 7: a round 17.3 mm bore, a slim 1.4 mm wire at the palm
// swelling smoothly to a 2.6 mm crown on top.
// Plain numbers, not param(): the spine points are computed with JS math,
// which a ParamRef does not allow.
const boreD = 17.3;
const palmR = 1.4;
const crownR = 2.6;
const bandW = 2 * crownR + 1; // bore cylinder taller than the widest section

// Spine: a closed loop in the XZ plane (finger axis = Y). Its radius puts
// even the thinnest section across the bore circle, so the bore cut below
// leaves a true round hole everywhere. 16 points keep the spline round.
const R = boreD / 2 + palmR * 0.6;
const spinePts = [];
for (let i = 0; i < 16; i++) {
  const a = (i / 16) * 2 * Math.PI;
  spinePts.push([R * Math.sin(a), 0, -R * Math.cos(a)]);
}
const spine = spline3d(spinePts, { closed: true });

// t = 0 is the palm (bottom of the loop), t = 0.5 the crown (top). On a
// closed spine t = 1 is the seam and reuses the t = 0 profile.
const mid = (palmR + crownR) / 2;
const band = variableSweep(spine, [
  { t: 0, profile: path().circle(0, 0, palmR) },
  { t: 0.25, profile: path().circle(0, 0, mid) },
  { t: 0.5, profile: path().circle(0, 0, crownR) },
  { t: 0.75, profile: path().circle(0, 0, mid) },
  { t: 1, profile: path().circle(0, 0, palmR) },
]);

// True round bore: the swept tube is round in section, so its inside is not;
// cut the finger hole as a cylinder along Y.
const bore = cylinder(bandW, boreD / 2).rotateX(90).translate(0, bandW / 2, 0);
return band.subtract(bore);
```
