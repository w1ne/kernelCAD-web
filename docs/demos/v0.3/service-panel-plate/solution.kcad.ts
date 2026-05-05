// Service-panel mounting plate — v0.3 hero artifact.
//
// 120 × 80 × 10 mm aluminum plate carrying every new v0.3 capability:
//   - 4× M5 corner bolt holes (through, simple)
//   - 2× M6 counterbored mounting holes (cb Ø11, cb depth 4)
//   - 1× M4 countersunk grounding screw hole (default csk angle)
//   - 1× D-shaped cable cutout
// All in a single chained agent call.

const plate = box(120, 80, 10);

return plate
  // 4 M5 corner bolts (corners of a 100×60 inner rectangle)
  .holes('top', {
    positions: [
      { u: -50, v: -30 }, { u:  50, v: -30 },
      { u: -50, v:  30 }, { u:  50, v:  30 },
    ],
    diameter: 5, depth: 'through',
  })
  // 2 M6 counterbored panel-mount holes along the centerline
  .hole('top', { u: -20, v: 0, diameter: 6, depth: 'through', counterbore: { diameter: 11, depth: 4 } })
  .hole('top', { u:  20, v: 0, diameter: 6, depth: 'through', counterbore: { diameter: 11, depth: 4 } })
  // 1 M4 countersunk grounding screw hole on the right
  .hole('top', { u: 40, v: 20, diameter: 4, depth: 'through', countersink: { diameter: 8 } })
  // 1 D-shaped cable cutout on the left side
  .cutout(
    path()
      .moveTo(-8, -6)
      .lineTo( 8, -6)
      .threePointsArc(-8, -6, 0, 6)
      .close(),
    { face: 'top', depth: 'through' },
  );
