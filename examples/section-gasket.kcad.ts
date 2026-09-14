// Section a booleaned part back to a reusable 2D sketch, then extrude a
// matching gasket from it. `sectionSketch` returns a real Sketch (exact arcs
// preserved), so the gasket is a true cross-section of the part — not a
// re-modelled approximation.
//
// Run with:
//   npx tsx examples/section-gasket.run.ts
//
// Expected output (see the run file):
//   section area  ≈ 2242.92 mm²  (60x40 plate minus two Ø10 through-holes)
//   gasket volume ≈ 6728.76 mm³  (section area x 3 mm)
//   stack scan    → thinnest neck at x = 16 mm (area 40 mm²)

const plate = box(60, 40, 12)
  .hole('top', { u: -20, v: 0, diameter: 10, depth: 'through' })
  .hole('top', { u: 20, v: 0, diameter: 10, depth: 'through' });

const section = await plate.sectionSketch({ plane: 'xy', offset: 6 });

// The section is in the plane's 2D frame; extruding it normal to that plane
// produces a 3 mm gasket with the same outline (and the same two holes).
return section.extrude(3);
