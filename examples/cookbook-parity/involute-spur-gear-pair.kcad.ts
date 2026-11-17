// Involute spur gear pair: module 1, 20 and 40 teeth, 20° pressure angle.
// spurGearPair places both gears at centre distance m(z1+z2)/2, turns the
// driven gear so a tooth space faces the driver, and adds revolute mates,
// a couple at −z1/z2, and a gear-pair transmission.
//
// The log line is a local CAD geometry report: exact BREP distance and
// common volume over sampled poses of one driver tooth, plus poses refined
// beside the minimum, plus the measured pitch-circle backlash.
// anyInterference and minClearanceMm aggregate those poses. A common
// volume strictly above interferenceVolumeFloorMm3 (0.001 mm³) is
// interference and closes minClearanceMm. A smaller positive volume does
// not. They do not prove the gaps between samples. It is not a motion
// simulation and not a strength result.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/cookbook-parity/involute-spur-gear-pair.kcad.ts
//
// Expected console output:
//   gear-pair-report {"sampleLimited":true,"clearanceScope":"sampled-poses","anyInterference":false,"interferenceVolumeFloorMm3":0.001,"aggregatedPoseCount":8,"unresolvedStepDeg":1.125,"refinementSteps":2,"backlashMm":0.04908738521234052,"backlashStepMm":0.0015339807878856412,"backlashReached":true,"minClearanceMm":0.023376654152066634,"minClearanceDriverDeg":9,"centerDistanceMm":30,"ratio":-0.5}
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
  sampleLimited: report.sampleLimited,
  clearanceScope: report.clearanceScope,
  anyInterference: report.anyInterference,
  interferenceVolumeFloorMm3: report.interferenceVolumeFloorMm3,
  aggregatedPoseCount: report.aggregatedPoseCount,
  unresolvedStepDeg: report.unresolvedStepDeg,
  refinementSteps: report.refinementSteps,
  backlashMm: report.backlashMm,
  backlashStepMm: report.backlashStepMm,
  backlashReached: report.backlashReached,
  minClearanceMm: report.minClearanceMm,
  minClearanceDriverDeg: report.minClearanceDriverDeg,
  centerDistanceMm: report.centerDistanceMm,
  ratio: report.ratio,
}));

return pair.assembly.model();
