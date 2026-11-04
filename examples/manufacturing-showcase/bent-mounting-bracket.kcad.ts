// Folded mounting bracket: 100 mm long, 2 mm sheet, nominal 90° bend.
// Four 5.5 mm clearance holes: two in each leg. The bend allowance uses an
// illustrative K-factor; the shop must confirm material, tooling and bend data.
const bendAngle = param('bendAngle', 90, { min: 45, max: 120 });
const width = param('width', 50, { min: 40, max: 100 });
const holeDiameter = param('holeDiameter', 5.5, { min: 4.5, max: 8 });
const thickness = 2;
const radius = 2;
const profile = path().moveTo(0, 0).lineTo(100, 0).lineTo(100, width).lineTo(0, width).close();
let blank = sheetMetal(profile, { thickness, kFactor: 0.4 });
blank = blank.holes({ byNormal: 'Z' }, {
  positions: [
    {u: -30, v: width.divide(2).subtract(13).negate()},
    {u: -30, v: width.divide(2).subtract(13)},
    {u: 35, v: width.divide(2).subtract(13).negate()},
    {u: 35, v: width.divide(2).subtract(13)},
  ],
  diameter: holeDiameter, depth: 'through', name: 'mountingHoles',
});
return blank.bend({ atX: 60 }, bendAngle, radius);
