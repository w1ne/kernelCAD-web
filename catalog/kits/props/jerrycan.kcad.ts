// Original kernelCAD low-poly jerrycan: a flat upright fuel can with the
// classic X-pressing on its sides, a three-bar handle and an angled spout cap.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, flat faces to ±Y.

meta({
  name: 'jerrycan',
  license: 'CC0-1.0',
  title: 'Jerrycan',
  description: 'Steel fuel jerrycan with X-pressed sides, three-bar handle and spout cap. Knobs: can, X-pressing, handle and cap colours.',
  tags: ['jerrycan', 'jerry can', 'fuel can', 'gas can', 'petrol', 'container', 'military', 'garage'],
  kit: 'props',
  category: 'item',
  origin: 'base',
  compat: ['outdoor', 'garage', 'military', 'industrial', 'post-apocalyptic'],
  triangleBudget: 220,
});

const can = param('can', '#4f5f38', { label: 'Can' });
const press = param('press', '#5c6d42', { label: 'X pressing' });
const handle = param('handle', '#3f4c2c', { label: 'Handle' });
const cap = param('cap', '#2f2f2f', { label: 'Cap' });

presets({
  red: { can: '#b8302a', press: '#cc3a32', handle: '#8f241f' },
  yellow: { can: '#e0b22a', press: '#ecc23e', handle: '#b38a1c' },
});

const W = 340; // along X
const T = 165; // thickness along Y
const H = 470;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const j = assembly('jerrycan');
// Body: side profile with chamfered top corners, extruded through Y.
const prof: [number, number][] = [[-W / 2, 0], [W / 2, 0], [W / 2, H - 50], [W / 2 - 50, H], [-W / 2 + 50, H], [-W / 2, H - 50]];
j.part('can', extrudePolygon(prof, T).rotateX(90).translate(0, T / 2, 0).color(can));
// X pressing: two crossed raised strips on each flat face.
const diag = Math.atan2(H - 120, W - 80) * 180 / Math.PI;
const dl = Math.hypot(W - 80, H - 120);
let k = 0;
for (const sy of [-1, 1]) {
  for (const a of [diag, -diag]) {
    k++;
    j.part(`x-${k}`, box(dl, 14, 34, true).rotateY(-a).translate(0, sy * (T / 2 + 5), H / 2 - 20).color(press));
  }
}
// Three-bar handle above the top.
j.part('handle', blk(-W / 2 + 40, -60, H - 2, -W / 2 + 70, 60, H + 70)
  .union(blk(-25, -60, H - 2, 5, 60, H + 70))
  .union(blk(W / 2 - 150, -60, H - 2, W / 2 - 120, 60, H + 70))
  .union(blk(-W / 2 + 40, -15, H + 50, W / 2 - 120, 15, H + 85))
  .color(handle));
// Angled spout cap at the front corner.
j.part('cap', blk(-28, -28, 0, 28, 28, 60).rotateY(45).translate(W / 2 - 50, 0, H - 30).color(cap));

return j.model();
