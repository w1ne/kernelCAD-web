// Original kernelCAD low-poly mini excavator: rubber tracks with drive
// sprockets, an upper house that slews on a turntable with a glazed cab,
// engine hood and counterweight, and a boom, stick and toothed bucket that
// each pitch, all rigged through revolute mates. Pose 0 is the as-built pose.
// Millimetres, Z up, tracks on z = 0 centred on x = y = 0, digs toward -Y.

meta({
  name: 'excavator',
  license: 'CC0-1.0',
  title: 'Mini excavator',
  description: 'Tracked mini excavator with a slewing cab, boom, stick and toothed bucket and spinning drive sprockets, rigged as GLB pivots for digging animations. Knobs: size, cab, body, arm, track, glass and steel colours.',
  tags: ['excavator', 'digger', 'construction', 'machine', 'vehicle', 'tracked', 'earthmover', 'bucket', 'site', 'rigged', 'toy'],
  kit: 'characters',
  category: 'vehicle',
  origin: 'base',
  compat: ['vehicle', 'construction', 'city', 'street', 'character'],
  triangleBudget: 800,
});

const size = param('size', 'mini', { choices: ['toy', 'mini', 'large'], label: 'Size' });
const cab = param('cab', 'closed', { choices: ['closed', 'canopy'], label: 'Cab' });
const body = param('body', '#f2b41a', { label: 'Body' });
const arm = param('arm', '#f2b41a', { label: 'Boom and stick' });
const track = param('track', '#2a2a2c', { label: 'Tracks and undercarriage' });
const glass = param('glass', '#7fb8d8', { label: 'Glass' });
const steel = param('steel', '#5a5e64', { label: 'Bucket, sprockets and turntable' });

presets({
  orange: { body: '#e8742a', arm: '#e8742a' },
  green: { body: '#3f7a3a', arm: '#f2e6cf', glass: '#a8d0c0' },
  toy: { size: 'toy', body: '#d8342c', arm: '#f2c219', track: '#2f6fd8', steel: '#f2c219' },
});

const s = size.value === 'toy' ? 0.15 : size.value === 'large' ? 2.2 : 1;
const r = assembly('excavator');
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
// Faceted stack of rings [radius, z] with n sides.
const ngon = (rad: number, n: number, rot = 0) => {
  let p = path().moveTo(rad * s * Math.cos(rot), rad * s * Math.sin(rot));
  for (let i = 1; i < n; i++) {
    const a = rot + (2 * Math.PI * i) / n;
    p = p.lineTo(rad * s * Math.cos(a), rad * s * Math.sin(a));
  }
  return p.close();
};
const stack = (rings: [number, number][], n: number) =>
  ngon(rings[0][0], n, Math.PI / n).loft(rings.slice(1).map(([rr]) => ngon(rr, n, Math.PI / n)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
    ruled: true,
  });

// Undercarriage: centre frame and two trapezoid tracks.
let under = blk(-460, -450, 140, 460, 450, 360);
for (const sd of [-1, 1]) {
  under = under.union(side([[-800, 0], [800, 0], [910, 180], [800, 380], [-800, 380], [-910, 180]], 300, sd < 0 ? -760 : 460));
}
add('undercarriage', under.color(track));
for (const [nm, sd, y] of [['fl', -1, -760], ['fr', 1, -760], ['bl', -1, 760], ['br', 1, 760]] as [string, number, number][]) {
  const x0 = sd < 0 ? -790 : 760;
  add(`sprocket-${nm}`, ngon(130, 8).extrude(30 * s).rotateY(90).translate(x0 * s, y * s, 190 * s).color(steel));
  hinge('undercarriage', `sprocket-${nm}`, `sprocket-${nm}-spin`, at(sd * 760, y, 190), [1, 0, 0], [-180, 180]);
}

// Upper house slews about Z on the turntable.
add('turntable', stack([[420, 350], [420, 430]], 8).color(steel));
fix('undercarriage', 'turntable', at(0, 0, 360));
add('house', blk(-650, -600, 420, 650, 760, 1000).union(blk(-650, 700, 420, 650, 1000, 950))
  .union(blk(50, -100, 1000, 640, 760, 1300)).color(body));
const roofZ = 2150;
if (cab.value === 'closed') {
  add('cab', blk(-640, -620, 1000, -40, 300, 1080).union(blk(-640, -620, roofZ - 80, -40, 300, roofZ))
    .union(blk(-640, -620, 1000, -580, -560, roofZ)).union(blk(-100, -620, 1000, -40, -560, roofZ))
    .union(blk(-640, 240, 1000, -580, 300, roofZ)).union(blk(-100, 240, 1000, -40, 300, roofZ)).color(body));
  add('glass', blk(-600, -590, 1080, -80, 270, roofZ - 80).color(glass));
  fix('cab', 'glass', at(-340, -160, 1600));
} else {
  add('cab', blk(-640, -620, roofZ - 60, -40, 300, roofZ).union(blk(-640, -620, 1000, -580, -560, roofZ))
    .union(blk(-100, -620, 1000, -40, -560, roofZ)).union(blk(-640, 240, 1000, -580, 300, roofZ))
    .union(blk(-100, 240, 1000, -40, 300, roofZ)).color(body));
  add('seat', blk(-520, -150, 1000, -160, 250, 1180).union(blk(-520, 150, 1180, -160, 250, 1600)).color(track));
  fix('cab', 'seat', at(-340, 100, 1100));
}
fix('house', 'cab', at(-340, -160, 1000));
hinge('turntable', 'house', 'slew', at(0, 0, 430), [0, 0, 1], [-180, 180]);

// Boom, stick and bucket on the front right, each pitching about X.
const bx = 250;
add('boom', rod([bx, -560, 900], [bx, -1250, 2050], 200, 170).union(rod([bx, -1250, 2050], [bx, -1750, 1950], 170, 150))
  .union(blk(bx - 110, -700, 800, bx + 110, -500, 1000)).color(arm));
hinge('house', 'boom', 'boom-lift', at(bx, -600, 900), [1, 0, 0], [-30, 50]);
add('stick', rod([bx, -1700, 2030], [bx, -2300, 700], 140, 120).color(arm));
hinge('boom', 'stick', 'stick-curl', at(bx, -1750, 1950), [1, 0, 0], [-50, 60]);
let bucket = side([[-2240, 800], [-2520, 720], [-2600, 380], [-2470, 260], [-2260, 470]], 480, bx - 240);
for (const dx of [-170, -60, 60, 170]) bucket = bucket.union(blk(bx + dx - 30, -2500, 220, bx + dx + 30, -2440, 300));
add('bucket', bucket.color(steel));
hinge('stick', 'bucket', 'bucket-curl', at(bx, -2300, 700), [1, 0, 0], [-60, 80]);

return r.model();
