// Correct: spur gear pair (m1.5, 16T:32T) turning on two posts of a base
// plate, coupled by a declared gear-pair transmission.
const m = 1.5;
const z1 = 16;
const z2 = 32;
const cd = (m * (z1 + z2)) / 2;
const plate = box(90, 70, 5).translate(-20, -35, 0)
  .union(cylinder(17, 2.9).translate(0, 0, 3))
  .union(cylinder(17, 3.9).translate(cd, 0, 3));
const pinion = spurGear({ module: m, teeth: z1, faceWidth: 10, bore: 6, backlash: 0.15 }).translate(0, 0, 5);
const gear = spurGear({ module: m, teeth: z2, faceWidth: 10, bore: 8, backlash: 0.15 })
  .rotateZ(z2 % 2 === 0 ? 180 / z2 : 0)
  .translate(cd, 0, 5);

const asm = assembly('gear-train');
const p = asm.part('plate', plate, { material: 'aluminum-6061' });
const g1 = asm.part('pinion', pinion, { material: 'nylon' });
const g2 = asm.part('gear', gear, { material: 'nylon' });
p.connector('pinion-axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 0, 1] });
g1.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [0, 0, 5] }, axis: [0, 0, 1] });
p.connector('gear-axis', { type: 'axis', origin: { kind: 'vec3', value: [cd, 0, 5] }, axis: [0, 0, 1] });
g2.connector('axis', { type: 'axis', origin: { kind: 'vec3', value: [cd, 0, 5] }, axis: [0, 0, 1] });
asm.mate('drive', 'plate.pinion-axis', 'pinion.axis', 'revolute', { limitsDeg: [-180, 180] });
asm.mate('driven', 'plate.gear-axis', 'gear.axis', 'revolute', { limitsDeg: [-90, 90] });
asm.coupleMates('driven', { source: 'drive', ratio: -z1 / z2 });
asm.transmission('gears', {
  kind: 'gear-pair', sourceMate: 'drive', drivenMates: ['driven'],
  input: 'pinion', output: 'gear', path: ['pinion', 'gear'], ratio: -z1 / z2,
});
return asm.solvedModel({});
