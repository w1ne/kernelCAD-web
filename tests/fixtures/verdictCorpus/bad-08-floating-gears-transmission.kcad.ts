// BROKEN (floating gears): a gear-pair transmission is declared, but no
// axle mate links either gear to anything — the gears float.
const m = 1.5;
const z1 = 16;
const z2 = 32;
const cd = (m * (z1 + z2)) / 2;
const asm = assembly('floating-gears');
asm.part('plate', box(90, 70, 5).translate(-20, -35, -5));
asm.part('pinion', spurGear({ module: m, teeth: z1, faceWidth: 10, bore: 6, backlash: 0.15 }));
asm.part('gear', spurGear({ module: m, teeth: z2, faceWidth: 10, bore: 8, backlash: 0.15 })
  .rotateZ(180 / z2).translate(cd, 0, 0));
asm.transmission('gears', {
  kind: 'gear-pair', sourceMate: 'drive', drivenMates: ['driven'],
  input: 'pinion', output: 'gear', path: ['pinion', 'gear'], ratio: -z1 / z2,
});
return asm.solvedModel({});
