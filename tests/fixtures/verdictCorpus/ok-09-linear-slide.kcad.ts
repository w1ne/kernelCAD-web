// Correct: carriage riding on a rail (prismatic along X, 0..140 mm travel).
const rail = box(200, 20, 10);
const carriage = box(40, 30, 16).translate(0, -5, 0)
  .subtract(box(40, 20.4, 10.2).translate(0, -0.2, 0));

const asm = assembly('linear-slide');
const r = asm.part('rail', rail, { material: 'aluminum-6061' });
const c = asm.part('carriage', carriage, { material: 'pla' });
r.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [20, 10, 10] }, axis: [1, 0, 0] });
c.connector('track', { type: 'axis', origin: { kind: 'vec3', value: [20, 10, 10] }, axis: [1, 0, 0] });
asm.mate('slide', 'rail.track', 'carriage.track', 'prismatic', { limitsMm: [0, 140] });
return asm.solvedModel({});
