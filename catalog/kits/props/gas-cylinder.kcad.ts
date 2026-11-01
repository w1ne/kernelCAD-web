// Original kernelCAD low-poly gas cylinder: a faceted steel bottle with a
// domed shoulder, a valve and a protective collar, alone or as a chained
// pair. Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'gas-cylinder',
  license: 'CC0-1.0',
  title: 'Gas cylinder',
  description: 'Steel gas bottle with domed shoulder, brass valve and guard collar, single or a pair. Knobs: count, size, bottle, shoulder band and valve colours.',
  tags: ['gas cylinder', 'gas bottle', 'propane', 'oxygen', 'tank', 'industrial', 'workshop', 'hazard'],
  kit: 'props',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'industrial', 'workshop', 'warehouse', 'sci-fi'],
  triangleBudget: 480,
});

const count = param('count', '1', { choices: ['1', '2'], label: 'Bottles' });
const size = param('size', 'tall', { choices: ['short', 'tall'], label: 'Size' });
const bottle = param('bottle', '#3a7a4a', { label: 'Bottle' });
const shoulder = param('shoulder', '#eeeeea', { label: 'Shoulder band' });
const valve = param('valve', '#c9a43a', { label: 'Valve' });

presets({
  propane: { bottle: '#d8d8d4', shoulder: '#c8302a' },
  oxygen: { bottle: '#2a2a2c', shoulder: '#eeeeea' },
  red: { bottle: '#b8302a', shoulder: '#2a2a2c' },
});

const n = Number(count.value);
const H = size.value === 'short' ? 600 : 1300;
const R = size.value === 'short' ? 160 : 115;
const s = 10;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  return p.close();
};

const g = assembly('gas-cylinder');
const body = H - R * 0.9;
for (let i = 0; i < n; i++) {
  const x = n === 1 ? 0 : (i - 0.5) * (2 * R + 30);
  const id = n === 1 ? '' : `-${i + 1}`;
  g.part(`bottle${id}`, ngon(R * 0.92).loft([ngon(R), ngon(R)], {
    planes: [
      { plane: 'XY', origin: [x, 0, 0] },
      { plane: 'XY', origin: [x, 0, 30] },
      { plane: 'XY', origin: [x, 0, body * 0.8] },
    ],
    ruled: true,
  }).color(bottle));
  // Painted shoulder: a band that rounds over into the neck.
  g.part(`shoulder${id}`, ngon(R).loft([ngon(R * 0.75), ngon(R * 0.32)], {
    planes: [
      { plane: 'XY', origin: [x, 0, body * 0.8 - 1] },
      { plane: 'XY', origin: [x, 0, body + R * 0.35] },
      { plane: 'XY', origin: [x, 0, body + R * 0.65] },
    ],
    ruled: true,
  }).color(shoulder));
  g.part(`valve${id}`, ngon(R * 0.2).extrude(R * 0.5).translate(x, 0, body + R * 0.6)
    .union(box(R * 0.45, R * 0.14, R * 0.14, true).translate(x + R * 0.2, 0, body + R * 0.85))
    .union(ngon(R * 0.28).extrude(R * 0.08).translate(x, 0, body + R * 1.1 - 2))
    .color(valve));
}
if (n === 2) {
  g.part('chain', box(2 * (2 * R + 30), 2 * R + 20, 25, true).translate(0, 0, body * 0.6).subtract(box(2 * (2 * R + 30) - 30, 2 * R - 10, 40, true).translate(0, 0, body * 0.6)).color(valve));
}

return g.model();
