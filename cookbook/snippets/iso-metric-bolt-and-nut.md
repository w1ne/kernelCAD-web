---
id: iso-metric-bolt-and-nut
title: ISO metric hex fastener with helical thread
tags: [fastener, helix, sweep, hex, thread, parameter, assembly]
keywords:
  - ISO metric hex bolt M3 M4 M5 M6 M8 M10 M12
  - coarse pitch from the ISO 262 table
  - hex across-flats and head height
  - 60-degree ISO V-thread swept along an exact helix
  - hex nut with a modeled internal thread
when_to_use: >-
  You need an ISO metric hex bolt threaded into its hex nut (M3–M12) whose
  pitch, hex across-flats, and head height come from a params table. The bolt
  thread is a real 60° V profile swept with sweep(helix(...), { spine: 'helix' });
  the nut's internal thread is the thread option of its bore (pitch, modeled,
  play), seated in phase so the two parts never interfere. A cosmetic thread
  (modeled: false) keeps only the minor-diameter bore for speed.
---

```typescript
// ISO 262 coarse / ISO 4017 hex head / ISO 4032 hex nut (mm).
const ISO = {
  M3:  { d: 3,  pitch: 0.5,  af: 5.5,  head: 2.0,  nut: 2.4 },
  M4:  { d: 4,  pitch: 0.7,  af: 7.0,  head: 2.8,  nut: 3.2 },
  M5:  { d: 5,  pitch: 0.8,  af: 8.0,  head: 3.5,  nut: 4.7 },
  M6:  { d: 6,  pitch: 1.0,  af: 10.0, head: 4.0,  nut: 5.2 },
  M8:  { d: 8,  pitch: 1.25, af: 13.0, head: 5.3,  nut: 6.8 },
  M10: { d: 10, pitch: 1.5,  af: 16.0, head: 6.4,  nut: 8.4 },
  M12: { d: 12, pitch: 1.75, af: 18.0, head: 7.5,  nut: 10.8 },
};
const spec = ISO.M6;
const P = spec.pitch;
const turns = 12; // threaded length = turns * pitch
const threadClearance = param('threadClearance', 0.05); // nut thread play, mm (≤ pitch/8)

function hexPrism(af, height) {
  // Flat-to-flat = af. Vertex radius R = af / √3 for a flat-top hex.
  const r = af / Math.sqrt(3);
  let sk = path();
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 180) * (30 + 60 * i);
    const x = r * Math.cos(a);
    const y = r * Math.sin(a);
    sk = i === 0 ? sk.moveTo(x, y) : sk.lineTo(x, y);
  }
  return sk.close().extrude(height);
}

// ISO 68-1 basic profile: H = √3/2·P, minor radius d/2 − 5H/8, ridge 3P/4 wide
// at the minor radius and P/8 wide at the crest, flanks at 30°.
const H = (Math.sqrt(3) / 2) * P;
const rMinor = spec.d / 2 - (5 / 8) * H;
const halfWidth = (r) => (3 / 8) * P - (r - rMinor) * Math.tan(Math.PI / 6);

// Profile in the helix's axial plane: x = radial offset from the helix point,
// y = axial offset. The root runs 0.15·P into the core with straight sides so
// the core cylinder crosses the flanks cleanly.
const kink = -0.05 * P;
const crest = spec.d / 2 - rMinor;
const vProfile = path()
  .moveTo(-0.15 * P, -halfWidth(rMinor + kink))
  .lineTo(kink, -halfWidth(rMinor + kink))
  .lineTo(crest, -halfWidth(rMinor + crest))
  .lineTo(crest, halfWidth(rMinor + crest))
  .lineTo(kink, halfWidth(rMinor + kink))
  .lineTo(-0.15 * P, halfWidth(rMinor + kink))
  .close();

// spine: 'helix' sweeps along the exact helix by screw motion, so the 60° V
// stays a V and the solid is valid.
const thread = vProfile.sweep(helix({ radius: rMinor, pitch: P, turns }), { spine: 'helix' });
const shank = cylinder((turns + 1) * P, rMinor).union(thread);
const bolt = hexPrism(spec.af, spec.head).union(shank.translate(0, 0, spec.head));

// Internal thread: diameter is the nominal size; the hole drills the ISO minor
// diameter and cuts the matching groove. modeled: false would keep only the
// bore (a cosmetic thread) for speed.
const nut = hexPrism(spec.af, spec.nut).hole({ atZ: spec.nut, byNormal: 'Z' }, {
  u: 0,
  v: 0,
  diameter: spec.d,
  depth: 'through',
  thread: { pitch: P, modeled: true, clearance: threadClearance },
});

// The bolt's thread crosses +X at z = head + k·P; the nut's groove crosses its
// u direction (+X) at its top face. Seat the top face on a whole pitch so the
// two threads are in phase.
const nutTop = spec.head + 10 * P;
const arm = assembly('iso-metric-bolt-and-nut');
arm.part('hex-bolt', bolt, { material: 'mild-steel' });
arm.part('hex-nut', nut, { material: 'mild-steel', at: [0, 0, nutTop - spec.nut] });
return arm.model();
```
