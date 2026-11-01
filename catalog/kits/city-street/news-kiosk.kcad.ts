// Original kernelCAD low-poly news kiosk: a boxy stall with a front counter,
// a striped sloping awning with a zig-zag valance, a flat roof and shelves of
// magazines inside. Millimetres, Z up, serving side faces -Y.

meta({
  name: 'news-kiosk',
  license: 'CC0-1.0',
  title: 'News kiosk',
  description: 'Street news and snack kiosk with a front counter, striped awning and stocked shelves. Knobs: width, stripes, body, roof, awning, stripe and goods colours.',
  tags: ['kiosk', 'newsstand', 'stall', 'shop', 'booth', 'market', 'street'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street', 'market'],
  triangleBudget: 450,
});

const widthMm = param('widthMm', '2000', { choices: ['1600', '2000', '2400'], label: 'Width (mm)' });
const stripes = param('stripes', '7', { choices: ['5', '7', '9'], label: 'Awning stripes' });
const body = param('body', '#2f6b4a', { label: 'Body' });
const roof = param('roof', '#e9e4d6', { label: 'Roof and counter' });
const awning = param('awning', '#c8352b', { label: 'Awning' });
const stripe = param('stripe', '#f4f1e8', { label: 'Awning stripe' });
const goods = param('goods', '#e8b630', { label: 'Goods' });

presets({
  blue: { body: '#2a4f7a', awning: '#2a7fc8' },
  coffee: { body: '#5a3a27', awning: '#2f2f2f', stripe: '#c8a46a', goods: '#c8a46a' },
});

const W = Number(widthMm.value);
const D = 1600;
const H = 2300;
const n = Number(stripes.value);

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const k = assembly('news-kiosk');
k.part('base', blk(-W / 2, -D / 2, 0, W / 2, D / 2, 1000).color(body));
k.part('back-wall', blk(-W / 2, D / 2 - 100, 990, W / 2, D / 2, H).color(body));
k.part('side-left', blk(-W / 2, -D / 2, 990, -W / 2 + 100, D / 2, H).color(body));
k.part('side-right', blk(W / 2 - 100, -D / 2, 990, W / 2, D / 2, H).color(body));
k.part('counter', blk(-W / 2 - 40, -D / 2 - 220, 1000, W / 2 + 40, -D / 2 + 120, 1050).color(roof));
k.part('roof', blk(-W / 2 - 150, -D / 2 - 150, H, W / 2 + 150, D / 2 + 150, H + 110).color(roof));

// Shelves of magazines along the back wall.
for (const [i, z] of [[1, 1150], [2, 1450], [3, 1750]] as const) {
  k.part(`shelf-${i}`, blk(-W / 2 + 100, D / 2 - 260, z, W / 2 - 100, D / 2 - 99, z + 220).color(goods));
}

// Slanted magazine rack on the front of the base.
k.part('rack', box(W - 300, 60, 420, true).rotateX(-15).translate(0, -D / 2 - 40, 650).color(goods));
k.part('rack-ledge', blk(-W / 2 + 150, -D / 2 - 130, 380, W / 2 - 150, -D / 2 + 1, 420).color(roof));

// Sloping awning: alternating stripes hanging off the front of the roof.
const aw = W + 300;
const sw = aw / n;
const run = 560;
const drop = 220;
const len = Math.hypot(run, drop);
const ang = (Math.atan2(drop, run) * 180) / Math.PI;
for (let i = 0; i < n; i++) {
  const x = -aw / 2 + sw * (i + 0.5);
  const piece = box(sw + 1, len, 30, true).rotateX(ang).translate(x, -D / 2 - 150 - run / 2, H + 20 - drop / 2);
  k.part(`awning-${i + 1}`, piece.color(i % 2 === 0 ? awning : stripe));
}
// Zig-zag valance along the low edge of the awning.
const teeth: [number, number][] = [[-aw / 2, 0]];
for (let i = 0; i < n; i++) {
  teeth.push([-aw / 2 + sw * (i + 0.5), -160]);
  teeth.push([-aw / 2 + sw * (i + 1), 0]);
}
teeth.push([aw / 2, 60], [-aw / 2, 60]);
k.part('valance', extrudePolygon(teeth, 20).rotateX(90).translate(0, -D / 2 - 150 - run + 20, H + 20 - drop - 30).color(awning));

return k.model();
