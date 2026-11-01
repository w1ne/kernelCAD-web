// Original kernelCAD low-poly bathroom vanity: a sink cabinet with doors or
// drawers, a stone top with a sunken basin, a mixer tap and an optional wall
// mirror. Millimetres, Z up, standing on z = 0 centred on x = y = 0. Front
// faces -Y; the back and mirror sit against a wall at +Y.

meta({
  name: 'sink-vanity',
  license: 'CC0-1.0',
  title: 'Sink vanity',
  description: 'Bathroom vanity unit with a basin sunk into the top, mixer tap, doors or drawers, on a plinth or legs, with an optional mirror above. Knobs: width, fronts, base, mirror, cabinet, top, handle and mirror colours.',
  tags: ['vanity', 'sink', 'basin', 'washbasin', 'bathroom cabinet', 'bathroom', 'mirror'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'bathroom'],
  triangleBudget: 400,
});

const width = param('width', '800', { choices: ['600', '800', '1000'], label: 'Width (mm)' });
const fronts = param('fronts', 'doors', { choices: ['doors', 'drawers'], label: 'Fronts' });
const base = param('base', 'legs', { choices: ['plinth', 'legs'], label: 'Base' });
const mirrorK = param('mirror', 'yes', { choices: ['yes', 'no'], label: 'Mirror' });
const cabinet = param('cabinet', '#5c7a8a', { label: 'Cabinet' });
const top = param('top', '#efede7', { label: 'Top and basin' });
const metal = param('metal', '#c9ccd0', { label: 'Tap and handles' });
const glass = param('glass', '#bcd3dc', { label: 'Mirror' });

presets({
  oak: { cabinet: '#b98a5a', top: '#f4f3ef' },
  white: { cabinet: '#f2f1ec', top: '#3b3d42', metal: '#2b2927' },
  green: { cabinet: '#3f5e45', metal: '#b8913f' },
});

const W = Number(width.value);
const D = 470;
const H = 850;
const tt = 30;
const baseH = base.value === 'legs' ? 160 : 90;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const v = assembly('sink-vanity');
v.part('carcass', blk(-W / 2, -D / 2 + 20, baseH, W / 2, D / 2, H - tt + 1).color(cabinet));
if (base.value === 'legs') {
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
    const x = sx * (W / 2 - 50);
    const y = sy * (D / 2 - 50) + 10;
    v.part(`leg-${i + 1}`, blk(x - 18, y - 18, 0, x + 18, y + 18, baseH + 1).color(metal));
  });
} else {
  v.part('plinth', blk(-W / 2 + 20, -D / 2 + 50, 0, W / 2 - 20, D / 2, baseH + 1).color(cabinet));
}
// Basin: a chamfered bowl cut into the stone top.
const bw = Math.min(W - 160, 480);
const basin = path().moveTo(-bw / 2 + 60, -130).lineTo(bw / 2 - 60, -130).lineTo(bw / 2, -70).lineTo(bw / 2, 90).lineTo(bw / 2 - 60, 130)
  .lineTo(-bw / 2 + 60, 130).lineTo(-bw / 2, 90).lineTo(-bw / 2, -70).close();
v.part('top', blk(-W / 2 - 5, -D / 2 - 5, H - tt, W / 2 + 5, D / 2, H)
  .subtract(basin.extrude(tt + 20).scale([0.8, 0.8, 1]).translate(0, -30, H - tt - 10))
  .subtract(basin.extrude(tt).translate(0, -30, H - 12)).color(top));
v.part('basin-floor', basin.extrude(10).scale([0.8, 0.8, 1]).translate(0, -30, H - tt - 1).color(top));
// Mixer tap behind the basin.
v.part('tap', ngon(18, 8).extrude(150).translate(0, D / 2 - 70, H - 1)
  .union(blk(-12, D / 2 - 160, H + 120, 12, D / 2 - 60, H + 145))
  .union(blk(-8, D / 2 - 75, H + 145, 8, D / 2 - 15, H + 160)).color(metal));

const fz0 = baseH + 8;
const fz1 = H - tt - 8;
const fy = -D / 2;
if (fronts.value === 'doors') {
  const half = W / 2 - 10;
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -W / 2 + 10 : 3;
    const x1 = sx < 0 ? -3 : W / 2 - 10;
    v.part(`door-${sx < 0 ? 'left' : 'right'}`, blk(x0, fy, fz0, x1, fy + 21, fz1).color(cabinet));
    const hx = sx * 40;
    v.part(`handle-${sx < 0 ? 'left' : 'right'}`, blk(hx - 8, fy - 20, fz1 - 230, hx + 8, fy + 1, fz1 - 60).color(metal));
    void half;
  }
} else {
  const n = 2;
  const dh = (fz1 - fz0) / n;
  for (let i = 0; i < n; i++) {
    const z0 = fz0 + i * dh;
    v.part(`drawer-${i + 1}`, blk(-W / 2 + 10, fy, z0 + 3, W / 2 - 10, fy + 21, z0 + dh - 3).color(cabinet));
    v.part(`pull-${i + 1}`, blk(-W * 0.2, fy - 18, z0 + dh - 70, W * 0.2, fy + 1, z0 + dh - 52).color(metal));
  }
}
if (mirrorK.value === 'yes') {
  const mw = W - 100;
  // Tiled upstand behind the tap carries the mirror.
  v.part('upstand', blk(-W / 2, D / 2 - 14, H - 1, W / 2, D / 2, H + 260).color(top));
  v.part('mirror-frame', blk(-mw / 2, D / 2 - 30, H + 250, mw / 2, D / 2, H + 1000)
    .subtract(blk(-mw / 2 + 30, D / 2 - 40, H + 280, mw / 2 - 30, D / 2 - 15, H + 970)).color(metal));
  v.part('mirror', blk(-mw / 2 + 29, D / 2 - 18, H + 279, mw / 2 - 29, D / 2, H + 971).color(glass));
}

return v.model();
