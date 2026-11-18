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
const rail = arm.part('rail', box(10, 30, 20).color('#8d939c'));
const carriage = arm.part('carriage', box(20, 16, 12).color('#d97706'));
arm.part('wall', box(10, 12, 20).translate(40, 0, 0).color('#1e3a5f'));

rail.connector('track', {
  type: 'axis',
  origin: { kind: 'vec3', value: [10, 15, 10] },
  axis: [1, 0, 0],
});
carriage.connector('slide', {
  type: 'axis',
  origin: { kind: 'vec3', value: [0, 8, 6] },
  axis: [1, 0, 0],
});
arm.mate('slide', 'rail.track', 'carriage.slide', 'prismatic', {
  pose: slideMm,
  limitsMm: [0.1, 9.8],
});

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
