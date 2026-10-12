// Illustrative monolithic mount; no purchased bearing or catalog fit.
// Seat diameter 44 x nominal 8 deep; throat diameter 32 through 36.
const base = box(120, 80, 12)
  .fillet(6, { parallel: [0, 0, 1] })
  .holes('top', {
    positions: [{ u: -46, v: -26 }, { u: 46, v: -26 }, { u: -46, v: 26 }, { u: 46, v: 26 }],
    diameter: 9, depth: 'through', counterbore: { diameter: 15, depth: 5 }, name: 'mountingHoles',
  });
const pedestal = box(56, 36, 54)
  .hole('front', { u: 0, v: 0, diameter: 32, depth: 'through',
    counterbore: { diameter: 44, depth: 8 }, name: 'bearingSeat' })
  .translate(32, 22, 12);
return base.union(pedestal)
  // Restrict to the front entry plane, then select the seat rim.
  .dimension({ id: 'seat-diameter', kind: 'diameter', edge: { ofCurveType: 'CIRCLE', atY: 22, tolerance: 0.001, near: [82, 22, 39] }, label: 'Seat' })
  .dimension({ id: 'throat-diameter', kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [76, 58, 39] }, label: 'Throat' })
  .drawingReview({
    id: 'bearing-mount',
    requirements: [
      { id: 'seat-diameter', featureId: 'bearingSeat', annotationId: 'authored:seat-diameter', expectedKind: 'diameter', role: 'critical', reason: 'Show the diameter of the illustrative insert seat.' },
      { id: 'throat-diameter', featureId: 'bearingSeat', annotationId: 'authored:throat-diameter', expectedKind: 'diameter', role: 'critical', reason: 'Show the opening behind the seat independently.' },
    ],
    decisions: [{ id: 'insert-retention', kind: 'fit', featureId: 'bearingSeat', prompt: 'Will the illustrative insert be removable or press-retained?' }],
  });
