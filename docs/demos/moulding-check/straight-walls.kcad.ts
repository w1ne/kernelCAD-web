// Injection-moulded enclosure base, 80 x 50 x 25 mm, 2 mm wall — first cut:
// straight walls and sharp inside corners. Pull direction +Z.
dfmSpec({ process: 'moulding', pullDirection: '+z', minDraftDeg: 1, minWallMm: 1.2, maxWallMm: 3.5, minRadiusMm: 0.5 });

return box(80, 50, 25).shell(2, { face: 'top' });
