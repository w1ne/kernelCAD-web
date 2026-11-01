---
id: injection-moulding-draft-and-walls
title: Check an injection-moulded part for draft, undercuts, wall thickness and sharp inside corners
tags: [manufacturing, draft]
keywords:
  - injection moulding design rules
  - injection molding draft angle check
  - faces need draft for ejection
  - undercut needs a side action or lifter
  - wall too thin short shot
  - thick section sink marks and warp
  - sharp internal corner stress concentration
  - dfmSpec process moulding pullDirection minDraftDeg minWallMm maxWallMm minRadiusMm
when_to_use: >-
  The part will be injection moulded (enclosure base, lid, bracket, housing)
  and you want the mould-design rules checked on the actual geometry before
  quoting a tool. Declare dfmSpec({ process: 'moulding' }) and evaluate; the
  dfm.moulding.* diagnostics name every face with less than minDraftDeg of
  draft (with its measured angle), every face that material blocks from
  releasing along the pull direction (undercut area), walls under minWallMm,
  the thickest section over maxWallMm (sink / warp), and concave corners
  sharper than minRadiusMm. Anything the check could not measure is reported
  as dfm.moulding.unmeasured, never as a pass. Full per-face report via
  verify({ check: 'dfm' }) or kernelcad dfm.
---

```typescript
// Injection-moulded enclosure base, 80 x 50 x 25 mm, 2 mm nominal wall,
// opening up (+Z is the mould pull direction, the core comes out of the top).
//
// - Straight walls fail: 8 faces with 0.00° draft and 8 sharp inside corners.
// - draft(+1.5) tapers the walls INWARD toward the opening; after shell() the
//   cavity is narrower at the top than at the floor, so the core cannot be
//   pulled: dfm.moulding.undercut on all four inner walls.
// - draft(-1.5) flares the walls outward toward the opening (both skins), and
//   a 1 mm concave fillet (half the wall) rounds the inside corners: PASS.
const draftDeg = param('draftDeg', 1.5, { min: 0.5, max: 5 });
const wall = 2;

dfmSpec({
  process: 'moulding',
  pullDirection: '+z', // mould halves separate along ±Z
  minDraftDeg: 1,      // smooth finish; add ~1° per 0.025 mm of texture depth
  minWallMm: 1.2,      // thinner walls freeze off before the cavity fills
  maxWallMm: 3.5,      // thicker sections sink and warp
  minRadiusMm: 0.5,    // inside corners tighter than this concentrate stress
});

let base = box(80, 50, 25);
for (const side of ['front', 'back', 'left', 'right']) {
  base = base.draft(draftDeg.negate(), { face: side, pullDir: [0, 0, 1] });
}
return base.shell(wall, { face: 'top' }).fillet(wall / 2, { concave: true });
```
