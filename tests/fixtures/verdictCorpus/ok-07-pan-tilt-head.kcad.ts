// Correct: pan-tilt camera head. The yoke pans on the base about Z on a
// pivot pin; the camera head tilts about X on trunnion pins running in the
// yoke arms' bores.
const base = box(60, 60, 10, true).translate(0, 0, 5)
  .subtract(cylinder(11, 3.1).translate(0, 0, 0));
const yoke = cylinder(5, 25).translate(0, 0, 10)
  .union(cylinder(12, 3).translate(0, 0, 0))
  .union(box(4, 24, 40, true).translate(-18, 0, 35))
  .union(box(4, 24, 40, true).translate(18, 0, 35))
  .subtract(cylinder(44, 2.1).rotateY(90).translate(-22, 0, 40));
const head = box(28, 20, 20, true).translate(0, 0, 40)
  .union(cylinder(40, 2).rotateY(90).translate(-20, 0, 40));

const asm = assembly('pan-tilt');
const b = asm.part('base', base, { material: 'pla' });
const y = asm.part('yoke', yoke, { material: 'pla' });
const h = asm.part('head', head, { material: 'pla' });
b.connector('pan', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
y.connector('pan', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 10] }, axis: [0, 0, 1] });
y.connector('tilt', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 40] }, axis: [1, 0, 0] });
h.connector('tilt', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 40] }, axis: [1, 0, 0] });
asm.mate('pan', 'base.pan', 'yoke.pan', 'revolute', { limitsDeg: [-170, 170] });
asm.mate('tilt', 'yoke.tilt', 'head.tilt', 'revolute', { limitsDeg: [-45, 45] });
return asm.solvedModel({});
