// Fastened-mate contact fixture: an 8 mm block buried inside a stepped
// two-cylinder boss. Its faces are 2 mm from the boss faces, but the solids
// share volume, so they touch (must pass the mate-contact check).
const asm = assembly('mate-contact-nested');
asm.part('boss', cylinder(18, 22, 32).translate(0, 0, 9).union(cylinder(8, 10, 32).translate(0, 0, 22)))
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
asm.part('block', box(8, 8, 8, true).translate(0, 0, 24))
  .connector('mount', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 24] } });
asm.mate('block-in-boss', 'block.mount', 'boss.mount', 'fastened');
return asm.solvedModel({});
