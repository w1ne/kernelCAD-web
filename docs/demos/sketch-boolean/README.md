# Combine sketch profiles: a keyhole hanger plate from simple shapes

[demo.mp4](./demo.mp4) shows [`keyhole-hanger.kcad.ts`](./keyhole-hanger.kcad.ts).
The script builds a 70 × 36 × 3 mm hanger plate for two M4 pan-head screws
44 mm apart. Every profile is a rectangle or a circle, combined with the three
sketch booleans:

- `await blank.intersect(disc)` clips the 70 × 36 mm blank with an R37 disc.
  The result is the outline: four straight sides and four R37 arcs.
- `await entry.union([slot, slotEnd])` joins an Ø9 entry hole, a 4.5 mm slot
  and its round end into one keyhole: two lines and two arcs.
- `await outline.subtract([keyholeA, keyholeB])` makes the two keyholes holes
  of the outline.

Measured in this run: outline area 2490.477 mm², keyhole area 97.198 mm²,
plate volume 6888.243 mm³. Each value equals the closed form to 0.001. The
plate is a valid B-rep. At the hang position the Ø4 shank gauge is 0.250 mm
from the slot wall and the Ø8 head gauge bears on 25.314 mm² of plate. At the
entry position the Ø8 head passes the Ø9 hole with 0.500 mm radial clearance.

## Replay and verification

- Capture invocation: `node --import tsx docs/demos/sketch-boolean/capture-demo.mts`
- View image: `kernelcad render docs/demos/sketch-boolean/keyhole-hanger.kcad.ts -o view.png --pose 25,55 --width 1000 --height 640`
  (the pose file it writes is stored as [`view.png`](./view.png))
- Video invocation: `node --import tsx docs/demos/sketch-boolean/make-video.mts`
- Values and file hashes: [`evidence.json`](./evidence.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)
- Regression tests: `tests/integration/sketchBoolean.test.ts`

The capture runs the script, then fails unless: the outline is one loop of
four lines and four arcs; each keyhole is one loop of two lines and two arcs;
the profile is one outline with two holes; the areas and the plate volume
equal the closed form; the plate is valid; each shank gauge has no common
volume with the plate and is 0.25 mm from the slot; each head gauge bears on
the closed-form area; and each head passes the entry hole with 0.5 mm
clearance.

## Behavior

`Sketch.union(other)`, `Sketch.subtract(other)` and `Sketch.intersect(other)`
return a new sketch. They are async, like `Sketch.offset`: write
`(await a.union(b)).extrude(5)`. `other` is one sketch or an array.

- A profile is the region inside its first loop and outside its hole loops.
- Lines stay lines and arcs stay arcs. A boundary that two profiles share
  disappears.
- A subtracted profile inside the outline becomes a hole. A profile that
  fills a hole removes the hole.
- `intersect` with an array keeps the region that every profile shares.
- A result that is not one outline with holes is refused:
  `feature.sketch-boolean.empty` when no area is left,
  `feature.sketch-boolean.split` when the result is several separate regions
  or touches itself at a point.

## Limits

- The boolean is computed when the script runs. A profile with `param()`
  coordinates is refused with `feature.invalid-args`, because the result
  could not follow a later parameter edit. Extrude such sketches and combine
  the solids.
- A profile with a spline segment is refused.
- A result of several separate regions is refused; a sketch is one outline
  with holes.
- The screws in the model are hand-modelled check gauges (Ø4 shank, Ø8 head),
  not catalog parts.
- This is local API evaluation and OCCT measurement. No part was printed or
  machined, no fit was tested on hardware, and the demo shows no deployed
  behavior.
