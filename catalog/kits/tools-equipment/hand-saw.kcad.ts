// Original kernelCAD low-poly carpenter's hand saw lying flat as a pickup item:
// a tapered steel blade with a zig-zag toothed edge and a closed wooden
// pistol handle held by brass screws. Millimetres, Z up, base on z = 0
// centred on x = y = 0, blade along X with the toe at +X and teeth toward -Y.

meta({
  name: 'hand-saw',
  license: 'CC0-1.0',
  title: 'Hand saw',
  description: 'Carpenter hand saw lying flat as a pickup or workshop prop, with a tapered toothed steel blade and a closed wooden handle with brass screws. Knobs: length, tooth count, blade, handle and screw colours.',
  tags: ['saw', 'hand saw', 'handsaw', 'carpentry', 'woodworking', 'tool', 'hand tool', 'item', 'pickup'],
  kit: 'tools-equipment',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'workshop', 'garage', 'construction'],
  triangleBudget: 420,
});

const length = param('length', '550', { choices: ['400', '550', '650'], label: 'Blade length (mm)' });
const teeth = param('teeth', '16', { choices: ['10', '16', '24'], label: 'Teeth' });
const blade = param('blade', '#b9bfc6', { label: 'Blade' });
const handle = param('handle', '#9c5f32', { label: 'Handle' });
const screws = param('screws', '#d1a43a', { label: 'Screws' });

presets({
  modern: { handle: '#d8402a', screws: '#2a2a2c' },
  old: { blade: '#8a8478', handle: '#6b4226', screws: '#a07a3a' },
});

const BL = Number(length.value);
const n = Number(teeth.value);
const xh = 75 - BL / 2; // heel of the blade, placed so handle + blade centre on x = 0
const xt = xh + BL; // toe
const T = 24; // handle thickness
const zc = T / 2;

const sw = assembly('hand-saw');
// Blade: bottom edge is a row of teeth pointing -Y, back edge tapers to the toe.
const dx = (xt - xh) / n;
const bp: [number, number][] = [];
for (let i = 0; i < n; i++) {
  bp.push([xh + i * dx, 0]);
  bp.push([xh + (i + 0.65) * dx, -Math.min(9, dx * 0.45)]);
}
bp.push([xt, 0], [xt, 62], [xh, 128]);
sw.part('blade', extrudePolygon(bp, 2)
  .translate(0, 0, zc - 1).color(blade));

// Closed pistol handle with a hand hole, wrapped round the heel of the blade.
const hx = xh;
const H = (pts: [number, number][]) => pts.map(([x, y]) => [x + hx, y] as [number, number]);
sw.part('handle', extrudePolygon(H([[30, -12], [-60, -28], [-120, -24], [-150, 18], [-140, 62], [-110, 112], [-80, 152], [-35, 162], [10, 148], [22, 100], [22, 20]]), T)
  .subtract(extrudePolygon(H([[-110, 40], [-35, 32], [-20, 106], [-62, 128], [-88, 104]]), T * 3).translate(0, 0, -T))
  .color(handle));
// Brass screws through the handle cheek.
for (const [i, [x, y]] of [[0, 15], [-2, 60], [-20, 140]].entries()) {
  sw.part(`screw-${i + 1}`, cylinder(T + 2, 7, 6).translate(hx + x, y, 0).color(screws));
}

return sw.model();
