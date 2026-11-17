// Same solids as ball-clear.kcad.ts at the zero Euler triple. The link
// occupies x = 20..60 mm and the stop occupies x = 50..70 mm, a 10×10×10 mm³
// overlap, 10 mm deep. The check reads the captured assembly.

const arm = assembly('ball-overlap');

arm.part('base', box(40, 40, 10, true))
  .connector('wrist', { type: 'ball', origin: { kind: 'vec3', value: [20, 0, 0] } });
arm.part('link', box(40, 10, 10, true))
  .connector('wrist', { type: 'ball', origin: { kind: 'vec3', value: [-20, 0, 0] } });
arm.part('stop', box(20, 10, 10, true), { at: [60, 0, 0] });
arm.mate('wrist', 'base.wrist', 'link.wrist', 'ball', { pose: [0, 0, 0] });
