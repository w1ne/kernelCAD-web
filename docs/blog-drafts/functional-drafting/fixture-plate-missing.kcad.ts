// Illustrative fixture plate: millimetres, Z-up. No fit or load acceptance.
// Reuses the tutorial's stock, corner radius and hole locations; no GD&T.
const holeCentre = (x, y) => ({
  edge: { ofCurveType: 'CIRCLE', near: [x, y, 12] },
});
const plate = box(100, 70, 12)
  .fillet(6, { parallel: [0, 0, 1] })
  .holes('top', {
    positions: [{ u: -38, v: -23 }, { u: 38, v: -23 }, { u: -38, v: 23 }, { u: 38, v: 23 }],
    diameter: 9, depth: 'through', name: 'mountingHoles',
  })
  .hole('top', { u: 0, v: 0, diameter: 30, depth: 'through', name: 'centreBore' });

return plate
// Deliberately omitted X-pitch callout; the declared requirement remains.
  .dimension({ id: 'pitch-y', kind: 'linear', from: holeCentre(88, 12), to: holeCentre(88, 58), label: 'Y pitch' })
  .dimension({ id: 'mounting-diameter', kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [16.5, 12, 12] }, label: 'Mounting holes' })
  .dimension({ id: 'bore-diameter', kind: 'diameter', edge: { ofCurveType: 'CIRCLE', near: [50, 35, 12] }, label: 'Centre bore' })
  .drawingReview({
    id: 'plate',
    requirements: [
      { id: 'pitch-x', featureId: 'mountingHoles', annotationId: 'authored:pitch-x', expectedKind: 'linear', role: 'critical', reason: 'Locate fixture holes across X so the mating pattern can be checked.' },
      { id: 'pitch-y', featureId: 'mountingHoles', annotationId: 'authored:pitch-y', expectedKind: 'linear', role: 'critical', reason: 'Locate the second hole row across Y.' },
      { id: 'mounting-diameter', featureId: 'mountingHoles', annotationId: 'authored:mounting-diameter', expectedKind: 'diameter', role: 'critical', reason: 'Expose the illustrative 9 mm mounting-hole diameter.' },
      { id: 'bore-diameter', featureId: 'centreBore', annotationId: 'authored:bore-diameter', expectedKind: 'diameter', role: 'critical', reason: 'Expose the central interface opening.' },
      { id: 'stock-width', featureId: 'stock', annotationId: 'authored:stock-width', expectedKind: 'linear', role: 'reference', reason: 'Overall stock width is advisory in this interface-only plan.' },
    ],
    decisions: [],
  });
