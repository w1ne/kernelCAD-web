// Correct: 5 mm motor shaft to 8 mm leadscrew through a clamp coupler.
const motor = box(42, 42, 40, true).translate(0, 0, 20)
  .union(cylinder(14, 2.45).translate(0, 0, 40));
const coupler = cylinder(25, 10)
  .hole('bottom', { u: 0, v: 0, diameter: 5, depth: 12.5 })
  .hole('top', { u: 0, v: 0, diameter: 8, depth: 12.5 })
  .translate(0, 0, 42);
const lead = cylinder(100, 3.95).translate(0, 0, 55);

const asm = assembly('coupler-drive');
const mo = asm.part('motor', motor, { material: 'mild-steel' });
const co = asm.part('coupler', coupler, { material: 'aluminum-6061' });
const ls = asm.part('leadscrew', lead, { material: 'mild-steel' });
mo.connector('shaft', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 42] } });
co.connector('low', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 42] } });
co.connector('high', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 60] } });
ls.connector('end', { type: 'frame', origin: { kind: 'vec3', value: [0, 0, 60] } });
asm.mate('motor-clamp', 'motor.shaft', 'coupler.low', 'fastened');
asm.mate('screw-clamp', 'coupler.high', 'leadscrew.end', 'fastened');
return asm.solvedModel({});
