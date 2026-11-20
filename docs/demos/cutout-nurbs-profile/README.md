# Cut a pocket or hole with a spline or ellipse profile

[demo.mp4](./demo.mp4) shows an instrument enclosure lid,
[`instrument-lid.kcad.ts`](./instrument-lid.kcad.ts): 120 × 80 × 6 mm, with
an elliptical display window (60 × 30 mm, through) and a spline-bounded thumb
recess (2.5 mm deep) at the front edge. Both are `cutout()` features on the
top face.

- The window removes 8482.300 mm³; the closed form π·30·15·6 is
  8482.300 mm³ (0.05 parts in 1 000 000 low).
- The lid volume, 48617.135206 mm³, and its 13 faces are the same as the lid
  built by hand: the box minus the two profiles extruded and moved to the
  top-face frame. The solid is a valid B-rep.
- The window has 4 `wall` created refs (one per quarter ellipse) and the
  recess has 2 (the flat back and the spline).

Before this change (develop `0f6b97032`) both cutouts failed with
`feature.kernel-failed`: `cutout prism construction failed:
drawingFromCommands: unsupported segment kind 'nurbsSegment'` (`'spline'` for
the recess). The author had to extrude the profile and subtract it at the
face position by hand.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/cutout-nurbs-profile/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/cutout-nurbs-profile/make-video.mts`
  (ffmpeg on `PATH`)
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings, render invocations and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/cutoutNurbsProfile.test.ts`

The capture fails unless: the lid is a valid B-rep with no error diagnostic;
its volume equals the explicit-boolean lid within 1 part in 1 000 000 000 and
the face counts are equal; the window alone removes π·rx·ry·t within 1 part
in 1 000 000; and the wall created refs are 4 and 2.

The three solid views (`lid-front.png`, `lid-back.png`, `lid-top.png`) are
`kernelcad render` output from the built CLI.

## Behavior

`Shape.cutout(profile, opts)` accepts a profile with `spline`, `ellipse`,
`ellipseArc`, `hermiteG2` or `nurbsSegment` segments, mixed with lines and
arcs. The profile is built flat by the same NURBS lowerer that `extrude`
uses, then moved onto the entry face with the face frame that polyline
profiles use. The side faces swept by these segments are
`EXTRUSION_SURFACE` faces and get the `wall` created ref.

## Limits

- This is local API evaluation, a local CLI render and OCCT measurement. No
  other CAD system opened the model, no lid was made, and the demo shows no
  deployed behavior.
- A blind cutout overshoots its depth by 0.01 mm, for every profile. The
  recess floor is at z = 3.49 mm, not 3.5 mm. Because of this the floor does
  not get the `floor` created ref. This change does not alter that.
- OCCT volume of a solid with B-spline faces after a boolean differs from the
  tool volume by up to about 1 part in 600 for the mixed test profile, so the
  tests compare with the explicit boolean, not with the extruded tool.
