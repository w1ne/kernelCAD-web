// Issue #1763: every sheet-metal dimension is driven by param(), not a literal.
// Capture validates the resolved table value (a symbolic param stays 0 until
// the dispatcher resolves it), and lowering re-reads the live table, so moving
// a slider rebuilds the same captured script at a new gauge.
const profile = path().moveTo(0, 0).lineTo(110, 0).lineTo(110, 60).lineTo(0, 60).close();
const thickness = param('Thickness', 2, { unit: 'mm', min: 1, max: 4, step: 0.5 });
const kFactor = param('KFactor', 0.38, { min: 0.3, max: 0.5, step: 0.01 });
const bendLine = param('BendLine', 55, { unit: 'mm', min: 15, max: 85 });
const bendRadius = param('BendRadius', 3, { unit: 'mm', min: 1, max: 10 });
const bendAngle = param('BendAngle', 90, { unit: 'deg', min: 30, max: 135 });
return sheetMetal(profile, { thickness, kFactor })
  .bend({ atX: bendLine }, bendAngle, bendRadius);
