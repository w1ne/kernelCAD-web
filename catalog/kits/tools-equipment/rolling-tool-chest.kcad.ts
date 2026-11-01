// Original kernelCAD low-poly rolling tool chest: a mechanic's drawer cabinet
// on four castors with full-width drawer pulls, a side push handle and an
// optional top chest with a hinged lid.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, drawers face -Y.

meta({
  name: 'rolling-tool-chest',
  license: 'CC0-1.0',
  title: 'Rolling tool chest',
  description: "Mechanic's rolling tool chest: drawer cabinet on castors with pull bars, side push handle and optional top box with lid. Knobs: drawers, top box, width, body, pull, top and castor colours.",
  tags: ['tool chest', 'tool cabinet', 'roller cabinet', 'toolbox', 'drawers', 'mechanic', 'garage', 'workshop'],
  kit: 'tools-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'garage', 'workshop', 'factory', 'industrial'],
  triangleBudget: 540,
});

const drawers = param('drawers', '5', { choices: ['3', '4', '5', '6'], label: 'Drawers' });
const topBox = param('topBox', 'yes', { choices: ['yes', 'no'], label: 'Top chest' });
const width = param('width', '680', { choices: ['520', '680', '900'], label: 'Width (mm)' });
const body = param('body', '#c8302a', { label: 'Body' });
const pull = param('pull', '#c8ced2', { label: 'Drawer pulls' });
const topC = param('topColor', '#2a2a2c', { label: 'Worktop and trim' });
const wheel = param('wheel', '#1c1c1e', { label: 'Castors' });

presets({
  blue: { body: '#2f6fc0' },
  black: { body: '#2a2a2c', topColor: '#c8302a' },
  orange: { body: '#e07a22', pull: '#2a2a2c' },
});

const n = Number(drawers.value);
const W = Number(width.value);
const D = 460;
const z0 = 110; // cabinet underside above the floor
const H = 800;
const blk = (x0: number, y0: number, z0b: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0b).translate(x0, y0, z0b);

const r = assembly('rolling-tool-chest');
r.part('cabinet', blk(-W / 2, -D / 2, z0, W / 2, D / 2, z0 + H).color(body));
r.part('worktop', blk(-W / 2 - 10, -D / 2 - 10, z0 + H, W / 2 + 10, D / 2 + 10, z0 + H + 25).color(topC));

// Drawer fronts: proud panels graded deeper toward the bottom, each with a pull bar.
const inner = H - 40;
const weights = Array.from({ length: n }, (_, i) => 1 + (i / Math.max(1, n - 1)) * 0.8);
const sum = weights.reduce((a, b) => a + b, 0);
let zt = z0 + H - 20;
weights.forEach((w, i) => {
  const h = (inner * w) / sum;
  r.part(`drawer-${i + 1}`, blk(-W / 2 + 25, -D / 2 - 12, zt - h + 6, W / 2 - 25, -D / 2 + 1, zt - 6).color(body));
  r.part(`pull-${i + 1}`, blk(-W / 2 + 50, -D / 2 - 32, zt - 34, W / 2 - 50, -D / 2 - 11, zt - 18).color(pull));
  zt -= h;
});

// Push handle: a U-shaped bar standing off the +X side.
r.part('handle', blk(W / 2 - 1, -D / 2 + 50, z0 + H - 120, W / 2 + 70, -D / 2 + 80, z0 + H - 90)
  .union(blk(W / 2 - 1, D / 2 - 80, z0 + H - 120, W / 2 + 70, D / 2 - 50, z0 + H - 90))
  .union(blk(W / 2 + 45, -D / 2 + 50, z0 + H - 120, W / 2 + 75, D / 2 - 50, z0 + H - 90)).color(pull));

// Castors: a swivel fork with a wheel under each corner.
for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
  const cx = x * (W / 2 - 60);
  const cy = y * (D / 2 - 60);
  let w = path().moveTo(45, 0);
  for (let k = 1; k < 8; k++) w = w.lineTo(45 * Math.cos((Math.PI * k) / 4), 45 * Math.sin((Math.PI * k) / 4));
  r.part(`castor-${x < 0 ? 'l' : 'r'}${y < 0 ? 'f' : 'b'}`, w.close().extrude(34).rotateY(90).translate(cx - 17, cy, 45)
    .union(blk(cx - 25, cy - 30, 60, cx + 25, cy + 30, z0 + 1)).color(wheel));
}

if (topBox.value === 'yes') {
  // Top chest: a shorter drawer box with a hinged lid.
  const tb = z0 + H + 25;
  const th = 300;
  r.part('top-box', blk(-W / 2 + 10, -D / 2 + 30, tb, W / 2 - 10, D / 2 - 10, tb + th).color(body));
  for (let i = 0; i < 2; i++) {
    const zz = tb + 30 + i * 110;
    r.part(`top-drawer-${i + 1}`, blk(-W / 2 + 30, -D / 2 + 18, zz, W / 2 - 30, -D / 2 + 31, zz + 95).color(body));
    r.part(`top-pull-${i + 1}`, blk(-W / 2 + 60, -D / 2 + 2, zz + 65, W / 2 - 60, -D / 2 + 19, zz + 80).color(pull));
  }
  r.part('lid', blk(-W / 2 + 4, -D / 2 + 24, tb + th, W / 2 - 4, D / 2 - 4, tb + th + 50).color(topC));
}

return r.model();
