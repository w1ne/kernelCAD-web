// Original kernelCAD low-poly robot bird: a teardrop body on two stick legs
// with three-toed feet, a head with a pointed beak on a turning neck, two-piece
// wings that flap at the shoulder and fold at the wrist, and a tail fan that
// lifts. Every joint is a revolute mate; pose 0 is the as-built pose.
// Millimetres, Z up, feet on z = 0 centred on x = y = 0, faces -Y.

meta({
  name: 'robot-bird',
  license: 'CC0-1.0',
  title: 'Robot bird',
  description: 'Small two-legged robot bird with flapping two-piece wings, a turning head with a beak and a lifting tail fan, rigged as GLB pivots. Knobs: size, crest, body, wing, beak and eye colours.',
  tags: ['robot', 'bird', 'parrot', 'sparrow', 'animal', 'pet', 'mech', 'rigged', 'toy', 'flying'],
  kit: 'characters',
  category: 'animal',
  origin: 'base',
  compat: ['robot', 'sci-fi', 'character'],
  triangleBudget: 600,
});

const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const crest = param('crest', 'yes', { choices: ['yes', 'no'], label: 'Crest' });
const body = param('body', '#3fa7d6', { label: 'Body' });
const wing = param('wing', '#1f5f8b', { label: 'Wings and tail' });
const beak = param('beak', '#f2b632', { label: 'Beak and feet' });
const eyes = param('eyes', '#f4f4f0', { label: 'Eyes' });

presets({
  parrot: { body: '#d8342c', wing: '#2f8f4a', beak: '#f2d04a' },
  crow: { body: '#2a2c31', wing: '#15171a', beak: '#5a5f66', eyes: '#ff3b30' },
});

const s = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.5 : 1;
const r = assembly('robot-bird');
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
// Side-profile prism: points are (y, z), thickness t starting at x0 (mm, unscaled).
const side = (pts: [number, number][], t: number, x0 = -t / 2) =>
  extrudePolygon(pts.map(([y, z]) => [y * s, z * s] as [number, number]), t * s).rotateX(90).rotateZ(90).translate(x0 * s, 0, 0);
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

// Teardrop body, a slimmer chest plate stacked on the front.
const bw = 120;
add('body', side([[-70, 120], [40, 110], [120, 150], [150, 190], [90, 250], [-30, 270], [-90, 230], [-100, 170]], bw)
  .union(side([[-90, 150], [-20, 135], [-30, 250], [-95, 225]], bw + 16)).color(body));

// Head with beak, eyes and an optional crest; turns about Z on the neck.
let head = side([[-100, 250], [-10, 255], [10, 320], [-20, 360], [-90, 365], [-125, 320]], 105)
  .union(rod([0, -50, 230], [0, -50, 280], 50, 50));
if (crest.value === 'yes') {
  head = head.union(side([[-70, 350], [-30, 350], [10, 420], [-20, 400], [-50, 430], [-60, 390]], 26));
}
add('head', head.color(body));
add('beak', side([[-120, 290], [-185, 305], [-120, 330]], 46).union(side([[-118, 300], [-150, 300], [-118, 290]], 40)).color(beak));
fix('head', 'beak', at(0, -120, 310));
add('eyes', box(120 * s, 30 * s, 30 * s, true).translate(0, -75 * s, 325 * s).color(eyes));
fix('head', 'eyes', at(0, -75, 325));
hinge('body', 'head', 'neck', at(0, -50, 255), [0, 0, 1], [-90, 90]);

// Wings: an inner plate flaps about Y at the shoulder; the feathered outer
// plate folds about Z at the wrist.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x0 = sd < 0 ? -bw / 2 - 14 : bw / 2;
  add(`${nm}-wing`, side([[-50, 245], [70, 235], [80, 175], [-30, 190]], 14, x0).color(wing));
  add(`${nm}-wing-tip`, side([[60, 238], [190, 190], [200, 150], [165, 160], [150, 135], [70, 178]], 12, x0 + sd * 2).color(wing));
  hinge('body', `${nm}-wing`, `${nm}-shoulder`, at(sd * bw / 2, -40, 235), [0, 1, 0], sd < 0 ? [-10, 80] : [-80, 10]);
  hinge(`${nm}-wing`, `${nm}-wing-tip`, `${nm}-wrist`, at(sd * (bw / 2 + 7), 70, 205), [0, 0, 1], [-40, 40]);
}

// Tail fan lifts about X at the rump.
add('tail', side([[110, 170], [240, 150], [250, 120], [225, 125], [215, 100], [120, 145]], 60).color(wing));
hinge('body', 'tail', 'tail-lift', at(0, 120, 160), [1, 0, 0], [-30, 30]);

// Legs: a stick shin from the belly to a three-toed foot, swinging at the hip.
for (const sd of [-1, 1]) {
  const nm = sd < 0 ? 'left' : 'right';
  const x = sd * 30;
  const foot = extrudePolygon([[-6 * s, 20 * s], [-30 * s, -45 * s], [-12 * s, -50 * s], [0, -12 * s], [12 * s, -50 * s], [30 * s, -45 * s], [6 * s, 20 * s]], 10 * s)
    .translate(x * s, 0, 0);
  add(`${nm}-leg`, rod([x, 0, 130], [x, -5, 8], 16, 12).union(foot).color(beak));
  hinge('body', `${nm}-leg`, `${nm}-hip`, at(x, 0, 125), [1, 0, 0], [-60, 40]);
}

return r.model();
