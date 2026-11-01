// Original kernelCAD low-poly spider robot: a faceted domed body slung between
// six or eight jointed legs, each with a hip that swings about Z and a knee
// that lifts the shin, plus a sensor turret that pans on top. Every joint is a
// revolute mate; pose 0 is the as-built pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'spider-bot',
  license: 'CC0-1.0',
  title: 'Spider bot',
  description: 'Multi-legged spider robot with a domed body, a panning sensor turret and six or eight two-link legs whose hips and knees are rigged as GLB pivots. Knobs: legs, size, shell, leg, joint and sensor colours.',
  tags: ['robot', 'spider', 'hexapod', 'crawler', 'insect', 'enemy', 'mech', 'rigged', 'sci-fi'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character'],
  triangleBudget: 800,
});

const legs = param('legs', '6', { choices: ['6', '8'], label: 'Legs' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const shell = param('shell', '#3b4048', { label: 'Shell' });
const leg = param('leg', '#8a9097', { label: 'Legs' });
const joint = param('joint', '#e0a32e', { label: 'Joints' });
const sensor = param('sensor', '#ff3b30', { label: 'Sensor' });

presets({
  toxic: { shell: '#2f3a2a', joint: '#9be03a', sensor: '#9be03a' },
  arctic: { shell: '#e8ecef', leg: '#9aa3ab', joint: '#2f7fd8', sensor: '#46e0ff' },
});

const s = size.value === 'small' ? 0.6 : size.value === 'large' ? 1.6 : 1;
const n = Number(legs.value);
const r = assembly('spider-bot');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x * s, y * s, z * s] as [number, number, number] });
const hinge = (parent: string, child: string, name: string, o: { kind: 'vec3'; value: [number, number, number] }, axis: [number, number, number], limitsDeg: [number, number]) => {
  refs[parent].connector(name, { type: 'axis', origin: o, axis });
  refs[child].connector(name, { type: 'axis', origin: o, axis });
  r.mate(name, `${parent}.${name}`, `${child}.${name}`, 'revolute', { pose: 0, limitsDeg });
};
const ngon = (rad: number, k: number, rot = 0) => {
  let p = path().moveTo(rad * s * Math.cos(rot), rad * s * Math.sin(rot));
  for (let i = 1; i < k; i++) {
    const a = rot + (2 * Math.PI * i) / k;
    p = p.lineTo(rad * s * Math.cos(a), rad * s * Math.sin(a));
  }
  return p.close();
};
// Square rod from p0 to p1 (mm, unscaled).
const rod = (p0: [number, number, number], p1: [number, number, number], w0: number, w1: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const sq = (w: number) => path().moveTo(-w / 2, -w / 2).lineTo(w / 2, -w / 2).lineTo(w / 2, w / 2).lineTo(-w / 2, w / 2).close();
  return sq(w0 * s).loft(sq(w1 * s), { spacing: len * s, ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0] * s, p0[1] * s, p0[2] * s);
};
const stack = (rings: [number, number][], k: number) =>
  ngon(rings[0][0], k).loft(rings.slice(1).map(([rr], i) => ngon(rr, k, (i % 2) * (Math.PI / k))), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });

const hipZ = 190;
const hipR = 120;
add('body', stack([[90, 120], [150, 165], [140, 230], [80, 270]], 8).color(shell));
add('turret', stack([[55, 265], [60, 300], [40, 330]], 6)
  .union(box(36 * s, 70 * s, 26 * s, true).translate(0, -55 * s, 300 * s)).color(leg));
hinge('body', 'turret', 'turret-pan', at(0, 0, 268), [0, 0, 1], [-160, 160]);
add('sensor', box(30 * s, 14 * s, 18 * s, true).translate(0, -95 * s, 300 * s).color(sensor));
hinge('turret', 'sensor', 'sensor-tilt', at(0, -90, 300), [1, 0, 0], [-30, 30]);

// Legs fan out round the body, skipping straight ahead and behind.
for (let i = 0; i < n; i++) {
  const half = n / 2;
  const sd = i < half ? 1 : -1;
  const j = i % half;
  const spread = n === 6 ? 50 : 36;
  const a = ((sd > 0 ? 0 : 180) + (j - (half - 1) / 2) * spread * sd) * (Math.PI / 180);
  const c = Math.cos(a);
  const sn = Math.sin(a);
  const hip: [number, number, number] = [hipR * c, hipR * sn, hipZ];
  const knee: [number, number, number] = [260 * c, 260 * sn, 300];
  const foot: [number, number, number] = [380 * c, 380 * sn, 14];
  const nm = `leg-${i + 1}`;
  add(`${nm}-thigh`, rod([90 * c, 90 * sn, hipZ - 10], knee, 40, 30).color(leg));
  add(`${nm}-shin`, rod(knee, foot, 30, 16)
    .union(box(30 * s, 30 * s, 20 * s, true).translate(foot[0] * s, foot[1] * s, 10 * s))
    .union(box(44 * s, 44 * s, 44 * s, true).translate(knee[0] * s, knee[1] * s, knee[2] * s)).color(joint));
  hinge('body', `${nm}-thigh`, `${nm}-hip`, at(...hip), [0, 0, 1], [-30, 30]);
  hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(...knee), [-sn, c, 0], [-45, 35]);
}

return r.model();
