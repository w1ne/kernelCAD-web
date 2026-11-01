// Original kernelCAD low-poly quadcopter drone: a chamfered centre body with a
// battery hump and status light, four arms with motor pods and spinning
// two-blade propellers, landing skids, and a camera gimbal that pans and
// tilts under the nose. Every joint is a revolute mate; pose 0 is as built.
// Millimetres, Z up, skids on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'drone-quadcopter',
  license: 'CC0-1.0',
  title: 'Quadcopter drone',
  description: 'Four-rotor camera drone with spinning propellers, landing skids and a pan-tilt camera gimbal, rigged as GLB pivots. Knobs: size, guards, body, arm, propeller, accent and lens colours.',
  tags: ['drone', 'quadcopter', 'uav', 'flying', 'camera drone', 'robot', 'sci-fi', 'vehicle', 'rigged', 'toy'],
  kit: 'characters',
  category: 'character',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character', 'vehicle', 'city'],
  triangleBudget: 900,
});

const size = param('size', 'medium', { choices: ['mini', 'medium', 'cargo'], label: 'Size' });
const guards = param('guards', 'no', { choices: ['no', 'yes'], label: 'Prop guards' });
const body = param('body', '#eef0f2', { label: 'Body' });
const arm = param('arm', '#3a3d42', { label: 'Arms, skids and gimbal' });
const prop = param('prop', '#26282b', { label: 'Propellers' });
const accent = param('accent', '#ff7a1a', { label: 'Accent and guards' });
const lens = param('lens', '#46a0ff', { label: 'Lens and light' });

presets({
  racer: { body: '#d8342c', arm: '#1e1e22', accent: '#f2c219', guards: 'no' },
  survey: { body: '#f2c219', arm: '#2e2e32', accent: '#2e2e32', guards: 'yes' },
});

const s = size.value === 'mini' ? 0.5 : size.value === 'cargo' ? 2.5 : 1;
const r = assembly('drone-quadcopter');
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

const bodyZ = 130;
const armR = 200;
add('body', ring(160, 220, 0).loft([ring(180, 250, 0), ring(150, 210, 0)], {
  planes: [0, 25, 60].map((z) => ({ plane: 'XY' as const, origin: [0, 0, z * s] as [number, number, number] })),
  ruled: true,
}).translate(0, 0, bodyZ * s)
  .union(blk(-60, -40, bodyZ + 55, 60, 90, bodyZ + 80))
  .union(blk(-95, -110, 0, -55, 110, 16)).union(blk(55, -110, 0, 95, 110, 16))
  .union(blk(-82, -60, 10, -68, -40, bodyZ + 5)).union(blk(68, -60, 10, 82, -40, bodyZ + 5)).union(blk(-82, 40, 10, -68, 60, bodyZ + 5)).union(blk(68, 40, 10, 82, 60, bodyZ + 5))
  .color(arm));
add('shell', blk(-70, -110, bodyZ + 20, 70, 100, bodyZ + 70).color(body));
fix('body', 'shell', at(0, 0, bodyZ + 45));
add('light', blk(-30, -118, bodyZ + 30, 30, -108, bodyZ + 50).color(lens));
fix('shell', 'light', at(0, -112, bodyZ + 40));

// Arms out on the diagonals with motor pods and spinning props.
const corners: [string, number, number][] = [['fl', -1, -1], ['fr', 1, -1], ['bl', -1, 1], ['br', 1, 1]];
for (const [nm, sx, sy] of corners) {
  const x = (sx * armR) / Math.SQRT2;
  const y = (sy * armR) / Math.SQRT2;
  add(`arm-${nm}`, rod([sx * 40, sy * 50, bodyZ + 30], [x, y, bodyZ + 30], 26, 22)
    .union(stack([[24, bodyZ + 20], [24, bodyZ + 70]], 6).translate(x * s, y * s, 0)).color(accent));
  fix('body', `arm-${nm}`, at(sx * 40, sy * 50, bodyZ + 30));
  add(`prop-${nm}`, blk(x - 110, y - 12, bodyZ + 72, x + 110, y + 12, bodyZ + 80).color(prop));
  hinge(`arm-${nm}`, `prop-${nm}`, `prop-${nm}-spin`, at(x, y, bodyZ + 70), [0, 0, 1], [-180, 180]);
  if (guards.value === 'yes') {
    add(`guard-${nm}`, ngon(125, 6).extrude(16 * s).subtract(ngon(112, 6).extrude(30 * s).translate(0, 0, -6 * s))
      .translate(x * s, y * s, (bodyZ + 60) * s).union(rod([x - sx * 30, y - sy * 30, bodyZ + 40], [x - sx * 85, y - sy * 85, bodyZ + 64], 14, 14)).color(accent));
    fix(`arm-${nm}`, `guard-${nm}`, at(x, y, bodyZ + 60));
  }
}

// Camera gimbal: yoke pans under the nose, camera tilts inside it.
add('gimbal', blk(-8, -100, bodyZ - 20, 8, -70, bodyZ + 2).union(blk(-55, -100, bodyZ - 40, 55, -70, bodyZ - 20))
  .union(blk(-55, -100, bodyZ - 100, -45, -70, bodyZ - 30)).union(blk(45, -100, bodyZ - 100, 55, -70, bodyZ - 30)).color(arm));
hinge('body', 'gimbal', 'gimbal-pan', at(0, -85, bodyZ), [0, 0, 1], [-90, 90]);
add('camera', blk(-44, -110, bodyZ - 100, 44, -60, bodyZ - 45).color(body));
add('lens', ngon(18, 6).extrude(14 * s).rotateX(90).translate(0, -110 * s, (bodyZ - 72) * s).color(lens));
fix('camera', 'lens', at(0, -115, bodyZ - 72));
hinge('gimbal', 'camera', 'gimbal-tilt', at(0, -85, bodyZ - 72), [1, 0, 0], [-90, 30]);

return r.model();
