// Original kernelCAD low-poly pig: a chunky chamfered barrel body, a broad
// head with a flat snout disc, floppy ears, a curly tail and four short
// two-link legs with trotters, rigged at the neck, ears, tail, hips and knees.
// Each joint connector sits at the same point on both links, so pose 0 is the
// as-built standing pose.
// Millimetres, Z up, trotters on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'pig',
  license: 'CC0-1.0',
  title: 'Pig',
  description: 'Chunky low-poly farm pig with snout, floppy ears, curly tail and short legs, with neck, ear, tail, hip and knee pivots rigged as GLB nodes. Knobs: size, spots, skin, snout, spot and trotter colours.',
  tags: ['pig', 'piglet', 'hog', 'swine', 'farm', 'animal', 'livestock', 'rigged', 'quadruped', 'cute'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['character', 'farm', 'village', 'meadow', 'outdoor'],
  triangleBudget: 700,
});

const size = param('size', 'adult', { choices: ['piglet', 'adult'], label: 'Size' });
const spotsOn = param('spots', 'no', { choices: ['no', 'yes'], label: 'Spots' });
const skin = param('skin', '#f2b0a8', { label: 'Skin' });
const snout = param('snout', '#e0868a', { label: 'Snout and inner ears' });
const spot = param('spot', '#3a2a28', { label: 'Spots, eyes and nostrils' });
const trotter = param('trotter', '#6b4a40', { label: 'Trotters' });

presets({
  spotted: { spots: 'yes' },
  boar: { skin: '#6b4a34', snout: '#4a3226', spot: '#2a1e18', trotter: '#2a2420' },
  saddleback: { skin: '#2e2a2a', snout: '#e0a0a0', spot: '#f2ece6' },
});

const s = size.value === 'piglet' ? 0.5 : 1;
const r = assembly('pig');
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
// Sweep rings toward -Y from (x, y0, z0); stations are [distance, w, h, dz].
const sweepY = (x: number, y0: number, z0: number, st: [number, number, number, number][]) =>
  ring(st[0][1], st[0][2], st[0][3]).loft(st.slice(1).map(([, w, hh, dz]) => ring(w, hh, dz)), {
    planes: st.map(([d]) => ({ plane: 'XY' as const, origin: [0, 0, d * s] as [number, number, number] })),
    ruled: true,
  }).rotateX(90).translate(x * s, y0 * s, z0 * s);
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
// Four two-link legs with hooves/paws: hip and knee pivots per leg.
const legs = (o: { hipZ: number; kneeZ: number; xs: number; yf: number; yb: number; w0: number; w1: number; foot: [number, number, number]; coat: ReturnType<typeof param>; footColor: ReturnType<typeof param>; top: number }) => {
  for (const [end, y] of [['front', o.yf], ['back', o.yb]] as const) {
    for (const sd of [-1, 1]) {
      const nm = `${end}-${sd < 0 ? 'left' : 'right'}`;
      const x = sd * o.xs;
      add(`${nm}-thigh`, rod([x, y, o.top], [x, y, o.kneeZ - 15], o.w0, o.w1 * 1.1).color(o.coat));
      add(`${nm}-shin`, rod([x, y, o.kneeZ + 15], [x, y, o.foot[2] - 5], o.w1, o.w1 * 0.9).color(o.coat));
      add(`${nm}-foot`, blk(x - o.foot[0] / 2, y - o.foot[1] * 0.6, 0, x + o.foot[0] / 2, y + o.foot[1] * 0.4, o.foot[2]).color(o.footColor));
      hinge('body', `${nm}-thigh`, `${nm}-hip`, at(x, y, o.hipZ), [1, 0, 0], [-45, 45]);
      hinge(`${nm}-thigh`, `${nm}-shin`, `${nm}-knee`, at(x, y, o.kneeZ), [1, 0, 0], end === 'front' ? [0, 100] : [-100, 0]);
      fix(`${nm}-shin`, `${nm}-foot`, at(x, y, o.foot[2] / 2));
    }
  }
};

add('body', sweepY(0, 560, 500, [[0, 380, 380, 20], [140, 520, 500, 0], [900, 540, 520, 10], [1100, 440, 440, 30]]).color(skin));
if (spotsOn.value === 'yes') {
  for (const [i, sd, y, z, l, h] of [[1, 1, 150, 560, 260, 200], [2, -1, -200, 520, 220, 180], [3, -1, 330, 600, 180, 140]]) {
    add(`spot-${i}`, blk(sd * 255 - 20, y - l / 2, z - h / 2, sd * 255 + 20, y + l / 2, z + h / 2).color(spot));
    fix('body', `spot-${i}`, at(sd * 260, y, z));
  }
}

// Head with snout, eyes and nostrils; nods about X at the neck.
add('head', sweepY(0, -470, 560, [[0, 380, 380, 0], [200, 370, 350, -10], [300, 300, 280, -40]]).color(skin));
add('snout', sweepY(0, -760, 560, [[0, 200, 160, -40], [80, 200, 160, -40]]).color(snout));
fix('head', 'snout', at(0, -770, 520));
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  add(`${nm}-nostril`, blk(sd * 45 - 18, -850, 500, sd * 45 + 18, -836, 545).color(spot));
  fix('snout', `${nm}-nostril`, at(sd * 45, -845, 520));
  add(`${nm}-eye`, blk(sd * 105 - 25, -745, 615, sd * 105 + 25, -725, 665).color(spot));
  fix('head', `${nm}-eye`, at(sd * 105, -738, 640));
}
hinge('body', 'head', 'neck', at(0, -470, 560), [1, 0, 0], [-30, 30]);

// Floppy ears flap about Y at the top of the head.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const ear = extrudePolygon([[-sd * 20 * s, 70 * s], [sd * 150 * s, 30 * s], [sd * 90 * s, -190 * s]], 24 * s).rotateX(-35).rotateY(sd * 35).translate(sd * 90 * s, -620 * s, 690 * s);
  add(`${nm}-ear`, ear.color(snout));
  hinge('head', `${nm}-ear`, `${nm}-ear-flop`, at(sd * 140, -600, 710), [0, 1, 0], [-35, 35]);
}

// Curly tail: three short rod links in a hook, wagging about Z.
add('tail', rod([0, 540, 640], [0, 650, 690], 40, 30).union(rod([0, 650, 690], [0, 680, 780], 30, 26))
  .union(rod([0, 680, 780], [0, 620, 810], 26, 22)).color(skin));
hinge('body', 'tail', 'tail-wag', at(0, 560, 650), [0, 0, 1], [-40, 40]);

legs({ hipZ: 360, kneeZ: 180, xs: 150, yf: -360, yb: 380, w0: 130, w1: 95, foot: [100, 120, 60], coat: skin, footColor: trotter, top: 440 });

return r.model();
