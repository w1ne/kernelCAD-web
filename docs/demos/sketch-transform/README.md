# Move, turn and resize a sketch: a 60 mm fan guard from one hole and one slot

[demo.mp4](./demo.mp4) shows [`fan-guard.kcad.ts`](./fan-guard.kcad.ts).
The script builds a 60 × 60 × 2 mm guard plate for a 60 mm axial fan: four
Ø4.3 holes for M4 screws on the 50 mm square and 16 radial vent slots. One
hole and one slot are drawn once at the origin. The three sketch transforms
place every copy:

- `hole.translate(x, y)` puts the Ø4.3 hole on the four corners of the 50 mm
  square.
- `slot.rotate(45 * i)` turns the 13 × 5 mm slot to eight positions.
- `s.scale(0.45).rotate(22.5)` resizes each outer slot about the fan axis and
  turns it between the outer slots. This is the inner ring.

`await outline.subtract([...])` then makes the 20 copies holes of the outline.

Measured in this run, from the loops of the kernel result: each outer slot
59.635 mm² at 20.000 mm from the axis, 45° apart; each inner slot 12.076 mm²
(59.635 × 0.45²) at 9.000 mm, offset 22.5°; vent open area 573.688 mm²; plate
volume 5936.447 mm³. Each value equals the closed form to 0.001. Every slot is
two lines and two arcs. The plate is a valid B-rep. An Ø4 pin gauge in each
mounting hole has no common volume with the plate and 0.150 mm radial
clearance.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/sketch-transform/capture-demo.mts`
- View image: `kernelcad render docs/demos/sketch-transform/fan-guard.kcad.ts -o view.png --pose 25,55 --width 1000 --height 640`
  (the pose file it writes is stored as [`view.png`](./view.png))
- Video invocation: `node --import tsx docs/demos/sketch-transform/make-video.mts`
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/sketchTransform.test.ts`

The capture runs the script, then fails unless: the profile is one outline
with 20 holes and the closed-form area; the four mounting holes, the eight
outer slots and the eight inner slots each have the closed-form area, centre
radius and direction; the plate is valid and has the closed-form volume and
bounds; and each pin gauge has no common volume with the plate and is 0.15 mm
from the hole wall.

## Behavior

`Sketch.translate(dx, dy)`, `Sketch.rotate(angleDeg, center?)` and
`Sketch.scale(factor, center?)` return a new sketch. They are synchronous.

- The source sketch is unchanged, so one profile can be placed several times.
- Every loop is transformed, holes included.
- Arcs stay exact arcs on the same side of their chord. A multiple of 90°
  gives exact coordinates.
- `rotate` is counter-clockwise. `center` defaults to the sketch origin.
- Calls apply in order: `.rotate(90).translate(20, 0)` turns about the origin,
  then moves.
- `dx`, `dy`, `factor`, `center` and `param()` coordinates stay symbolic, so
  the result follows `set_param`.
- The methods work on a sketch from `path()`, `reflect`, `offset`, a sketch
  boolean, `sectionSketch`, `faceSketch`, `silhouette` and a DXF/SVG import.

## Limits

- The rotation angle must be a plain number. A `param()` angle is refused
  with `feature.invalid-args`, because parameter expressions have no sin/cos.
  Extrude the sketch and use `Shape.rotate` for a parameter-driven angle.
- At the time of this demo `rotate` refused a profile with a `smoothSpline`
  segment. That limit is removed: the transform now writes the turned tangent
  into the segment (`docs/demos/smoothspline-tangents/`).
- `scale` is uniform. A factor that is not > 0 is refused; use `reflect` to
  mirror.
- A `sketch.text` sketch has no path commands and is refused. Use the
  `position`, `rotation` and `size` options of `sketch.text`.
- An interpolated `spline` segment is refitted after the transform. In the
  regression test the area of a transformed spline profile equals the scaled
  source area to a relative 1e-4.
- The pins are hand-modelled check gauges, not catalog screws.
- Air flow through the vents was not simulated or measured.
- No part was printed or machined, and no fit was tested on hardware.
