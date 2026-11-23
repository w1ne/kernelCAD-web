// Suggested joint limit from a wall the carriage approaches along +X.
// The rail and the carriage are the prismatic pair, so their near-contact
// is not a stop. The wall is. Authored limits stay short of the wall; the
// suggestion searches past them and returns a snippet. Nothing here writes
// the suggestion back onto the mate.
//
// Run:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/joint-range-suggestion.kcad.ts

const arm = assembly('joint-range-suggestion');

// The rail is one part: an end block and the bed the carriage slides on.
const rail = arm.part('rail', box(10, 30, 20).union(box(50, 30, 4).translate(0, 0, -4)));
const carriage = arm.part('carriage', box(20, 16, 12));
// The wall stands on the bed and is fastened to it at the shared face z = 0.
const wall = arm.part('wall', box(10, 12, 20).translate(40, 0, 0));

rail.connector('track', {
  type: 'axis',
  origin: { kind: 'vec3', value: [10, 15, 10] },
  axis: [1, 0, 0],
});
carriage.connector('slide', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 8, 10] },
  axis: [1, 0, 0],
});
rail.connector('wallSeat', {
  type: 'frame',
  origin: { kind: 'vec3', value: [45, 6, 0] },
});
wall.connector('seat', {
  type: 'frame',
  origin: { kind: 'vec3', value: [45, 6, 0] },
});
arm.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
  pose: 0.1,
  limitsMm: [0.1, 8],
});
arm.mate('wallMount', 'rail.wallSeat', 'wall.seat', 'fastened');

const suggested = await kinematic.suggestJointRanges(arm, {
  joint: 'slide',
  search: [-2, 20],
  resolution: 0.05,
});
const upper = suggested.joints[0]?.upper;
console.log(
  `[joint-range] ok=${suggested.ok} status=${upper?.status} ` +
    `value=${upper?.value} pair=${upper?.pair?.a}/${upper?.pair?.b}`,
);
console.log(suggested.limitsSnippet);
// Analytic stop is 9.7 mm. The reported value is the clear side of a
// 0.05 mm bracket, so it stays at or short of 9.7 and within one step of it.
const analyticStop = 9.7;
const resolution = 0.05;
if (
  upper?.status !== 'stop' ||
  upper.value === undefined ||
  upper.value > analyticStop + 1e-4 ||
  upper.value < analyticStop - resolution - 1e-4
) {
  throw new Error(`joint-range example expected a clear-side stop at or short of 9.7 mm, got ${JSON.stringify(upper)}`);
}
if (upper.pair?.a !== 'carriage' || upper.pair?.b !== 'wall') {
  throw new Error(`joint-range example expected carriage/wall, got ${JSON.stringify(upper.pair)}`);
}

// Return the authored rest. The suggestion is a snippet, not a rewritten limit.
return arm.solvedModel({ slide: 0.1 });
