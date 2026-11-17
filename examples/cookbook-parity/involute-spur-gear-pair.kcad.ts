// Involute spur gear pair: module 1, 20 and 40 teeth, 20° pressure angle.
// spurGearPair places both gears at centre distance m(z1+z2)/2, turns the
// driven gear so a tooth space faces the driver, and adds revolute mates,
// a couple at −z1/z2, and a gear-pair transmission.
//
// The log line is a local CAD geometry report: exact BREP distance and
// common volume over one driver tooth, plus the measured pitch-circle
// backlash. It is not a motion simulation and not a strength result.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/involute-spur-gear-pair.kcad.ts
//
// Expected console output:
//   gear-pair-report {"anyInterference":false,"backlashMm":0.04908738521234052,"backlashReached":true,"minClearanceMm":0.023376654152066634,"centerDistanceMm":30,"ratio":-0.5}
//   Features: 18
//   OK

const pair = spurGearPair({
  module: 1,
  teeth: 20,
  drivenTeeth: 40,
  faceWidth: 6,
  backlash: 0.05,
  driverBore: 5,
  drivenBore: 8,
  pressureAngle: 20,
  name: 'involute-spur-gear-pair',
});

const report = await pair.toothInterference({ cycleSamples: 4 });
console.log('gear-pair-report ' + JSON.stringify({
  anyInterference: report.anyInterference,
  backlashMm: report.backlashMm,
  backlashReached: report.backlashReached,
  minClearanceMm: report.minClearanceMm,
  centerDistanceMm: report.centerDistanceMm,
  ratio: report.ratio,
}));

return pair.assembly.model();
