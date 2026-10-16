// BROKEN (hinge axis in empty space): the revolute axis is declared 30 mm
// above both leaves, away from any knuckle or pin.
const arm = assembly('hinge-asm');
const knuckle = (y0: number, len: number) =>
  cylinder(len, 4).rotateX(-90).translate(0, y0, 4).subtract(cylinder(len + 2, 1.6).rotateX(-90).translate(0, y0 - 1, 4));
const leafAShape = box(37, 30, 2).translate(-42, -15, 0)
  .union(box(3, 10, 2).translate(-5.5, -15, 0))
  .union(box(3, 10, 2).translate(-5.5, 5, 0))
  .union(knuckle(-15, 10))
  .union(knuckle(5, 10));
const pinShape = cylinder(36, 1.5).rotateX(-90).translate(0, -18, 4);
const leafBShape = box(37, 30, 2).translate(5, -15, 0)
  .union(box(3, 10, 2).translate(2.5, -5, 0))
  .union(cylinder(10, 4).rotateX(-90).translate(0, -5, 4))
  .union(pinShape);
const leafA = arm.part('leafA', leafAShape);
const leafB = arm.part('leafB', leafBShape);
leafA.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 34] }, axis: [0, 1, 0] });
leafB.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 34] }, axis: [0, 1, 0] });
arm.mate('hinge', 'leafA.axis', 'leafB.axis', 'revolute', { limitsDeg: [-90, 90] });
return arm.solvedModel({ hinge: 0 });
