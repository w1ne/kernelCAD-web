---
id: twisted-tapered-thin-wall-vase
title: Twisted, tapered thin-wall vase (hollow by boolean, not shell)
tags: [sweep, shell, subtract]
keywords:
  - twisted vase
  - tapered hexagonal vase
  - thin wall hollow
  - variableSweep twist per station
  - shell fails on stacked lofts
  - shellWithHistory BRepOffsetAPI_MakeThickSolid failed
  - hollow with inner offset body
when_to_use: >-
  You need a hollow, open-top vessel whose cross-section twists and tapers with
  height (a twisted hex vase, a faceted planter, a lamp shade) with an even wall.
  Build the outer body with variableSweep through per-station profiles, then
  hollow it by subtracting the same sweep built from profiles inset by the wall
  thickness — a boolean hollow that works where shell() cannot close the offset
  (curved faces that meet at sharp edges: multi-station sweeps, ruled lofts,
  unions of stacked lofts).
---

```typescript
// Twisted, tapered hexagonal vase: 180 mm tall, 90 -> 110 mm across flats,
// 2 mm wall and floor, open top.
//
// TWIST: a regular hexagon looks the same every 60°, so a 60° (or 120°, 180°)
// total twist is INVISIBLE — the top hexagon lands exactly on the bottom one.
// Pick a total that is not a multiple of 60°, or twist per station (below:
// an easing twist that ends at 40°).
const H = 180;
const wall = 2;
const bottomAF = 90;
const topAF = 110;
const twistDeg = [0, 8, 18, 28, 36, 40]; // one entry per station, bottom to top
const n = twistDeg.length;

// Flat-sided hexagon, `af` across flats, rotated `rotDeg` about Z.
function hex(af, rotDeg) {
  const R = af / Math.sqrt(3);
  let p = path();
  for (let i = 0; i < 6; i++) {
    const a = ((rotDeg + 30 + 60 * i) * Math.PI) / 180;
    const x = R * Math.cos(a);
    const y = R * Math.sin(a);
    p = i === 0 ? p.moveTo(x, y) : p.lineTo(x, y);
  }
  return p.close();
}

// Taper and twist at height fraction u in [0, 1] (linear between stations).
const acrossFlats = (u) => bottomAF + (topAF - bottomAF) * u;
function twistAt(u) {
  const x = Math.min(Math.max(u, 0), 1) * (n - 1);
  const k = Math.min(n - 2, Math.floor(x));
  return twistDeg[k] + (twistDeg[k + 1] - twistDeg[k]) * (x - k);
}

// Outer body: one station per twist entry, profiles centred on the spine.
const outer = variableSweep([[0, 0, 0], [0, 0, H]],
  twistDeg.map((tw, i) => ({ t: i / (n - 1), profile: hex(acrossFlats(i / (n - 1)), tw) })));

// Inner body: the same twist and taper at the same heights, every flat moved
// in by the wall thickness (across flats - 2·wall). It starts one wall above
// the base (the floor) and runs 1 mm past the top so the top is open.
const z0 = wall;
const z1 = H + 1;
const inner = variableSweep([[0, 0, z0], [0, 0, z1]],
  twistDeg.map((_, i) => {
    const u = (z0 + ((z1 - z0) * i) / (n - 1)) / H;
    return { t: i / (n - 1), profile: hex(acrossFlats(Math.min(u, 1)) - 2 * wall, twistAt(u)) };
  }));

// Boolean hollow. outer.shell(wall, { face: 'top' }) also works on this body
// (shell retries other join strategies when the first cannot close the
// offset between the station faces), but on a union of stacked lofts or a
// ruled loft it can still fail; the subtract does not depend on offsets.
return outer.subtract(inner);
```
