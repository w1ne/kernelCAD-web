// Rounded sheet-metal blank: R10 corners survive the fold and the flat-pattern
// export. `flattenPattern()` samples the arc family into the polyline Region
// wire at a 0.005 mm chord sagitta, so the laser blank keeps its rounded
// corners instead of being refused as a non-polyline sketch.
const profile = path()
  .moveTo(10, 0).lineTo(90, 0)
  .tangentArc(100, 10).lineTo(100, 50)
  .tangentArc(90, 60).lineTo(10, 60)
  .tangentArc(0, 50).lineTo(0, 10)
  .tangentArc(10, 0).close();
return sheetMetal(profile, { thickness: 2, kFactor: 0.38 }).bend({ atX: 50 }, 90, 3);
