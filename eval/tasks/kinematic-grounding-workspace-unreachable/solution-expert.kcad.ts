// v0.7 Slice 1 workspace-reachability demonstration — a 1-DOF revolute
// arm with tight ±10° limits and a tracked tip connector. The expert
// declares a target on the opposite side of the arm (world [-200, 10, 10])
// which the tip cannot reach across its narrow swept arc. The validator
// emits `assembly.workspace.unreachable`; the script asserts the warning
// is present and returns the scene.
//
// Mirrors src/modeling/mates/workspaceReachability.test.ts §"throws
// KernelError when a workspace target is unreachable".

const pivot = box(20, 20, 20);
const link = box(80, 20, 10);

const arm = assembly('workspace-unreachable-demo');

arm
  .part('pivot', pivot, { at: [0, 0, 0] })
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: [20, 10, 10] },
    axis: [0, 1, 0],
  });
arm
  .part('link', link)
  .connector('axis', {
    type: 'axis',
    origin: { kind: 'vec3', value: [0, 10, 5] },
    axis: [0, 1, 0],
  })
  .connector('tip', {
    type: 'frame',
    origin: { kind: 'vec3', value: [80, 10, 5] },
  });
arm.mate('yaw', 'pivot.axis', 'link.axis', 'revolute', { limitsDeg: [-10, 10] });

arm.workspace('link.tip', {
  reachable: [[-200, 10, 10]],
  toleranceMm: 5,
});

const scene = await arm.solvedModel({}, { validate: 'warn', posesGate: 'envelope' });

const fired = scene.warnings.some((d) => d.code === 'assembly.workspace.unreachable');
if (!fired) {
  throw new Error(
    'Slice 1 demonstration failed: expected diagnostic code ' +
      "'assembly.workspace.unreachable' was not present in scene.warnings. " +
      `Observed codes: ${scene.warnings.map((d) => d.code).join(', ') || '(none)'}`,
  );
}

return scene;
