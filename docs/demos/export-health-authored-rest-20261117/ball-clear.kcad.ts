// Ball wrist authored at extrinsic XYZ [0, 90, 0]. MuJoCo keeps the ball
// qpos0 at the identity quaternion, so this Euler triple is the link body
// frame. At that pose the link occupies x = 15..25 mm. The free stop
// occupies x = 50..70 mm and is clear. The check reads the captured assembly.

const arm = assembly('ball-clear');

arm.part('base', box(40, 40, 10, true))
  .connector('wrist', { type: 'ball', origin: { kind: 'vec3', value: [20, 0, 0] } });
arm.part('link', box(40, 10, 10, true))
  .connector('wrist', { type: 'ball', origin: { kind: 'vec3', value: [-20, 0, 0] } });
arm.part('stop', box(20, 10, 10, true), { at: [60, 0, 0] });
arm.mate('wrist', 'base.wrist', 'link.wrist', 'ball', { pose: [0, 90, 0] });
