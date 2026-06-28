---
id: loft-body-shell-from-profiles
title: Loft a closed body shell from cross-section profiles at stations
tags: [shell, sketch, symmetry, mirror]
keywords:
  - loft a body shell
  - car body shell
  - vehicle body
  - organic shell from profiles
  - hull from cross sections
  - fuselage loft
  - cross-section stations
  - freeform solid body
when_to_use: You need a recognizable, printable stylized solid body (car body, boat hull, fuselage, casing) that primitives can't express. Define cross-section profiles at stations along an axis, loft a solid through them, then shell + fillet. This is NURBS surfacing for organic bodies — not a polygon sculpt and not a photoreal render.
---

Reach for a loft when the form is a body that changes cross-section along an
axis — a car body, a hull, a fuselage, an instrument casing. Sketch a closed
profile for each station, loft a solid through the stack, soften the long edges
with a fillet, then hollow it into a shell by opening one end-cap face.

The four long edges run parallel to the loft axis (`+Z` here), so select them
with `{ parallel: [0, 0, 1] }`. The end-cap you open for the shell is the
`+Z`-facing face, selected with `{ byNormal: 'Z' }` — a `FaceQuery`, because a
lofted body has no canonical `'top'`/`'bottom'` face for `.shell()` to resolve.

```typescript
// 1. Cross-section profiles at stations along the +Z axis (nose -> mid -> tail).
//    Same point order + winding on every section so the loft stays manifold.
const section = (w: number, h: number) =>
  path()
    .moveTo(-w / 2, -h / 2)
    .lineTo(w / 2, -h / 2)
    .lineTo(w / 2, h / 2)
    .lineTo(-w / 2, h / 2)
    .close();

const nose = section(20, 14);   // station at z = 0
const mid = section(46, 30);    // station at z = 55
const tail = section(30, 20);   // station at z = 110

// 2. Loft a solid through the stations; spacing z-stacks them axially.
//    spacing takes a plain number (mm) — not a param() ref.
const body = nose.loft([mid, tail], { spacing: 55 });

// 3. Soften the four long edges that run along the body axis, then hollow the
//    body into a shell by opening the tail end-cap (the +Z-facing face).
return body
  .fillet(4, { parallel: [0, 0, 1] })
  .shell(2.5, { face: { byNormal: 'Z' } });
```

Gotchas: order the sections along the axis (station 0, 1, 2, …) — out-of-order
profiles twist the loft. Keep every profile topologically similar (same vertex
count and winding) or OCCT cannot interpolate a manifold solid. For a
left/right-symmetric body, model one half and `.mirror('yz')` rather than
lofting the full width — the mirror guarantees exact symmetry across the plane.
