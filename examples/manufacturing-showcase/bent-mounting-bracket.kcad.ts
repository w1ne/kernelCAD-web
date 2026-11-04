// Folded mounting bracket: 100 mm long, 2 mm sheet, nominal 90° bend.
// Four 5.5 mm clearance holes: two in each leg. The bend allowance uses an
// illustrative K-factor; the shop must confirm material, tooling and bend data.
const bendAngle = param('bendAngle', 90, { min: 45, max: 120 });
const length = param('length', 100, { min: 90, max: 115 });
const width = param('width', 50, { min: 40, max: 100 });
const holeDiameter = param('holeDiameter', 5.5, { min: 3.4, max: 6.6 });
const thickness = 2;
const radius = 2;
const profile = path().moveTo(0, 0).lineTo(length, 0).lineTo(length, width).lineTo(0, width).close();
let blank = sheetMetal(profile, { thickness, kFactor: 0.4 });
const leftX = length.divide(2).negate().add(20);
const rightX = length.divide(2).subtract(15);
const holeY = width.divide(2).subtract(13);
blank = blank.holes({ byNormal: 'Z' }, {
  positions: [
    {u: leftX, v: holeY.negate()},
    {u: leftX, v: holeY},
    {u: rightX, v: holeY.negate()},
    {u: rightX, v: holeY},
  ],
  diameter: holeDiameter, depth: 'through', name: 'mountingHoles',
});
return blank.bend({ atX: 60 }, bendAngle, radius);
