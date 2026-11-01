// Original kernelCAD low-poly cow: a chamfered barrel body swept from
// polygon rings, a blocky head with muzzle, ears and optional horns, patch
// spots, an udder and four two-link legs with hooves, rigged at the neck,
// tail, hips and knees. Each joint connector sits at the same point on both
// links, so pose 0 is the as-built standing pose.
// Millimetres, Z up, hooves on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'cow',
  license: 'CC0-1.0',
  title: 'Cow',
  description: 'Life-size low-poly dairy cow with patch spots, udder, swishing tail and nodding head, with neck, tail, hip and knee pivots rigged as GLB nodes. Knobs: horns, spots, hide, spot, muzzle and hoof colours.',
  tags: ['cow', 'cattle', 'farm', 'animal', 'livestock', 'dairy', 'bovine', 'rigged', 'quadruped'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'farm', 'village', 'meadow', 'outdoor'],
  triangleBudget: 800,
});

const horns = param('horns', 'yes', { choices: ['yes', 'no'], label: 'Horns' });
const spotsOn = param('spots', 'yes', { choices: ['yes', 'no'], label: 'Spots' });
const hide = param('hide', '#f2efe8', { label: 'Hide' });
const spot = param('spot', '#2a2624', { label: 'Spots, ears and tail tuft' });
const muzzle = param('muzzle', '#e8a6a0', { label: 'Muzzle and udder' });
const hoof = param('hoof', '#4a3a30', { label: 'Hooves and horns' });

presets({
  jersey: { hide: '#b8763a', spot: '#6b3f1e', muzzle: '#3a2a22', spots: 'no' },
  highland: { hide: '#c0652a', spot: '#8a3f18', muzzle: '#3a2a22', hoof: '#e8dcc0', spots: 'no' },
  angus: { hide: '#24221f', spot: '#141312', muzzle: '#3a3430', spots: 'no' },
});

const r = assembly('cow');
const refs: Record<string, ReturnType<typeof r.part>> = {};
const add = (name: string, shape: Shape) => { refs[name] = r.part(name, shape); };
const at = (x: number, y: number, z: number) => ({ kind: 'vec3' as const, value: [x, y, z] as [number, number, number] });
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
// Chamfered-rectangle ring, w wide (X) and h tall, centred at (0, dz).
const ring = (w: number, h: number, dz: number) => {
  const a = w / 2;
  const b = h / 2;
  const c = Math.min(w, h) * 0.25;
  return path().moveTo(-a + c, dz - b).lineTo(a - c, dz - b).lineTo(a, dz - b + c).lineTo(a, dz + b - c)
    .lineTo(a - c, dz + b).lineTo(-a + c, dz + b).lineTo(-a, dz + b - c).lineTo(-a, dz - b + c).close();
};
// Sweep rings toward -Y from (x, y0, z0); stations are [distance, w, h, dz].
const sweepY = (x: number, y0: number, z0: number, st: [number, number, number, number][]) =>
  ring(st[0][1], st[0][2], st[0][3]).loft(st.slice(1).map(([, w, hh, dz]) => ring(w, hh, dz)), {
    planes: st.map(([d]) => ({ plane: 'XY' as const, origin: [0, 0, d] as [number, number, number] })),
    ruled: true,
  }).rotateX(90).translate(x, y0, z0);
// Square rod from p0 to p1.
const rod = (p0: [number, number, number], p1: [number, number, number], w0: number, w1: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const sq = (w: number) => path().moveTo(-w / 2, -w / 2).lineTo(w / 2, -w / 2).lineTo(w / 2, w / 2).lineTo(-w / 2, w / 2).close();
  return sq(w0).loft(sq(w1), { spacing: len, ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0], p0[1], p0[2]);
};

const bodyZ = 1050;
add('body', sweepY(0, 880, bodyZ, [[0, 380, 420, 20], [140, 560, 600, 0], [1500, 600, 640, 20], [1720, 440, 500, 60]]).color(hide));
add('udder', box(260, 240, 140, true).translate(0, 470, 700).color(muzzle));
fix('body', 'udder', at(0, 470, 740));
if (spotsOn.value === 'yes') {
  const patches: [number, number, number, number, number][] = [
    [1, -250, 1080, 420, 260], [1, 380, 980, 360, 220], [-1, 100, 1100, 460, 240], [-1, -520, 960, 260, 200],
  ];
  patches.forEach(([sd, y, z, l, hh], i) => {
    add(`spot-${i + 1}`, box(40, l, hh, true).translate(sd * 285, y, z).color(spot));
    fix('body', `spot-${i + 1}`, at(sd * 290, y, z));
  });
  add('spot-top', box(300, 360, 40, true).translate(0, 150, bodyZ + 335).color(spot));
  fix('body', 'spot-top', at(0, 150, bodyZ + 340));
}

// Head on a pitching neck: sweep from the neck to the muzzle.
const neckY = -760;
const neckZ = 1200;
add('head', sweepY(0, neckY, neckZ, [[0, 300, 360, 0], [260, 340, 380, -40], [520, 280, 300, -190], [620, 250, 230, -240]]).color(hide));
add('nose', sweepY(0, neckY - 560, neckZ, [[0, 270, 250, -235], [110, 250, 190, -260]]).color(muzzle));
fix('head', 'nose', at(0, neckY - 600, neckZ - 240));
add('ears', box(560, 60, 90, true).translate(0, neckY - 230, neckZ + 120).color(spot));
fix('head', 'ears', at(0, neckY - 230, neckZ + 120));
if (horns.value === 'yes') {
  add('horns', rod([-120, neckY - 200, neckZ + 150], [-260, neckY - 220, neckZ + 300], 50, 24)
    .union(rod([120, neckY - 200, neckZ + 150], [260, neckY - 220, neckZ + 300], 50, 24))
    .union(box(260, 60, 60, true).translate(0, neckY - 200, neckZ + 160)).color(hoof));
  fix('head', 'horns', at(0, neckY - 200, neckZ + 160));
}
hinge('body', 'head', 'neck', at(0, neckY, neckZ), [1, 0, 0], [-40, 30]);

// Tail hangs from the rump and swishes about Y.
add('tail', rod([0, 870, 1290], [0, 960, 640], 50, 34).union(box(90, 90, 200, true).translate(0, 958, 600)).color(hide));
add('tuft', box(100, 100, 150, true).translate(0, 960, 560).color(spot));
fix('tail', 'tuft', at(0, 960, 560));
hinge('body', 'tail', 'tail-swish', at(0, 870, 1290), [0, 1, 0], [-45, 45]);

// Legs: upper leg from the hip to the knee, shin with a hoof.
const hipZ = 830;
const kneeZ = 430;
for (const [end, y] of [['front', -600], ['back', 620]] as const) {
  for (const sd of [-1, 1]) {
    const nm = `${end}-${sd < 0 ? 'left' : 'right'}`;
    const x = sd * 190;
    add(`${nm}-thigh`, rod([x, y, hipZ + 140], [x, y, kneeZ - 20], 170, 120).color(hide));
    add(`${nm}-shin`, rod([x, y, kneeZ + 20], [x, y, 90], 115, 95).color(hide));
    add(`${nm}-hoof`, box(120, 140, 100, true).translate(x, y - 10, 50).color(hoof));
    hinge('body', `${nm}-thigh`, `${nm}-hip`, at(x, y, hipZ), [1, 0, 0], [-40, 40]);
    hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(x, y, kneeZ), [1, 0, 0], end === 'front' ? [-90, 0] : [0, 90]);
    fix(`${nm}-shin`, `${nm}-hoof`, at(x, y, 90));
  }
}

return r.model();
