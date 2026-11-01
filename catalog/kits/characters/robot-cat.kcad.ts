// Original kernelCAD low-poly robot cat: a wedge-profile body on four slim
// two-link legs, a head with pointed ears on a pitching neck and a two-piece
// tail that sweeps and curls, all rigged through revolute mates. Links are
// authored standing; each joint connector sits at the same point on both links,
// so pose 0 is the as-built pose.
// Millimetres, Z up, paws on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'robot-cat',
  license: 'CC0-1.0',
  title: 'Robot cat',
  description: 'Sleek four-legged robot cat with pointed ears and a curling two-piece tail, with neck, tail, hip and knee pivots rigged as GLB nodes. Knobs: size, tail, body, panel, eye and joint colours.',
  tags: ['robot', 'cat', 'kitten', 'quadruped', 'pet', 'animal', 'mech', 'rigged', 'toy'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character'],
  triangleBudget: 700,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const tail = param('tail', 'curled', { choices: ['curled', 'straight'], label: 'Tail' });
const body = param('body', '#e9eef2', { label: 'Body' });
const panel = param('panel', '#f08a3c', { label: 'Panels' });
const eyes = param('eyes', '#7cff6b', { label: 'Eyes' });
const joint = param('joint', '#4a4f55', { label: 'Joints' });

presets({
  tabby: { body: '#d8a25a', panel: '#7a4a24', eyes: '#46e0ff' },
  shadow: { body: '#2b2e33', panel: '#5a2fd0', eyes: '#ffd23a' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.4 : 1;
const r = assembly('robot-cat');
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
// Side-profile prism: points are (y, z), thickness t centred on x = 0.
const side = (pts: [number, number][], t: number) =>
  extrudePolygon(pts.map(([y, z]) => [y * s, z * s] as [number, number]), t * s).rotateX(90).rotateZ(90).translate(-t * s / 2, 0, 0);
// Square rod from p0 to p1 (mm, unscaled), w wide.
const rod = (p0: [number, number, number], p1: [number, number, number], w0: number, w1: number) => {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const sq = (w: number) => path().moveTo(-w / 2, -w / 2).lineTo(w / 2, -w / 2).lineTo(w / 2, w / 2).lineTo(-w / 2, w / 2).close();
  return sq(w0 * s).loft(sq(w1 * s), { spacing: len * s, ruled: true })
    .rotateY((Math.acos(d[2] / len) * 180) / Math.PI)
    .rotateZ((Math.atan2(d[1], d[0]) * 180) / Math.PI)
    .translate(p0[0] * s, p0[1] * s, p0[2] * s);
};

const hipZ = 190;
const kneeZ = 95;
const bodyW = 130;
add('body', side([[-190, 160], [180, 165], [205, 215], [175, 265], [-150, 260], [-205, 225]], bodyW).color(body));
add('stripe', side([[-120, 255], [140, 260], [150, 274], [-110, 270]], bodyW * 0.55).color(panel));
fix('body', 'stripe', at(0, 0, 262 * s));

// Head: faceted box with a muzzle, pointed ears and a visor strip.
const neck: [number, number, number] = [0, -185, 240];
let head = side([[-180, 230], [-330, 245], [-345, 300], [-310, 365], [-190, 365], [-170, 300]], 130)
  .union(side([[-330, 240], [-380, 250], [-380, 285], [-335, 290]], 70))
  .union(rod([0, -200, 235], [0, -150, 235], 60, 60));
for (const sx of [-1, 1]) {
  head = head.union(extrudePolygon([[-28 * s, 0], [28 * s, 0], [6 * s, 75 * s]], 14 * s)
    .rotateX(90).translate(sx * 38 * s, -240 * s, 360 * s));
}
add('head', head.color(body));
add('visor', box(110 * s, 14 * s, 26 * s, true).translate(0, -338 * s, 322 * s).color(eyes));
fix('head', 'visor', at(0, -338 * s, 322 * s));
add('nose', box(22 * s, 12 * s, 16 * s, true).translate(0, -384 * s, 280 * s).color(panel));
fix('head', 'nose', at(0, -384 * s, 280 * s));
hinge('body', 'head', 'neck', at(neck[0] * s, neck[1] * s, neck[2] * s), [1, 0, 0], [-35, 35]);

// Tail: a base piece rising off the rump and a tip that curls forward.
const curl = tail.value === 'curled';
const t0: [number, number, number] = [0, 190, 240];
const t1: [number, number, number] = [0, 290, 390];
const t2: [number, number, number] = curl ? [0, 250, 520] : [0, 380, 520];
add('tail-base', rod([0, 170, 240], t1, 30, 26).color(body));
add('tail-tip', rod(t1, t2, 26, 18).union(rod([0, t1[1] - 8, t1[2] - 8], [0, t1[1] + 8, t1[2] + 8], 32, 32)).color(panel));
hinge('body', 'tail-base', 'tail-sweep', at(t0[0] * s, t0[1] * s, t0[2] * s), [0, 0, 1], [-50, 50]);
hinge('tail-base', 'tail-tip', 'tail-curl', at(t1[0] * s, t1[1] * s, t1[2] * s), [1, 0, 0], [-45, 45]);

// Legs: slim thigh from the hip to the knee, shin with a paw.
for (const [end, y] of [['front', -140], ['back', 140]] as const) {
  for (const sd of [-1, 1]) {
    const name = `${end}-${sd < 0 ? 'left' : 'right'}`;
    const x = sd * 50;
    const kneeY = y + (end === 'front' ? 10 : -15);
    add(`${name}-thigh`, rod([x, y, hipZ + 25], [x, kneeY, kneeZ - 10], 44, 36).color(joint));
    add(`${name}-shin`, rod([x, kneeY, kneeZ + 10], [x, y, 20], 32, 28)
      .union(box(46 * s, 62 * s, 24 * s, true).translate(x * s, (y - 10) * s, 12 * s)).color(body));
    hinge('body', `${name}-thigh`, `${name}-hip`, at(x * s, y * s, hipZ * s), [1, 0, 0], [-55, 55]);
    hinge(`${name}-thigh`, `${name}-shin`, `${name}-knee`, at(x * s, kneeY * s, kneeZ * s), [1, 0, 0], end === 'front' ? [-100, 0] : [0, 100]);
  }
}

return r.model();
