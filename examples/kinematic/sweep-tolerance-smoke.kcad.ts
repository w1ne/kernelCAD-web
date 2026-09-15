// Sweep-tolerance inner-loop smoke. Two boxes with a swept clearance gap —
// the classic tolerance-stackup scenario ("does this design still clear
// once the real part is 0.5 mm oversized"). Runs sweepTolerance once,
// asserting the interference gate flips pass -> fail as the gap closes.
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/sweep-tolerance-smoke.kcad.ts
//
// Expected console output (last line):
//   [smoke] sweep-tolerance dispatch OK: combosEvaluated=4, firstFailGap=-5

const code = `
  const arm = assembly('sweep-clearance-smoke');
  const gap = param('GapMm', 10);
  const a = box(20, 20, 20, true);
  const b = box(20, 20, 20, true).translate(gap.add(20), 0, 0);
  arm.part('a', a);
  arm.part('b', b);
  return arm.solvedModel({});
`;

const r = await kinematic.sweepTolerance({
  code,
  params: { GapMm: { values: [10, 2, 0, -5] } },
  gates: { interference: true, mountingHoles: false, jointAxis: false },
});

console.log(
  `[smoke] sweep: source=${r.source} ok=${r.ok} ` +
    `combosEvaluated=${r.combosEvaluated} combosCapped=${r.combosCapped}`,
);
if (r.source !== 'local') throw new Error('sweep: source != local');
if (r.combosEvaluated !== 4) throw new Error(`sweep: expected 4 combos, got ${r.combosEvaluated}`);
if (r.ok) throw new Error('sweep: expected ok=false (the -5 combo overlaps)');

const verdictByGap = new Map(r.results.map((row) => [row.combo['GapMm'], row.gates['interference']]));
if (verdictByGap.get(10) !== 'pass') throw new Error('sweep: expected gap=10 to pass');
if (verdictByGap.get(2) !== 'pass') throw new Error('sweep: expected gap=2 to pass');
if (verdictByGap.get(-5) !== 'fail') throw new Error('sweep: expected gap=-5 to fail');

const firstFail = r.firstFailure['interference'];
if (!firstFail) throw new Error('sweep: expected a firstFailure entry for interference');

console.log(
  `[smoke] sweep-tolerance dispatch OK: combosEvaluated=${r.combosEvaluated}, ` +
    `firstFailGap=${firstFail.combo['GapMm']}`,
);

return box(10, 10, 10);
