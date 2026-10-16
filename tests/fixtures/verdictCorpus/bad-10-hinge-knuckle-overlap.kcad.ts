// BROKEN (small-part interference): butt hinge whose knuckles overlap axially
// by 0.1 mm at each joint (axGap = -0.2) — ~10 mm³ of real shared volume on
// ~2400 mm³ leaves. Below the old uniform 20 mm³ cap, so it used to pass;
// the per-pair cap (0.2 % of the smaller part) catches it. The same hinge
// with a 0.4 mm gap (1.13 mm³ plate graze) stays contact noise.
const len = 40, leafW = 27, t = 2;
const kOD = 6, kID = 3.2, pinD = 3, axGap = -0.2;
const tube = (x0: number, x1: number) =>
  cylinder(x1 - x0, kOD / 2).subtract(cylinder(x1 - x0 + 2, kID / 2).translate(0, 0, -1)).rotateY(90).translate(x0, 0, 0);
const seg = len / 3;
// Leaf A: plate on -Y, outer knuckles
let leafA = box(len, leafW, t).translate(0, -leafW - 2, -t / 2);
leafA = union(leafA, tube(0, seg - axGap / 2), tube(2 * seg + axGap / 2, len));
// Leaf B: plate on +Y, middle knuckle
let leafB = box(len, leafW, t).translate(0, 2, -t / 2);
leafB = union(leafB, tube(seg + axGap / 2, 2 * seg - axGap / 2));
// The leaf plate must not hit the other leaf's knuckles: notch each plate where the other's knuckles sit
leafA = leafA.subtract(box(seg + axGap, 4, t + 2).translate(seg - axGap / 2, -4, -t / 2 - 1));
leafB = leafB.subtract(box(seg + axGap / 2, 4, t + 2).translate(-1, 1.5, -t / 2 - 1));
leafB = leafB.subtract(box(seg + 1, 4, t + 2).translate(2 * seg - axGap / 2, 1.5, -t / 2 - 1));
const pin = cylinder(len, pinD / 2).rotateY(90);

const arm = assembly('hinge');
arm.part('leafA', leafA, { material: 'steel' })
  .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] })
  .connector('pinSeat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.part('leafB', leafB, { material: 'steel' })
  .connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 0] }, axis: [1, 0, 0] });
arm.part('pin', pin, { material: 'steel' })
  .connector('seat', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 0] } });
arm.mate('hinge', 'leafA.axis', 'leafB.axis', 'revolute', { limitsDeg: [-90, 90] });
arm.mate('pin-fixed', 'leafA.pinSeat', 'pin.seat', 'fastened');
return arm.model();
