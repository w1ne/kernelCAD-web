const asm = assembly('rig');
const block = asm.part('block', box(40, 40, 40), { at: [0, 0, 0] })
  .connector('p1', { type: 'axis', origin: { kind: 'vec3', value: [20, 20, 40] }, axis: [0, 0, 1], port: { system: 'fuel', od: 10 } })
  .connector('p2', { type: 'axis', origin: { kind: 'vec3', value: [40, 20, 20] }, axis: [1, 0, 0], port: { system: 'bleed', od: 10 } });
const wall = asm.part('wall', box(10, 200, 200), { at: [150, -80, 0] });
return asm.model();
