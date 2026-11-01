// Original kernelCAD low-poly chicken: a plump faceted side-profile body, a
// head with comb, wattle and an opening beak on a pecking neck, folded wings
// that flap, an upturned tail and two thin legs with three-toed feet, all
// rigged through revolute mates. Pose 0 is the as-built standing pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'chicken',
  license: 'CC0-1.0',
  title: 'Chicken',
  description: 'Plump low-poly farm chicken with red comb and wattle, flapping wings, upturned tail and three-toed feet, with neck, beak, wing, tail and hip pivots rigged as GLB nodes. Knobs: size, feathers, comb, beak and eye colours.',
  tags: ['chicken', 'hen', 'rooster', 'chick', 'bird', 'poultry', 'farm', 'animal', 'rigged', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'farm', 'village', 'outdoor'],
  triangleBudget: 500,
});

const size = param('size', 'hen', { choices: ['chick', 'hen', 'rooster'], label: 'Size' });
const feathers = param('feathers', '#f4f1e8', { label: 'Feathers' });
const comb = param('comb', '#d8342c', { label: 'Comb and wattle' });
const beak = param('beak', '#f2b632', { label: 'Beak and feet' });
const eye = param('eye', '#1c1a18', { label: 'Eyes' });

presets({
  brown: { feathers: '#a8642e' },
  black: { feathers: '#2a2a2e', beak: '#6b6458' },
  chick: { size: 'chick', feathers: '#f6dc5a', comb: '#f2b632' },
});

const s = size.value === 'chick' ? 0.45 : size.value === 'rooster' ? 1.25 : 1;
const r = assembly('chicken');
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
// Side-profile prism: points are (y, z), thickness t starting at x0.
const side = (pts: [number, number][], t: number, x0 = -t / 2) =>
  extrudePolygon(pts.map(([y, z]) => [y * s, z * s] as [number, number]), t * s).rotateX(90).rotateZ(90).translate(x0 * s, 0, 0);
const bw = 200;
add('body', side([[-150, 230], [-60, 150], [80, 150], [170, 220], [200, 300], [120, 330], [-80, 320], [-150, 300]], bw)
  .union(side([[-140, 240], [-40, 170], [60, 170], [130, 230], [130, 300], [-120, 300]], bw + 30)).color(feathers));

// Head with beak, comb, wattle and eyes; pecks about X at the neck.
add('head', side([[-150, 290], [-80, 300], [-70, 420], [-110, 470], [-180, 460], [-200, 400]], 110).color(feathers));
add('beak', side([[-195, 400], [-250, 390], [-195, 420]], 50).color(beak));
fix('head', 'beak', at(0, -198, 410));
add('jaw', side([[-195, 382], [-235, 386], [-195, 398]], 40).color(beak));
hinge('head', 'jaw', 'beak-open', at(0, -195, 395), [1, 0, 0], [-25, 0]);
add('comb', side([[-180, 455], [-175, 500], [-150, 480], [-130, 515], [-110, 485], [-85, 505], [-90, 455]], 30)
  .union(side([[-205, 380], [-180, 330], [-170, 385]], 30)).union(side([[-200, 375], [-160, 375], [-170, 470], [-190, 470]], 20)).color(comb));
fix('head', 'comb', at(0, -140, 465));
for (const sd of [-1, 1]) {
  add(`${sd < 0 ? 'left' : 'right'}-eye`, blk(sd * 55 - 8, -170, 420, sd * 55 + 8, -140, 445).color(eye));
  fix('head', `${sd < 0 ? 'left' : 'right'}-eye`, at(sd * 55, -155, 432));
}
hinge('body', 'head', 'neck', at(0, -110, 300), [1, 0, 0], [-60, 20]);

// Folded wings flap about Y; the tail fans up at the rump.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x0 = sd < 0 ? -(bw + 30) / 2 - 18 : (bw + 30) / 2;
  add(`${nm}-wing`, side([[-80, 300], [60, 300], [170, 250], [150, 210], [100, 220], [-40, 210]], 18, x0).color(feathers));
  hinge('body', `${nm}-wing`, `${nm}-wing-flap`, at(sd * (bw + 30) / 2, -60, 295), [0, 1, 0], sd < 0 ? [-10, 80] : [-80, 10]);
}
add('tail', side([[130, 250], [230, 330], [250, 440], [200, 420], [170, 370], [120, 320]], 120).color(feathers));
hinge('body', 'tail', 'tail-lift', at(0, 150, 280), [1, 0, 0], [-25, 25]);

for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x = sd * 45;
  const foot = extrudePolygon([[-6, 30], [-35, -60], [-18, -66], [0, -20], [18, -66], [35, -60], [6, 30]], 12)
    .scale([s, s, s]).translate(x * s, 0, 0);
  add(`${nm}-leg`, rod([x, 0, 175], [x, 0, 6], 22, 16).union(foot).color(beak));
  hinge('body', `${nm}-leg`, `${nm}-hip`, at(x, 0, 165), [1, 0, 0], [-60, 45]);
}

return r.model();
