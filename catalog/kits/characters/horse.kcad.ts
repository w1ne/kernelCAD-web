// Original kernelCAD low-poly horse: a chamfered barrel body, an arched neck
// with a mane, a long head with ears, a flowing tail, an optional saddle and
// four slim two-link legs with hooves, rigged at the neck, poll, tail, hips and
// knees. Each joint connector sits at the same point on both links, so pose 0
// is the as-built standing pose.
// Millimetres, Z up, hooves on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'horse',
  license: 'CC0-1.0',
  title: 'Horse',
  description: 'Life-size low-poly horse with arched neck, mane, flowing tail and optional saddle, with neck, poll, tail, hip and knee pivots rigged as GLB nodes. Knobs: saddle, face blaze, coat, mane, hoof, saddle and blaze colours.',
  tags: ['horse', 'pony', 'steed', 'mount', 'farm', 'animal', 'equine', 'medieval', 'rigged', 'quadruped'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'farm', 'village', 'medieval', 'meadow', 'outdoor'],
  triangleBudget: 800,
});

const saddleOn = param('saddle', 'yes', { choices: ['yes', 'no'], label: 'Saddle' });
const blazeOn = param('blaze', 'yes', { choices: ['yes', 'no'], label: 'Face blaze' });
const coat = param('coat', '#8a5a34', { label: 'Coat' });
const mane = param('mane', '#2e221a', { label: 'Mane and tail' });
const hoof = param('hoof', '#3a3330', { label: 'Hooves' });
const saddleColor = param('saddleColor', '#5a3020', { label: 'Saddle' });
const blaze = param('blazeColor', '#f2efe8', { label: 'Blaze' });

presets({
  white: { coat: '#eceae4', mane: '#cfcac0', hoof: '#6b625a' },
  black: { coat: '#24221f', mane: '#121110', saddleColor: '#7a2a24' },
  palomino: { coat: '#d9a85a', mane: '#f2ead8' },
});

const r = assembly('horse');
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

const bodyZ = 1200;
add('body', sweepY(0, 820, bodyZ, [[0, 340, 380, 40], [160, 480, 560, 10], [1350, 500, 600, 30], [1560, 400, 520, 80]]).color(coat));
if (saddleOn.value === 'yes') {
  add('saddle', sweepY(0, 230, bodyZ, [[0, 380, 120, 300], [140, 400, 80, 290], [380, 400, 80, 290], [480, 380, 160, 320]])
    .union(box(540, 380, 30, true).translate(0, 0, bodyZ + 285))
    .union(box(30, 60, 380, true).translate(-262, -20, bodyZ + 90))
    .union(box(30, 60, 380, true).translate(262, -20, bodyZ + 90)).color(saddleColor));
  fix('body', 'saddle', at(0, 0, bodyZ + 290));
}

// Neck rises from the chest; the head pitches at the poll.
const neckY = -680;
const neckZ = 1380;
add('neck', sweepY(0, neckY, neckZ, [[0, 300, 460, 0], [200, 250, 360, 230], [400, 200, 280, 470]]).color(coat));
add('mane', sweepY(0, neckY + 60, neckZ, [[0, 70, 140, 230], [220, 80, 140, 430], [460, 70, 140, 620]]).color(mane));
fix('neck', 'mane', at(0, neckY - 100, neckZ + 400));
hinge('body', 'neck', 'neck-raise', at(0, neckY, neckZ), [1, 0, 0], [-35, 25]);
const pollY = neckY - 380;
const pollZ = neckZ + 470;
add('head', sweepY(0, pollY + 40, pollZ, [[0, 200, 290, 0], [220, 210, 270, -60], [520, 160, 180, -250], [600, 150, 150, -270]])
  .union(rod([-55, pollY - 30, pollZ + 120], [-70, pollY - 20, pollZ + 260], 50, 16))
  .union(rod([55, pollY - 30, pollZ + 120], [70, pollY - 20, pollZ + 260], 50, 16)).color(coat));
add('forelock', box(110, 120, 80, true).translate(0, pollY - 70, pollZ + 140).color(mane));
fix('head', 'forelock', at(0, pollY - 70, pollZ + 140));
if (blazeOn.value === 'yes') {
  add('blaze', sweepY(0, pollY - 100, pollZ, [[0, 60, 30, 100], [440, 60, 30, -170]]).color(blaze));
  fix('head', 'blaze', at(0, pollY - 200, pollZ));
}
hinge('neck', 'head', 'poll', at(0, pollY, pollZ), [1, 0, 0], [-30, 40]);

// Tail sweeps back and down from the croup; swishes about Y.
add('tail', rod([0, 800, 1420], [0, 900, 1250], 90, 110).union(rod([0, 900, 1250], [0, 980, 680], 110, 150)).color(mane));
hinge('body', 'tail', 'tail-swish', at(0, 800, 1420), [0, 1, 0], [-45, 45]);

// Slim legs with hooves.
const hipZ = 980;
const kneeZ = 520;
for (const [end, y] of [['front', -540], ['back', 560]] as const) {
  for (const sd of [-1, 1]) {
    const nm = `${end}-${sd < 0 ? 'left' : 'right'}`;
    const x = sd * 160;
    add(`${nm}-thigh`, rod([x, y, hipZ + 160], [x, y + (end === 'back' ? 40 : 0), kneeZ - 20], 160, 100).color(coat));
    add(`${nm}-shin`, rod([x, y + (end === 'back' ? 40 : 0), kneeZ + 20], [x, y, 80], 90, 80).color(coat));
    add(`${nm}-hoof`, box(120, 140, 100, true).translate(x, y - 10, 50).color(hoof));
    hinge('body', `${nm}-thigh`, `${nm}-hip`, at(x, y, hipZ), [1, 0, 0], [-45, 45]);
    hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(x, y + (end === 'back' ? 40 : 0), kneeZ), [1, 0, 0], end === 'front' ? [0, 110] : [-110, 0]);
    fix(`${nm}-shin`, `${nm}-hoof`, at(x, y, 40));
  }
}

return r.model();
