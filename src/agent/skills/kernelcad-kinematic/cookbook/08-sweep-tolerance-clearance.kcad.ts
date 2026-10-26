// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
// expected: []
//
// Snippet 8 — sweepTolerance surveying an interference gate across a
// clearance-tolerance range and bisecting the transition.
//
// Two boxes with a swept clearance gap param. At gap >= 0 the boxes clear;
// at gap = -5 mm they overlap by 5 mm along the shared axis. The sweep both
// measures the ledger and bisects the interference transition to report the
// boundary and the binding gate. This is the classic tolerance-stackup
// question: "does this design still clear once the real part comes out
// oversized." The cookbook harness only checks diagnostic codes on the OUTER
// (this file's) evaluation, so the assertions below run in-script against the
// sweep's own returned envelope.

const code = `
  const arm = assembly('cookbook-sweep-clearance');
  const gap = param('GapMm', 10);
  const a = box(20, 20, 20, true);
  const b = box(20, 20, 20, true).translate(gap.add(20), 0, 0);
  arm.part('a', a);
  arm.part('b', b);
  return arm.solvedModel({});
`;

const sweep = await kinematic.sweepTolerance({
  code,
  params: { GapMm: { values: [10, 2, 0, -5] } },
  gates: { interference: true, mountingHoles: false, jointAxis: false },
});
if (sweep.source !== 'local') throw new Error('sweep: source !== local');
if (sweep.ok) throw new Error('sweep: expected ok=false (the -5 combo overlaps)');
if (sweep.combosEvaluated !== 4) throw new Error(`sweep: expected 4 combos, got ${sweep.combosEvaluated}`);
const firstFail = sweep.firstFailure['interference'];
if (!firstFail || firstFail.combo['GapMm'] !== -5)
  throw new Error('sweep: expected the -5 combo to be the first interference failure');
const interferenceBoundary = sweep.boundaries.find((b) => b.bindingGates.includes('interference'));
if (!interferenceBoundary) throw new Error('sweep: expected a bisected interference boundary');
if (Math.abs(interferenceBoundary.value) > 0.01)
  throw new Error(`sweep: expected the interference boundary near 0 mm, got ${interferenceBoundary.value}`);
if (!/Checked at 4 points plus 1 boundary/.test(sweep.coverage.statement))
  throw new Error('sweep: coverage must state the checked point count, not a proof');

return box(10, 10, 10);
