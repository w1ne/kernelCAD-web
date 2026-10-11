// Drafting tutorial: one connected aluminium interface plate, not a released part.
// Assumptions: 100 x 70 x 12 stock; four M8 clearance holes; nominal 30 mm bore.
// The bore fit and the illustrative tolerances need engineering approval.
const width = param('width', 100, { min: 90, max: 140 });
const depth = param('depth', 70, { min: 60, max: 100 });
const thickness = param('thickness', 12, { min: 8, max: 20 });
const boltDiameter = param('boltDiameter', 9, { min: 8.5, max: 10 });
const boreDiameter = param('boreDiameter', 30, { min: 20, max: 36 });
const x = width.divide(2).subtract(12);
const y = depth.divide(2).subtract(12);

return box(width, depth, thickness)
  .fillet(6, { parallel: [0, 0, 1] })
  .chamfer(0.5, { face: 'top' })
  .holes('top', {
    positions: [
      { u: x.negate(), v: y.negate() }, { u: x, v: y.negate() },
      { u: x.negate(), v: y }, { u: x, v: y },
    ],
    diameter: boltDiameter, depth: 'through', name: 'mountingHoles',
  })
  .hole('top', { u: 0, v: 0, diameter: boreDiameter, depth: 'through', name: 'centreBore' })
  .datum('A', { atZ: 0 })
  .datum('B', { atY: 0, near: [50, 0, 6] })
  .datum('C', { atX: 0, near: [0, 35, 6] })
  .tolerance({
    type: 'position', value: 0.2, modifier: '⌀', datums: ['A', 'B', 'C'],
    edge: { ofCurveType: 'CIRCLE', near: [12, 12, 12] },
  })
  .finish('aluminium');
