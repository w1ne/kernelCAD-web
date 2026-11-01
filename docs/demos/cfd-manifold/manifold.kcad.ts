// Two-way coolant splitter manifold, FDM-printable (PETG), with a CFD study.
//
// Job: a low-flow water loop (0.3 L/min, e.g. a laser-diode or Peltier cold
// plate pair) enters one 8 mm port and leaves through two outlet ports of
// different size (5 mm and 4 mm) joined by a printed internal cross gallery.
// Question the study answers: how much pressure does the manifold cost, and
// how does the flow split between the two outlets?
//
// The fluid is the manifold's interior: run_cfd subtracts the part from its
// bounding box and keeps the channels, which open flush on the x = 0 and
// x = 60 faces (the M4 mounting holes are voids no inlet reaches, so they are
// dropped). Inlet/outlet selectors name the openings of that fluid volume.

const L = param('length', 60, { unit: 'mm' });
const W = param('width', 40, { unit: 'mm' });
const H = param('height', 16, { unit: 'mm' });
const inletD = param('inletDiameter', 8, { unit: 'mm' });
const outletAD = param('outletADiameter', 5, { unit: 'mm' });
const outletBD = param('outletBDiameter', 4, { unit: 'mm' });
const galleryD = param('galleryDiameter', 6, { unit: 'mm' });

// Block with the inlet bore from the left face (to x = 40) and the two
// outlet bores from the right face (to x = 34), 10 mm either side of centre.
const block = box(L, W, H)
  .hole('left', { u: 0, v: 0, diameter: inletD, depth: 40 })
  .hole('right', { u: -10, v: 0, diameter: outletAD, depth: 26 })
  .hole('right', { u: 10, v: 0, diameter: outletBD, depth: 26 })
  // Four M4 clearance holes (ISO 273 medium: 4.5 mm) to screw it to a plate.
  .holes('top', {
    positions: [{ u: -24, v: -16 }, { u: 24, v: -16 }, { u: -24, v: 16 }, { u: 24, v: 16 }],
    diameter: 4.5,
    depth: 'through',
  });

// Printed internal cross gallery joining the three bores (no entry face:
// it only exists because the part is printed, so it is a subtract, not a hole).
const gallery = cylinder(24, galleryD.divide(2)).rotate([1, 0, 0], -90).translate(37, 8, 8);
const manifold = block.subtract(gallery).finish('plastic-glossy', { color: '#3a7bd5' });

manifold.cfdStudy({
  name: 'splitter-0.3lpm',
  flow: 'internal',
  fluid: 'water',
  inlet: { atX: 0 },
  outlet: [{ atX: 60, near: [60, 10, 8] }, { atX: 60, near: [60, 30, 8] }],
  flowRateLpm: 0.3,
  meshSize: 'medium',
  iterations: 600,
});

return manifold;
