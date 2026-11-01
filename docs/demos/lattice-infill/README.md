# Lattice infill: a graded gyroid bracket

The cookbook PETG shelf bracket (two M5 wall screws) printed as a 1.2 mm solid
skin around a gyroid sheet lattice. The lattice walls are 0.9 mm in the open
web and thicken smoothly to 2 mm within 8 mm of the screw bores:

```ts
return bracket.lattice({
  type: 'gyroid', cell: 6, wall: 0.9, skin: 1.2,
  grade: { from: 'holes', near: 2.0, over: 8 },
});
```

Source: [`examples/lattice/graded-gyroid-bracket.kcad.ts`](../../../examples/lattice/graded-gyroid-bracket.kcad.ts)
(cookbook recipe `lattice-graded-gyroid-bracket`).

| measured (`result.json`) | graded | ungraded (0.9 mm) |
| --- | --- | --- |
| design wall | 0.90-1.93 mm | 0.90 mm |
| measured wall, 5th percentile | 0.83 mm | 0.82 mm |
| measured skin, 5th percentile | 1.20 mm | 1.20 mm |
| volume / solid bracket | 67.9 % | 65.2 % |
| triangles | 310 k | 309 k |
| watertight, consistently oriented | yes | yes |
| build time (this machine) | 3.4 s | 3.0 s |

The bracket is only 8 mm thick, so the two 1.2 mm skins are most of its
volume; the saving grows with section size. The measured sheet wall sits
~5 % under the design value (the sheet is defined by a first-order distance
to the minimal surface). The 60 mm gyroid cube timing run (6 mm cells,
0.8 mm wall, 1.2 mm skin) is `cube60` in `result.json`: about 1.6 s for the
fields and mesh, 1.8 M triangles after decimation, ~8-10 s in total
depending on load.

[demo.mp4](demo.mp4) (15 s): the call; the outside (`inspect-iso.png`, the
canonical `render inspect` iso view — only the skin shows, both M5 bores
open); two cut-aways through the bore centres (`cutaway-iso.png`,
`cutaway-side.png`) showing the gyroid core, the 1.2 mm skin round the
outside and the bores, and the walls thickening next to them; the report.

The cut-aways are rasterised from the exported STL by `cutaway.py` (every
triangle beyond y = 20 dropped, two-sided shading, orange = the backs of
walls seen through the cut). `kernelcad render --section` was tried first:
the viewer caps the section plane as if the body were solid, which hides
a lattice and draws a broken cap — a known limitation for mesh solids with
internal cavities. The canonical inspect view also shows smooth-shading
streaks along sharp edges and near the bores (vertex normals averaged over
the sharp edge of an implicit mesh); the geometry there is the snapped skin.

## Reproduce

```sh
npx tsx docs/demos/lattice-infill/report.ts            # -> result.json
kernelcad render inspect examples/lattice/graded-gyroid-bracket.kcad.ts <dir>
cp <dir>/channels/rgb/iso.png <frames>/iso.png
kernelcad export stl examples/lattice/graded-gyroid-bracket.kcad.ts -o bracket.stl
python3 -I docs/demos/lattice-infill/cutaway.py bracket.stl <frames>/cut-a.png y 20 640
python3 -I docs/demos/lattice-infill/cutaway.py bracket.stl <frames>/cut-b.png y 20 640 0 0
python3 -I docs/demos/lattice-infill/compose.py <frames> <frames>   # -> <frames>/demo.mp4
```

Renders came from the bundled headless player in a local headless Chrome
(software GL). This is a local run of the kernel and CLI; it does not show
the hosted service, a slicer, or a printed part.
