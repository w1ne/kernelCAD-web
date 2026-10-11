// A monolithic machined bearing mount for a drafting review exercise.
// Nominal interface only: no catalog bearing, bearing fit, load rating or release.
// Seat: diameter 44 x 8 deep from front. Throat: diameter 32 through the pedestal.
const baseWidth = param('baseWidth', 120, { min: 120, max: 160 });
const baseDepth = param('baseDepth', 80, { min: 80, max: 110 });
const baseThickness = param('baseThickness', 12, { min: 10, max: 16 });
const pedestalHeight = param('pedestalHeight', 54, { min: 54, max: 70 });
const seatDiameter = param('seatDiameter', 44, { min: 40, max: 44 });
const pedestalX = baseWidth.subtract(56).divide(2);
const pedestalY = baseDepth.subtract(36).divide(2);
const boltX = baseWidth.divide(2).subtract(14);
const boltY = baseDepth.divide(2).subtract(14);

const base = box(baseWidth, baseDepth, baseThickness)
  .fillet(6, { parallel: [0, 0, 1] })
  .holes('top', {
    positions: [
      { u: boltX.negate(), v: boltY.negate() }, { u: boltX, v: boltY.negate() },
      { u: boltX.negate(), v: boltY }, { u: boltX, v: boltY },
    ],
    diameter: 9, depth: 'through', counterbore: { diameter: 15, depth: 5 }, name: 'mountingHoles',
  });
const pedestal = box(56, 36, pedestalHeight)
  .hole('front', {
    u: 0, v: 0, diameter: 32, depth: 'through',
    counterbore: { diameter: seatDiameter, depth: 8 }, name: 'bearingSeat',
  })
  .translate(pedestalX, pedestalY, baseThickness);

return base.union(pedestal)
  .datum('A', { atZ: 0 })
  .datum('B', { atY: 0 })
  .datum('C', { atX: 0 })
  .tolerance({ type: 'flatness', value: 0.1, face: { atZ: 0 } })
  .finish('aluminium');
