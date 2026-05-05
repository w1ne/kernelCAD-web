// Service-panel mounting plate — v0.3 hero artifact.
//
// 120 × 80 × 10 mm aluminum plate carrying every new v0.3 capability,
// with slice-2 named features for self-documenting downstream selectors:
//   - 4× M5 corner bolt holes (through) — cornerBolts
//   - 2× M6 counterbored mounting holes (cb Ø11, depth 4) — panelMountFront / panelMountBack
//   - 1× M4 countersunk grounding screw hole — groundStud
//   - 1× D-shaped cable cutout — cablePort
// All in a single chained agent call.

const plate = box(120, 80, 10);

return plate
  .holes('top', {
    positions: [
      { u: -50, v: -30 }, { u:  50, v: -30 },
      { u: -50, v:  30 }, { u:  50, v:  30 },
    ],
    diameter: 5, depth: 'through',
    name: 'cornerBolts',
  })
  .hole('top', {
    u: -20, v: 0, diameter: 6, depth: 'through',
    counterbore: { diameter: 11, depth: 4 }, name: 'panelMountFront',
  })
  .hole('top', {
    u: 20, v: 0, diameter: 6, depth: 'through',
    counterbore: { diameter: 11, depth: 4 }, name: 'panelMountBack',
  })
  .hole('top', {
    u: 40, v: 20, diameter: 4, depth: 'through',
    countersink: { diameter: 8 }, name: 'groundStud',
  })
  .cutout(
    path()
      .moveTo(-8, -6)
      .lineTo( 8, -6)
      .threePointsArc(-8, -6, 0, 6)
      .close(),
    { face: 'top', depth: 'through', name: 'cablePort' },
  );
