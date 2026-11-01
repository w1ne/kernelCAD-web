// Original kernelCAD low-poly bipedal mech: a chamfered armoured cabin with a
// wide visor on a hip block, two heavy legs with hip, knee and ankle pivots,
// and a weapon pod on each shoulder that pitches. The cabin turns on the
// hips. Every joint is a revolute mate; pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'mech-walker',
  license: 'CC0-1.0',
  title: 'Mech walker',
  description: 'Two-legged armoured mech with a turning cabin, wide visor, shoulder weapon pods and heavy legs, with torso, hip, knee, ankle and pod pivots rigged as GLB nodes. Knobs: size, pods, armour, frame, accent and visor colours.',
  tags: ['mech', 'robot', 'walker', 'mecha', 'bipedal', 'war machine', 'sci-fi', 'enemy', 'boss', 'rigged'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character', 'vehicle'],
  triangleBudget: 800,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const pods = param('pods', 'cannons', { choices: ['cannons', 'missiles'], label: 'Shoulder pods' });
const armour = param('armour', '#7d8a5a', { label: 'Armour' });
const frame = param('frame', '#3a3d40', { label: 'Frame and joints' });
const accent = param('accent', '#e8b13a', { label: 'Accent stripes' });
const visor = param('visor', '#46e0ff', { label: 'Visor and lights' });

presets({
  desert: { armour: '#c9a46a', accent: '#8a3a24', visor: '#ffb03a' },
  arctic: { armour: '#e6eaee', frame: '#5a6068', accent: '#d8342c' },
  night: { armour: '#2b2f36', frame: '#15171a', accent: '#5a2fd0', visor: '#ff3b30' },
});

const s = size.value === 'small' ? 0.6 : size.value === 'large' ? 1.5 : 1;
const r = assembly('mech-walker');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x * s, y * s, z * s] as [number, number, number] });
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
// Chamfered-rectangle ring, w wide (X) and h tall, centred at (0, dz); mm, unscaled.
const ring = (w: number, h: number, dz: number) => {
  const a = (w / 2) * s;
  const b = (h / 2) * s;
  const c = Math.min(w, h) * 0.25 * s;
  const z = dz * s;
  return path().moveTo(-a + c, z - b).lineTo(a - c, z - b).lineTo(a, z - b + c).lineTo(a, z + b - c)
    .lineTo(a - c, z + b).lineTo(-a + c, z + b).lineTo(-a, z + b - c).lineTo(-a, z - b + c).close();
};
// Square rod from p0 to p1, w0 to w1 thick.
const rod = (p0: [number, number, number], p1: [number, number, number], w0: number, w1: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const sq = (w: number) => path().moveTo(-w * s / 2, -w * s / 2).lineTo(w * s / 2, -w * s / 2).lineTo(w * s / 2, w * s / 2).lineTo(-w * s / 2, w * s / 2).close();
  return sq(w0).loft(sq(w1), { spacing: len * s, ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0] * s, p0[1] * s, p0[2] * s);
};
// Corner-to-corner box.
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box((x1 - x0) * s, (y1 - y0) * s, (z1 - z0) * s).translate(x0 * s, y0 * s, z0 * s);
const hipZ = 1450;
const kneeZ = 820;
const ankleZ = 220;
const hipX = 330;

add('pelvis', blk(-300, -200, hipZ - 120, 300, 200, hipZ + 120).union(blk(-hipX - 60, -90, hipZ - 90, hipX + 60, 90, hipZ + 90)).color(frame));

// Cabin: chamfered armoured box, wide visor, accent stripe; yaws on the pelvis.
const cz = hipZ + 140;
add('cabin', ring(700, 600, 0).loft([ring(820, 700, 0), ring(820, 700, 0), ring(640, 560, 0)], {
  planes: [0, 120, 600, 800].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
  ruled: true,
}).translate(0, 0, cz * s).union(blk(-120, -120, hipZ + 80, 120, 120, cz + 20)).color(armour));
add('visor', blk(-300, -362, cz + 430, 300, -330, cz + 560).color(visor));
fix('cabin', 'visor', at(0, -350, cz + 495));
add('stripe', blk(-425, -290, cz + 250, 425, 290, cz + 320).color(accent));
fix('cabin', 'stripe', at(0, 0, cz + 285));
add('sensor', blk(-40, 100, cz + 790, 40, 180, cz + 1000).union(blk(-90, 110, cz + 980, 90, 170, cz + 1030)).color(frame));
fix('cabin', 'sensor', at(0, 140, cz + 800));
hinge('pelvis', 'cabin', 'torso-yaw', at(0, 0, hipZ + 120), [0, 0, 1], [-90, 90]);

// Shoulder pods pitch about X on stub axles.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const px = sd * 560;
  const pz = cz + 520;
  let pod = blk(px - 120, -300, pz - 110, px + 120, 220, pz + 110).union(blk(sd * 380, -60, pz - 50, sd * 450, 60, pz + 50));
  if (pods.value === 'cannons') {
    pod = pod.union(rod([px, -290, pz], [px, -720, pz], 90, 70));
  } else {
    for (const [dx, dz] of [[-55, -50], [55, -50], [-55, 50], [55, 50]]) pod = pod.union(blk(px + dx - 35, -330, pz + dz - 35, px + dx + 35, -290, pz + dz + 35));
  }
  add(`${nm}-pod`, pod.color(armour));
  add(`${nm}-pod-trim`, blk(px - 124, 60, pz - 114, px + 124, 120, pz + 114).color(accent));
  fix(`${nm}-pod`, `${nm}-pod-trim`, at(px, 90, pz));
  hinge('cabin', `${nm}-pod`, `${nm}-pod-pitch`, at(sd * 420, 0, pz), [1, 0, 0], [-30, 45]);
}

// Legs: armoured thigh, shin with a knee guard, broad foot.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x = sd * (hipX + 130);
  add(`${nm}-thigh`, rod([x, 0, hipZ + 60], [x, -120, kneeZ - 30], 220, 170).union(blk(x - 120, -110, hipZ - 110, x + 120, 110, hipZ + 110)).color(armour));
  add(`${nm}-shin`, rod([x, -120, kneeZ + 30], [x, 30, ankleZ - 20], 170, 130)
    .union(blk(x - 110, -250, kneeZ - 140, x + 110, -110, kneeZ + 120)).color(frame));
  add(`${nm}-knee-guard`, blk(x - 116, -270, kneeZ - 100, x + 116, -240, kneeZ + 100).color(accent));
  fix(`${nm}-shin`, `${nm}-knee-guard`, at(x, -255, kneeZ));
  add(`${nm}-foot`, blk(x - 170, -380, 0, x + 170, 260, 130).union(blk(x - 90, -60, 120, x + 90, 120, ankleZ + 60)).color(armour));
  hinge('pelvis', `${nm}-thigh`, `${nm}-hip`, at(x, 0, hipZ), [1, 0, 0], [-60, 45]);
  hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(x, -120, kneeZ), [1, 0, 0], [0, 110]);
  hinge(`${nm}-shin`, `${nm}-foot`, `${nm}-ankle`, at(x, 30, ankleZ), [1, 0, 0], [-35, 35]);
}

return r.model();
