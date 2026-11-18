// Original kernelCAD low-poly city bus: a 12 m boxy body with a continuous
// window band split by pillars, a tall windscreen with a destination display,
// glazed doors on the kerb side, a livery stripe, a roof pod and four wheels.
// Millimetres, Z up, nose toward +X, doors on -Y.

meta({
  name: 'city-bus',
  license: 'CC0-1.0',
  title: 'City bus',
  description: 'Single-deck 12 m city bus with window band, glazed doors, destination display, livery stripe and roof unit. Knobs: doors, body, glass, stripe, tyre and light colours.',
  tags: ['bus', 'city bus', 'transit', 'public transport', 'vehicle', 'coach', 'traffic', 'street'],
  kit: 'city-street',
  category: 'vehicle',
  origin: 'base',
  compat: ['outdoor', 'street', 'road', 'transit'],
  triangleBudget: 800,
});

const doors = param('doors', '2', { choices: ['2', '3'], label: 'Doors' });
const body = param('body', '#e8e8e4', { label: 'Body' });
const glass = param('glass', '#2f4250', { label: 'Glass' });
const stripe = param('stripe', '#c8261e', { label: 'Livery stripe' });
const tyre = param('tyre', '#1d1e20', { label: 'Tyres and bumpers' });
const lights = param('lights', '#f2b82a', { label: 'Lights and display' });

presets({
  red: { body: '#c8261e', stripe: '#f2f2ee' },
  green: { body: '#2f7d4a', stripe: '#f2c418' },
});

const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
// Wheel with its axle along Y, a facet vertex touching the ground.
const wheelAt = (x: number, y: number, r: number, w: number, s = 10) =>
  ngon(r, s, Math.PI / 2).extrude(w).translate(0, 0, -w / 2).rotateX(90).translate(x, y, r);

const L = 12000;
const W = 2550;
const bus = assembly('city-bus');
bus.part('body', blk(-L / 2, -W / 2, 350, L / 2, W / 2, 3000).color(body));
bus.part('roof-pod', blk(-2600, -900, 2990, 900, 900, 3250).color(body));
bus.part('windows', blk(-L / 2 + 200, -W / 2 - 10, 1300, L / 2 - 150, W / 2 + 10, 2700).color(glass));
const np = 9;
for (let k = 0; k < np; k++) {
  const x = -L / 2 + 200 + (k * (L - 350)) / (np - 1);
  bus.part(`pillar-${k + 1}`, blk(x - 60, -W / 2 - 20, 1300, x + 60, W / 2 + 20, 2700).color(body));
}
bus.part('windscreen', blk(L / 2 - 10, -W / 2 + 90, 950, L / 2 + 15, W / 2 - 90, 2750).color(glass));
bus.part('display', blk(L / 2 - 5, -1000, 2780, L / 2 + 20, 1000, 2930).color(lights));
bus.part('rear-window', blk(-L / 2 - 15, -1050, 1900, -L / 2 + 10, 1050, 2700).color(glass));
bus.part('stripe', blk(-L / 2 + 15, -W / 2 - 10, 800, L / 2 - 15, W / 2 + 10, 1000).color(stripe));
bus.part('bumper-front', blk(L / 2 - 20, -W / 2, 330, L / 2 + 90, W / 2, 560).color(tyre));
bus.part('bumper-rear', blk(-L / 2 - 90, -W / 2, 330, -L / 2 + 20, W / 2, 560).color(tyre));
const doorXs = Number(doors.value) === 3 ? [4400, 300, -4100] : [4400, -300];
for (const [k, x] of doorXs.entries()) {
  bus.part(`door-${k + 1}`, blk(x, -W / 2 - 25, 420, x + 1200, -W / 2 + 1, 2700).color(glass));
  bus.part(`door-split-${k + 1}`, blk(x + 570, -W / 2 - 35, 420, x + 630, -W / 2 + 1, 2700).color(body));
}
for (const side of [-1, 1]) {
  const s = side < 0 ? 'l' : 'r';
  bus.part(`headlight-${s}`, blk(L / 2 + 10, side * 950 - 180, 600, L / 2 + 30, side * 950 + 180, 760).color(lights));
  for (const [k, x] of [['front', 3800], ['rear', -2700]] as const) {
    bus.part(`wheel-${k}-${s}`, wheelAt(x, side * (W / 2 - 145), 500, 320, 12).color(tyre));
  }
}

return bus.model();
