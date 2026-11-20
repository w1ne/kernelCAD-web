# Keep a smoothSpline curve when its profile is mirrored or turned

[demo.mp4](./demo.mp4) shows [`pull-backplate.kcad.ts`](./pull-backplate.kcad.ts):
a 92 × 28 × 3 mm drawer-pull backplate with two Ø4.2 mm screw holes. The
script draws one quarter of the outline, with a waisted edge made of two
chained `smoothSpline` segments. It mirrors the quarter with `reflect('x')`,
`reflect('y')` and both, and joins the four quarters.

- Now: all four quarters have the closed-form volume, 1362.000 mm³. The
  backplate volume is 5364.873 mm³, equal to the closed-form value. The solid
  is a valid B-rep.
- Before this change: the two quarters from `reflect('y')` were a different
  curve, 1349.808 mm³ each. The backplate volume was 5340.489 mm³ (0.45 % low)
  and there was no error diagnostic.

[`round-end.kcad.ts`](./round-end.kcad.ts) shows the new option:
`smoothSpline(46, -8, { endTangent: [0, 1] })` arrives travelling +Y and
rounds the end corner. Its volume is 1328.885 mm³, equal to the closed-form
value.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/smoothspline-tangents/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/smoothspline-tangents/make-video.mts`
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/smoothSplineTangent.test.ts`

The capture runs both scripts, then fails unless: each of the four quarter
solids has the closed-form volume and the expected bounding box (tolerance
1e-6); the backplate is a valid B-rep of 92 × 28 × 3 mm with the closed-form
volume (tolerance 1e-4 mm³); and the rounded quarter is a valid B-rep with its
closed-form volume.

The closed form does not come from the kernel. A `smoothSpline` is one cubic
Bézier. Its two inner poles are a quarter of the chord length from each end,
along the start tangent and the end tangent. The capture integrates x·dy over
those poles.

The "before" volumes are not measured by the capture. They are recorded from a
run of the same script on develop `1cea61618`. In the video, the outlines are
drawn from the sketch commands by the same pole rule. The "before" outline
is the present command list with the tangent fields removed, which is the
command list that the old version recorded. It is not a picture of the solid
that the old version built.

## Behavior

A `smoothSpline` segment arrives at its end point along the sketch +X
direction, unless the command states an end tangent. Its start tangent is the
end direction of the previous segment. Directly after `moveTo` there is no
previous segment, and the start tangent is the sketch +X direction too.

Before this change the segment stored no tangent. A transform mapped the end
point only, and the mapped curve still used the +X direction of the sketch
frame:

- `Sketch.reflect('y')` built a different curve. `reflect('x')` was correct,
  because the mirror image of +X across the X axis is +X.
- `Sketch.rotate` refused a `smoothSpline` profile for this reason.
- Loft section rotation (`twistDeg`, `planes[].rotationDeg`) rotated the end
  points only.

Now `reflect`, `translate`, `rotate`, `scale` and loft section rotation write
the mapped tangent into the segment, and `Sketch.rotate` accepts a
`smoothSpline` profile.

`path().smoothSpline(x, y, { endTangent, startTangent })` states the tangents
directly. Each is an `[x, y]` direction of travel; only the direction matters.
`startTangent` replaces the inherited direction. The values accept `param()`.

`Sketch.reflect` also mirrors the `startTangent` / `endTangent` constraints of
`spline([...])`. Before, it mirrored the waypoints only.

## Limits

- This is local API evaluation and OCCT measurement. No other CAD system
  opened the model, no backplate was made, and the demo shows no deployed
  behavior.
- The video shows 2D outlines, not a render of the solid.
- A zero-length tangent, a tangent that is not an `[x, y]` pair and an unknown
  option key are refused at capture with `feature.invalid-args`. A `param()`
  tangent that becomes zero-length after `set_param` fails at lowering.
- The tangent-constrained `spline([...])` interpolator is not exactly
  invariant under a mirror or a turn: the area of the 20 × 14 mm test profile
  changes by about 0.03 % (319.267 mm² as drawn, 319.176 mm² mirrored across
  X, 319.160 mm² turned 90°). This change does not correct that.
- `Sketch.rotate` still needs a plain-number angle.
