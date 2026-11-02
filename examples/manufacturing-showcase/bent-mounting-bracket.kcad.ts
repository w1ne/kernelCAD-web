// Folded mounting bracket: 100 × 50 mm nominal blank, 2 mm sheet, 90° bend.
// Four 5.5 mm clearance holes: two in each leg. The bend allowance uses an
// illustrative K-factor; the shop must confirm material, tooling and bend data.
const thickness = 2;
const radius = 2;
const profile = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, 50).lineTo(0, 50).close();
let blank = sheetMetal(profile, { thickness, kFactor: 0.4 });
blank = blank.holes({ byNormal: 'Z' }, {
  positions: [{u: -30, v: -12}, {u: -30, v: 12}, {u: 35, v: -12}, {u: 35, v: 12}],
  diameter: 5.5, depth: 'through', name: 'mountingHoles',
});
return blank.bend({ atX: 60 }, 90, radius);
