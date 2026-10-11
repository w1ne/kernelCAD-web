// Sweep a ParamRef hole diameter through the mounting-hole gate.
//
// Two fastened plates share a bore. Side A is `.hole({ diameter: d })`
// where `d = param('HoleDia', 5)`; side B is a literal Ø5. Sweeping
// HoleDia across 5 then 12 produces a pass/fail envelope — the mismatch
// fires at 12 mm (no single metric screw fits both a Ø5 and a Ø12 hole;
// a 5 / 6 pair still passes: an M4 or M5 bolt clears both), not
// "no hole feature found".
//
// Run with:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/sweep-tolerance-hole-diameter.kcad.ts
//
// Expected console output (last line):
//   [smoke] hole-diameter sweep OK: combosEvaluated=2, firstFailDia=12

const code = `
  const arm = assembly('sweep-hole-dia');
  const d = param('HoleDia', 5);
  const a = box(20, 20, 5).hole('top', { u: 0, v: 0, diameter: d, depth: 'through' });
  const b = box(20, 20, 5).hole('bottom', { u: 0, v: 0, diameter: 5, depth: 'through' });
  arm.part('a', a).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'top' } },
  });
  arm.part('b', b).connector('h', {
    type: 'frame',
    origin: { kind: 'topology', query: { kind: 'face-center', name: 'bottom' } },
  });
  arm.mate('screw', 'a.h', 'b.h', 'fastened');
  return arm.solvedModel({});
`;

const r = await kinematic.sweepTolerance({
  code,
  params: { HoleDia: { values: [5, 12] } },
  gates: { interference: false, mountingHoles: true, jointAxis: false },
});

if (r.source !== 'local') throw new Error('sweep: source != local');
if (r.combosEvaluated !== 2) throw new Error(`sweep: expected 2 combos, got ${r.combosEvaluated}`);

const verdictByDia = new Map(r.results.map((row) => [row.combo['HoleDia'], row.gates['mounting-holes']]));
if (verdictByDia.get(5) !== 'pass') throw new Error('sweep: expected HoleDia=5 to pass');
if (verdictByDia.get(12) !== 'fail') throw new Error('sweep: expected HoleDia=12 to fail');

const firstFail = r.firstFailure['mounting-holes'];
if (!firstFail || firstFail.combo['HoleDia'] !== 12) {
  throw new Error('sweep: expected the 12 mm combo to be the first mounting-holes failure');
}

console.log(
  `[smoke] hole-diameter sweep OK: combosEvaluated=${r.combosEvaluated}, firstFailDia=${firstFail.combo['HoleDia']}`,
);

return box(10, 10, 10);
