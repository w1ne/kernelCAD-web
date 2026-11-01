// Original kernelCAD low-poly blocky villager: a chunky box-built person with
// a big head, hair block, shirt, belt, trousers and boots, rigged at the neck,
// shoulders, elbows, hips and knees. Every link is authored standing and each
// joint connector sits at the same point on both links, so pose 0 is as built.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'blocky-villager',
  license: 'CC0-1.0',
  title: 'Blocky villager',
  description: 'Chunky box-built villager NPC with a big head, hair, shirt, belt, trousers and boots, with neck, shoulder, elbow, hip and knee pivots rigged as GLB nodes. Knobs: height, hair style, skin, hair, shirt, trousers and boot colours.',
  tags: ['villager', 'person', 'human', 'npc', 'blocky', 'voxel', 'humanoid', 'character', 'peasant', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['character', 'village', 'medieval', 'placeholder'],
  triangleBudget: 500,
});

const height = param('height', 'adult', { choices: ['child', 'adult', 'tall'], label: 'Height' });
const hair = param('hair', 'short', { choices: ['short', 'long', 'bald'], label: 'Hair style' });
const hat = param('hat', 'straw', { choices: ['straw', 'cap', 'none'], label: 'Hat' });
const skin = param('skin', '#e0ac7e', { label: 'Skin' });
const hairColor = param('hairColor', '#4a3020', { label: 'Hair' });
const shirt = param('shirt', '#3f7d4a', { label: 'Shirt' });
const pants = param('pants', '#5a4632', { label: 'Trousers' });
const boots = param('boots', '#2e2420', { label: 'Boots and belt' });
const hatColor = param('hatColor', '#d9b860', { label: 'Hat' });

presets({
  farmer: { shirt: '#c9b07a', pants: '#3e5a8a', hairColor: '#c99a4a', hatColor: '#e6c873' },
  smith: { shirt: '#7a3a2a', pants: '#3a3a3a', skin: '#8a5a3c', hairColor: '#1e1a18', hatColor: '#3a3a3a' },
  merchant: { shirt: '#5a3a8a', pants: '#2e2e3a', hairColor: '#8a8580', hatColor: '#8a2f3a' },
});

const h = height.value === 'child' ? 0.65 : height.value === 'tall' ? 1.12 : 1;
const r = assembly('blocky-villager');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x * h, y * h, z * h] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};
const fix = (parent: string, child: string, o: { kind: 'vec3'; value: [number, number, number] }) => {
  refs[parent].connector(child, { type: 'frame', origin: o });
  refs[child].connector(child, { type: 'frame', origin: o });
  r.mate(child, `${parent}.${child}`, `${child}.${child}`, 'fastened');
};
// Corner-to-corner box, unscaled mm.
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box((x1 - x0) * h, (y1 - y0) * h, (z1 - z0) * h).translate(x0 * h, y0 * h, z0 * h);

const kneeZ = 420;
const hipZ = 800;
const shoulderZ = 1280;
const neckZ = 1340;
const elbowZ = 1040;

add('torso', blk(-190, -100, hipZ - 20, 190, 100, neckZ).color(shirt));
add('belt', blk(-195, -105, hipZ, 195, 105, hipZ + 60).color(boots));
fix('torso', 'belt', at(0, 0, hipZ + 30));
add('hips', blk(-190, -100, hipZ - 100, 190, 100, hipZ + 5).color(pants));
fix('torso', 'hips', at(0, 0, hipZ - 50));

// Big head with a nose, eyes and hair block; nods about X at the neck.
add('head', blk(-60, -50, neckZ - 30, 60, 50, neckZ + 20).union(blk(-170, -160, neckZ + 10, 170, 160, neckZ + 330))
  .union(blk(-25, -195, neckZ + 120, 25, -150, neckZ + 200)).color(skin));
add('eyes', blk(-110, -165, neckZ + 200, -55, -150, neckZ + 240).union(blk(-60, -164, neckZ + 225, 60, -152, neckZ + 238))
  .union(blk(55, -165, neckZ + 200, 110, -150, neckZ + 240)).color(boots));
fix('head', 'eyes', at(0, -160, neckZ + 220));
if (hair.value !== 'bald') {
  const back = hair.value === 'long' ? neckZ - 60 : neckZ + 150;
  add('hair', blk(-180, -170, neckZ + 270, 180, 170, neckZ + 360)
    .union(blk(-180, 100, back, 180, 170, neckZ + 300))
    .union(blk(-180, -170, neckZ + 230, -150, 110, neckZ + 300))
    .union(blk(150, -170, neckZ + 230, 180, 110, neckZ + 300)).color(hairColor));
  fix('head', 'hair', at(0, 0, neckZ + 300));
}
if (hat.value === 'straw') {
  add('hat', blk(-260, -260, neckZ + 330, 260, 260, neckZ + 360).union(blk(-175, -175, neckZ + 340, 175, 175, neckZ + 450)).color(hatColor));
  fix('head', 'hat', at(0, 0, neckZ + 345));
} else if (hat.value === 'cap') {
  add('hat', blk(-185, -175, neckZ + 300, 185, 175, neckZ + 400).union(blk(-150, -300, neckZ + 300, 150, -170, neckZ + 330)).color(hatColor));
  fix('head', 'hat', at(0, 0, neckZ + 345));
}
hinge('torso', 'head', 'neck', at(0, 0, neckZ), [1, 0, 0], [-35, 35]);

for (const sd of [-1, 1]) {
  const s = sd < 0 ? 'left' : 'right';
  const ax = sd * 265;
  add(`${s}-upper-arm`, blk(ax - 75, -75, elbowZ, ax + 75, 75, neckZ - 10).color(shirt));
  add(`${s}-forearm`, blk(ax - 70, -70, elbowZ - 260, ax + 70, 70, elbowZ + 10)
    .union(blk(ax - 72, -72, elbowZ - 330, ax + 72, 72, elbowZ - 250)).color(skin));
  hinge('torso', `${s}-upper-arm`, `${s}-shoulder`, at(ax, 0, shoulderZ), [1, 0, 0], [-170, 60]);
  hinge(`${s}-upper-arm`, `${s}-forearm`, `${s}-elbow`, at(ax, 0, elbowZ), [1, 0, 0], [-140, 0]);

  const lx = sd * 95;
  add(`${s}-thigh`, blk(lx - 90, -90, kneeZ, lx + 90, 90, hipZ - 60).color(pants));
  add(`${s}-shin`, blk(lx - 88, -88, 140, lx + 88, 88, kneeZ + 10).color(pants));
  add(`${s}-boot`, blk(lx - 95, -140, 0, lx + 95, 100, 160).color(boots));
  fix(`${s}-shin`, `${s}-boot`, at(lx, 0, 150));
  hinge('hips', `${s}-thigh`, `${s}-hip`, at(lx, 0, hipZ - 60), [1, 0, 0], [-100, 45]);
  hinge(`${s}-thigh`, `${s}-shin`, `${s}-knee`, at(lx, 0, kneeZ), [1, 0, 0], [0, 130]);
}

return r.model();
