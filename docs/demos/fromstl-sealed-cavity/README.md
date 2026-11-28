# Import a hollow STL with its sealed void

[demo.mp4](./demo.mp4) shows `lib.fromSTL` importing a sealed float: a hollow
32-sided prism with 3 mm walls, written by Blender 4.0.2 as two mesh shells. The
void becomes an inner shell of one B-rep solid. A 6 mm port bored along the axis
then removes only the floor and lid material. Cutaways show the void.

## Replay and verification

- Modeling script: [`port-sealed-float.kcad.ts`](./port-sealed-float.kcad.ts)
- Fixture source: [`make-fixture.py`](../../../examples/interoperability/stl-sealed-cavity/make-fixture.py)
- Fixture generation: `blender --background --factory-startup --python examples/interoperability/stl-sealed-cavity/make-fixture.py`
- Fixture: [`sealed-float.stl`](./sealed-float.stl) (a copy of `examples/interoperability/stl-sealed-cavity/sealed-float.stl`)
- Capture invocation: `node --import tsx docs/demos/fromstl-sealed-cavity/capture-demo.mts`
- Video invocation: `node --import tsx docs/demos/fromstl-sealed-cavity/make-video.mts`
- Geometry and measurements: [`evidence.json`](./evidence.json) and [`geometry.json`](./geometry.json)
- Video settings and output hashes: [`video-evidence.json`](./video-evidence.json)
- Preview: [`poster.png`](./poster.png)

The capture runs the adjacent `.kcad.ts` script through the local kernelCAD API
and OCCT recompute. It checks 1 solid with 2 shells, the 12810.41 mm³ wall volume
(outer prism minus void prism, within 0.01 mm³), B-rep validity, a port that
removes 54π = 169.65 mm³, and two cutaways that each keep half the material.
The rendered geometry comes from the OCCT results saved by the capture.

## Before and after

Measured with the same fixture and port on `origin/develop` `6347a295f`:

| | Before | After |
| --- | --- | --- |
| Imported solids | 2 (the void was a separate inverted solid) | 1, with the void as an inner shell |
| Imported volume | 12810.41 mm³ | 12810.41 mm³ |
| Volume after the 6 mm port | 1413.72 mm³ in 3 solids | 12640.76 mm³ in 1 solid |

The imported volume was already correct because the inverted solid has negative
volume. The boolean result was wrong.

## Limits

An inward-facing shell is attached as a void only when its bounds are strictly
inside an outward-facing shell and one of its vertices is inside that shell. The
importer does not test shells for mutual intersection. An inward-facing shell
with no enclosing shell imports as before. `lib.from3MF` still refuses
inward-facing shells. This is local API and OCCT recompute replay; it does not
show deployed behavior, slicer acceptance, or hardware acceptance. The imported
faces remain planar triangles without analytic source surfaces or feature
history.
