// Lightweight shelf bracket: graded gyroid core inside a solid skin.
//
// The cookbook PETG shelf bracket (two M5 wall screws, 120 N shelf load),
// printed as a 1.2 mm solid skin around a gyroid sheet lattice instead of
// slicer infill. The lattice walls are 0.9 mm in the open web and thicken
// smoothly to 2 mm within 8 mm of the screw bores, where the clamp load
// goes in. The result is a watertight mesh solid for STL / 3MF.
//
// RUN IT
//
//   kernelcad evaluate examples/lattice/graded-gyroid-bracket.kcad.ts
//   kernelcad export 3mf examples/lattice/graded-gyroid-bracket.kcad.ts -o bracket.3mf
//
// EXPECTED (measured; digits move with the grid)
//
//   feature.lattice.report  gyroid sheet, cell 6 mm, wall 0.90-2.00 mm,
//                           ~49 % of the solid bracket's volume, watertight
//   dfm.lattice.enclosed-cavities (info) — the skin seals the lattice

const wall = param('wall', 8, { min: 6, max: 12 });
const width = 40;
const leg = 70;

const wallLeg = box(wall, width, leg)
  .hole('left', { u: 0, v: -10, diameter: 5.5, depth: 'through', name: 'screwLow' })
  .hole('left', { u: 0, v: 20, diameter: 5.5, depth: 'through', name: 'screwHigh' });

const bracket = wallLeg
  .union(box(leg, width, wall))
  .fillet(5, { parallel: [0, 1, 0], concave: true });

dfmSpec({ process: 'fdm', minWall: 0.8 });

return bracket.lattice({
  type: 'gyroid',
  cell: 6,
  wall: 0.9,
  skin: 1.2,
  grade: { from: 'holes', near: 2.0, over: 8 },
});
