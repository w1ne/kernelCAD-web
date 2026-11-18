// Original kernelCAD low-poly street food cart: a cabinet on a pair of wheels
// with a front prop leg and push handle, a counter with goods and a canopy on
// four poles with a zig-zag valance. Millimetres, Z up, counter faces -Y.

meta({
  name: 'food-cart',
  license: 'CC0-1.0',
  title: 'Food cart',
  description: 'Push-along street food cart with wheels, counter, goods and a canopy with a zig-zag valance. Knobs: canopy, body, canopy, trim, wheel and goods colours.',
  tags: ['food cart', 'hot dog cart', 'street food', 'vendor', 'cart', 'stall', 'market', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'market', 'park'],
  triangleBudget: 460,
});

const roofed = param('roofed', 'yes', { choices: ['yes', 'no'], label: 'Canopy' });
const body = param('body', '#d8d4c8', { label: 'Body' });
const canopy = param('canopy', '#c8352b', { label: 'Canopy' });
const trim = param('trim', '#9aa0a6', { label: 'Counter and poles' });
const wheel = param('wheel', '#2a2c2e', { label: 'Wheels' });
const goods = param('goods', '#e8a03a', { label: 'Goods' });

presets({
  ice: { body: '#8fd1e8', canopy: '#f2f2ee', goods: '#f4b8c8' },
  coffee: { body: '#5a3a27', canopy: '#2f2f2f', goods: '#c8a46a' },
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

const L = 1600;
const D = 760;
const fc = assembly('food-cart');
fc.part('body', blk(-L / 2, -D / 2, 340, L / 2, D / 2, 1000).color(body));
fc.part('counter', blk(-L / 2 - 30, -D / 2 - 60, 1000, L / 2 + 30, D / 2 + 30, 1040).color(trim));
fc.part('skirt', blk(-L / 2 + 20, -D / 2 - 6, 420, L / 2 - 20, -D / 2 + 1, 520).color(canopy));
for (const side of [-1, 1]) {
  fc.part(`wheel-${side < 0 ? 'front' : 'back'}`, ngon(330, 10).extrude(60).translate(0, 0, -30).rotateX(90).translate(-300, side * (D / 2 + 40), 330).color(wheel));
  fc.part(`hub-${side < 0 ? 'front' : 'back'}`, ngon(60, 6).extrude(60).translate(0, 0, -30).rotateX(90).translate(-300, side * (D / 2 + 80), 330).color(trim));
}
fc.part('axle', box(60, D + 120, 60, true).translate(-300, 0, 330).color(trim));
fc.part('prop-leg-1', blk(L / 2 - 120, -D / 2 + 40, 0, L / 2 - 70, -D / 2 + 90, 345).color(trim));
fc.part('prop-leg-2', blk(L / 2 - 120, D / 2 - 90, 0, L / 2 - 70, D / 2 - 40, 345).color(trim));
fc.part('handle', blk(L / 2 - 10, -280, 880, L / 2 + 260, -230, 920).color(trim));
fc.part('handle-2', blk(L / 2 - 10, 230, 880, L / 2 + 260, 280, 920).color(trim));
fc.part('handle-grip', blk(L / 2 + 220, -280, 870, L / 2 + 270, 280, 930).color(wheel));
for (let i = 0; i < 4; i++) {
  const x = -L / 2 + 160 + i * 220;
  fc.part(`goods-${i + 1}`, blk(x, -D / 2 + 60, 1039, x + 160, -D / 2 + 260, 1039 + 90 + (i % 2) * 50).color(goods));
}
if (roofed.value === 'yes') {
  for (const [k, [px, py]] of [[-1, -1], [1, -1], [-1, 1], [1, 1]].entries()) {
    fc.part(`pole-${k + 1}`, blk(px * (L / 2 - 40) - 15, py * (D / 2 - 40) - 15, 1039, px * (L / 2 - 40) + 15, py * (D / 2 - 40) + 15, 2000).color(trim));
  }
  fc.part('roof', blk(-L / 2 - 120, -D / 2 - 160, 2000, L / 2 + 120, D / 2 + 120, 2060).color(canopy));
  const teeth: [number, number][] = [[-L / 2 - 120, 0]];
  const nt = 8;
  const tw = (L + 240) / nt;
  for (let i = 0; i < nt; i++) {
    teeth.push([-L / 2 - 120 + tw * (i + 0.5), -130]);
    teeth.push([-L / 2 - 120 + tw * (i + 1), 0]);
  }
  teeth.push([L / 2 + 120, 30], [-L / 2 - 120, 30]);
  fc.part('valance', extrudePolygon(teeth, 16).rotateX(90).translate(0, -D / 2 - 150, 2010).color(trim));
}

return fc.model();
