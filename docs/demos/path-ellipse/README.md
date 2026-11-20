# Draw an exact ellipse or elliptical arc in a sketch path

[demo.mp4](./demo.mp4) shows two parts.

[`elliptical-head.kcad.ts`](./elliptical-head.kcad.ts) is a 2:1
semi-elliptical vessel head: 200 mm outside diameter, 50 mm dish, 4 mm wall
and a 20 mm straight flange. The outside and the inside of the dish are two
`ellipseArc` quarter arcs; the profile is revolved about the vessel axis.

- Volume: 208568.242 mm³, equal to the closed form (1 part in 1 000 000
  allowed). The solid is a valid B-rep with 5 faces.

[`handhole-gasket.kcad.ts`](./handhole-gasket.kcad.ts) is an elliptical
handhole gasket: 190 × 140 mm outside, 15 mm land, 3 mm thick, turned 30°.
The blank and the opening are two `path().ellipse(...)` profiles.

- Volume: 21205.745 mm³; the closed form is 21205.750 mm³ (0.3 parts in
  1 000 000 low after the boolean). The solid is a valid B-rep.
- Mesh bounding box: 178.814 × 154.027 mm; the closed form for the turned
  ellipse is 178.816 × 154.029 mm.

Before this change (develop `9149fe5df`) a path had no ellipse call:
`path().ellipse(...)` threw `TypeError: path(...).ellipse is not a function`.
The author wrote rational NURBS control points and weights by hand, or used a
polyline.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/path-ellipse/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/path-ellipse/make-video.mts`
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings, render invocations and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/pathEllipse.test.ts`

The capture runs both scripts, then fails unless: each solid is a valid B-rep
with no error diagnostic; each volume equals its closed form within 1 part in
1 000 000; the head is 200 × 200 × 70 mm and the gasket has the closed-form
box of a turned ellipse (0.05 mm allowed, because the box comes from the
mesh); and the head profile holds exactly two `nurbsSegment` commands.

The closed forms do not come from the kernel: half a spheroid is
(2/3)·π·R²·h, a ring is π·(R² − r²)·s and an ellipse is π·rx·ry.

In the video, the 2D outlines are drawn from the sketch commands in
`evidence.json`. The three solid views (`head-outside.png`,
`head-section.png`, `gasket.png`) are `kernelcad render` output from the built
CLI; `video-evidence.json` holds the three invocations. The section view has
no filled cut face.

## Behavior

`path().ellipse(cx, cy, rx, ry, { rotationDeg })` returns a closed ellipse
`Sketch`, like `circle`. `rx` is the semi-axis along sketch +X before the
turn. The centre and semi-axes accept `param()` values; `rotationDeg` is a
plain number.

`path().ellipseArc(x, y, rx, ry, { rotationDeg, largeArc, clockwise })` adds
an elliptical arc from the pen to `(x, y)`. It follows the SVG `A` command
with the Y axis up. Two ellipses of a given size pass through two points, and
each gives a short and a long arc. The default is the arc of 180° or less,
travelling counterclockwise; `largeArc` takes the longer arc and `clockwise`
reverses the travel direction.

Both calls record rational quadratic `nurbsSegment` commands, one per 90° of
sweep or part of it, with weights 1, cos(half sweep), 1. That is an exact
ellipse. Extrude, revolve, loft, sweep, `translate`, `rotate`, `scale` and
`reflect` take the profile as they take any `nurbsSegment`.

## Limits

- This is local API evaluation, a local CLI render and OCCT measurement. No
  other CAD system opened the models, no part was made, and the demo shows no
  deployed behavior.
- The ellipse is a rational B-spline, not a STEP `ELLIPSE` entity. A closed
  ellipse extrudes to four wall faces.
- `ellipseArc` takes plain numbers only. Its centre is solved when the script
  runs, so a `param()` value throws `feature.invalid-args`.
- Radii too small to join the two points throw `feature.invalid-args` with
  the smallest pair that fits. SVG scales the radii without a message.
- `Sketch.offset` and the sketch booleans do not take a profile with a
  `nurbsSegment`. `cutout()` takes one; see `docs/demos/cutout-nurbs-profile/`.
- The default `boundingBox()` of a NURBS edge is the box of its control
  polygon. For a turned ellipse use `boundingBox({ exact: true })`.
