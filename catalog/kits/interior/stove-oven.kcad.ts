// Original kernelCAD low-poly kitchen range: a freestanding cooker with a
// four-zone hob (gas grates or electric rings), control knobs, an oven door
// with a window and bar handle, a storage drawer and an optional splashback.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front faces -Y.

meta({
  name: 'stove-oven',
  license: 'CC0-1.0',
  title: 'Stove with oven',
  description: 'Freestanding kitchen range cooker with gas grates or electric rings, control knobs, oven door with window and handle, and storage drawer. Knobs: hob type, splashback, body, hob, glass and metal colours.',
  tags: ['stove', 'oven', 'cooker', 'range', 'hob', 'kitchen', 'appliance'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen'],
  triangleBudget: 500,
});

const hob = param('hob', 'gas', { choices: ['gas', 'electric'], label: 'Hob type' });
const splash = param('splashback', 'yes', { choices: ['yes', 'no'], label: 'Splashback' });
const body = param('body', '#e9e8e4', { label: 'Body' });
const top = param('top', '#2b2d30', { label: 'Hob and burners' });
const glass = param('glass', '#3a4248', { label: 'Oven glass' });
const metal = param('metal', '#b9bcbf', { label: 'Handle and knobs' });

presets({
  steel: { body: '#c9ccd0', metal: '#3b3d42' },
  retro: { body: '#8fb8b0', metal: '#e8e6df', top: '#232323' },
  black: { body: '#2b2d30', metal: '#c9ccd0', top: '#1b1c1e' },
});

const W = 600;
const D = 600;
const H = 900;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const s = assembly('stove-oven');
const fy = -D / 2;
s.part('body', blk(-W / 2, fy + 10, 0, W / 2, D / 2, H - 20).color(body));
s.part('hob-plate', blk(-W / 2, fy, H - 21, W / 2, D / 2, H).color(top));
s.part('control-panel', blk(-W / 2, fy, H - 140, W / 2, fy + 11, H - 21).color(body));
for (let i = 0; i < 4; i++) {
  const x = -W / 2 + 90 + i * 140;
  s.part(`knob-${i + 1}`, ngon(22, 6).extrude(30).rotateX(90).translate(x, fy + 1, H - 80).color(metal));
}
// Oven door with a window, a bar handle on stand-offs, and a drawer below.
s.part('oven-door', blk(-W / 2 + 10, fy - 10, 190, W / 2 - 10, fy + 11, H - 150).color(body));
s.part('oven-window', blk(-W / 2 + 80, fy - 14, 300, W / 2 - 80, fy - 9, H - 290).color(glass));
s.part('oven-handle', blk(-W / 2 + 60, fy - 50, H - 205, W / 2 - 60, fy - 30, H - 185).color(metal));
for (const hx of [-W / 2 + 70, W / 2 - 90]) {
  s.part(`handle-post-${hx < 0 ? 'l' : 'r'}`, blk(hx, fy - 31, H - 203, hx + 20, fy - 9, H - 188).color(metal));
}
s.part('drawer', blk(-W / 2 + 10, fy - 6, 40, W / 2 - 10, fy + 11, 175).color(body));
s.part('drawer-pull', blk(-100, fy - 26, 140, 100, fy - 5, 155).color(metal));
s.part('plinth', blk(-W / 2 + 10, fy + 30, 0, W / 2 - 10, fy + 40, 41).color(top));

// Four cooking zones.
const zones: [number, number, number][] = [[-140, -130, 80], [140, -130, 60], [-140, 140, 60], [140, 140, 80]];
zones.forEach(([x, y, r], i) => {
  if (hob.value === 'gas') {
    s.part(`burner-${i + 1}`, ngon(r * 0.55, 8).extrude(25).translate(x, y, H - 1).color(metal));
    // Pan support: a cross of cast bars resting on the hob around each burner.
    s.part(`grate-${i + 1}-a`, blk(x - 120, y - 9, H - 1, x + 120, y + 9, H + 32).color(top));
    s.part(`grate-${i + 1}-b`, blk(x - 9, y - 120, H - 1, x + 9, y + 120, H + 32).color(top));
  } else {
    s.part(`ring-${i + 1}`, ngon(r + 20, 10).extrude(5).translate(x, y, H - 1).color(metal));
  }
});
if (splash.value === 'yes') {
  s.part('splashback', blk(-W / 2, D / 2 - 30, H - 1, W / 2, D / 2, H + 120).color(body));
}

return s.model();
