---
id: loft-body-shell-from-profiles
title: Loft a stylized body shell from polyline cross-section profiles
tags: [shell, sketch, symmetry, mirror]
keywords:
  - loft a stylized body shell
  - mechanism demo shell
  - polyline loft shell
  - hull from cross sections
  - fuselage loft
  - cross-section stations
  - stylized printable shell
when_to_use: Stylized / mechanism-demo shell ONLY — recognizable printable boxy loft from polyline stations (toy car, boat hull demo, fuselage blockout). NOT for berlinetta / sports-car / organic automotive likeness. For organic car bodies use automotive-body-envelope instead (lookup_cookbook("automotive body envelope")).
---

**Scope:** stylized / mechanism-demo shell only. For berlinetta / Ferrari-class /
organic car bodies, use `automotive-body-envelope` (`lookup_cookbook("automotive
body envelope")`) — spline/rail loft or surfaceFromCurves + sew + thicken, not
this polyline loft.

Reach for this loft when you want a **boxy demo body** that changes cross-section
along an axis. Sketch a closed polyline profile for each station, loft a solid
through the stack, hollow it into a shell by opening one end-cap face, then
soften the long edges with a fillet.

Shell FIRST, fillet second. Offsetting the lofted B-spline sides of an
already-filleted body is where OCCT's thick-solid struggles: every join mode
fails and the shell falls back to a slow offset-and-subtract (~50 s). Shelling
the plain loft takes ~2 s and the fillet afterwards rounds the outer edges and
the matching inner corners in one pass.

The long edges run parallel to the loft axis (`+Z` here), so select them with
`{ parallel: [0, 0, 1] }` — after the shell that is the four outer edges and
the four inner ones. The end-cap you open for the shell is the `+Z`-facing
face, selected with `{ byNormal: 'Z' }` — a `FaceQuery`, because a lofted body
has no canonical `'top'`/`'bottom'` face for `.shell()` to resolve.

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

// 3. Hollow the body into a shell by opening the tail end-cap (the +Z-facing
//    face), then soften the long edges that run along the body axis (outer
//    edges and the inner corners of the wall).
return body
  .shell(2.5, { face: { byNormal: 'Z' } })
  .fillet(4, { parallel: [0, 0, 1] });
```

Gotchas: order the sections along the axis (station 0, 1, 2, …) — out-of-order
profiles twist the loft. Keep every profile topologically similar (same vertex
count and winding) or OCCT cannot interpolate a manifold solid. For a
left/right-symmetric body, model one half and `.mirror('yz')` rather than
lofting the full width — the mirror guarantees exact symmetry across the plane.
