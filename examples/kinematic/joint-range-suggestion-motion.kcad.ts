// Motion capture for the joint-range suggestion. The carriage slides toward
// the wall and stops at the clear side of the 0.3 mm crossing. The mate
// limits include that stop and stop short of solid overlap (the faces meet
// at slide 10). Nothing writes the suggestion back onto the mate.
//
// Run:
//   npx tsx src/agent/cli/index.ts evaluate examples/kinematic/joint-range-suggestion-motion.kcad.ts
//   npx tsx src/agent/cli/index.ts animate examples/kinematic/joint-range-suggestion-motion.kcad.ts docs/demos/joint-range-suggestion/joint-range-suggestion.mp4 --fps 12 --pose 0,8 --lock-frame --backdrop white

const slideMm = param('slideMm', 0.1, { min: 0.1, max: 9.8 });

const arm = assembly('joint-range-suggestion-motion');
// The rail is one part: an end block and the bed the carriage slides on.
const rail = arm.part('rail', box(10, 30, 20).union(box(50, 30, 4).translate(0, 0, -4)).color('#8d939c'));
const carriage = arm.part('carriage', box(20, 16, 12).color('#d97706'));
// The wall stands on the bed and is fastened to it at the shared face z = 0.
const wall = arm.part('wall', box(10, 12, 20).translate(40, 0, 0).color('#1e3a5f'));

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
  pose: slideMm,
  limitsMm: [0.1, 9.8],
});
arm.mate('wallMount', 'rail.wallSeat', 'wall.seat', 'fastened');

const suggested = await kinematic.suggestJointRanges(arm, {
  joint: 'slide',
  resolution: 0.05,
});
const upper = suggested.joints[0]?.upper;
const analyticStop = 9.7;
if (
  suggested.ok !== true ||
  upper?.status !== 'stop' ||
  upper.value === undefined ||
  upper.value > analyticStop + 1e-4 ||
  upper.value < analyticStop - 0.05 - 1e-4 ||
  upper.pair?.a !== 'carriage' ||
  upper.pair?.b !== 'wall'
) {
  throw new Error(`joint-range motion expected a clear-side carriage/wall stop at or short of 9.7 mm, got ${JSON.stringify(suggested.joints[0])}`);
}

setCameraTarget(36, 12, 10);
setCameraDistance(48);
animationView({
  name: 'carriage to clear-side stop',
  tracks: [{
    param: 'slideMm',
    keys: [
      { atMs: 0, value: 0.1 },
      { atMs: 2000, value: upper.value },
    ],
  }],
  fps: 12,
});
console.log(
  `[joint-range-motion] stop=${upper.value} pair=${upper.pair.a}/${upper.pair.b} resolution=${upper.resolution}`,
);

return arm.solvedModel({});
