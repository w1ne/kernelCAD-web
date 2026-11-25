// Post-bend cuts on the still-flat base must reach the flat-pattern DXF.
// The folded solid already has both holes; flattenPattern recovers them from
// the terminal solid's flat top plane instead of reading only the pre-bend
// blank.
const profile = path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close();
return sheetMetal(profile, { thickness: 2, kFactor: 0.38 })
  .bend({ atX: 55 }, 90, 3)
  .subtract(cylinder(20, 2.2).translate(20, 15, -5))
  .subtract(cylinder(20, 2.2).translate(20, 45, -5));
