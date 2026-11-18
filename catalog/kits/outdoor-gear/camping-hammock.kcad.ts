// Original low-poly hammock with a faceted sling and freestanding support.
// Millimetres, Z up, stand feet at z = 0.

meta({
  name: 'camping-hammock',
  license: 'CC0-1.0',
  title: 'Camping hammock',
  description: 'Freestanding camping hammock with a low faceted sling, end straps and a folding support frame. Knobs: sling length, fabric, frame and strap colours.',
  tags: ['hammock', 'camping', 'sling', 'outdoor', 'hiking', 'camp bed'],
  kit: 'outdoor-gear',
  category: 'furniture',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 320,
});

const length = param('length', '2200', { choices: ['2200', '2600'], label: 'Sling length (mm)' });
const fabric = param('fabric', '#b34c39', { label: 'Sling fabric' });
const frame = param('frame', '#5a6260', { label: 'Support frame' });
const strap = param('strap', '#3b403e', { label: 'End straps' });
presets({
  forest: { fabric: '#54785a', frame: '#52595a', strap: '#2f3833' },
  coastal: { fabric: '#d27755', frame: '#778083', strap: '#46464c' },
});

const slingLength = Number(length.value);
const half = slingLength / 2;
const anchor = half + 250;
const hammock = assembly('camping-hammock');
const points: Array<[number, number]> = [
  [-half, 660],
  [-half * 0.52, 390],
  [0, 300],
  [half * 0.52, 390],
  [half, 660],
];
for (let i = 0; i < points.length - 1; i++) {
  const [x1, z1] = points[i];
  const [x2, z2] = points[i + 1];
  const dx = x2 - x1;
  const dz = z2 - z1;
  hammock.part('sling-panel-' + (i + 1), box(Math.hypot(dx, dz) + 12, 620, 28, true)
    .rotateY(-Math.atan2(dz, dx) * 180 / Math.PI)
    .translate((x1 + x2) / 2, 0, (z1 + z2) / 2)
    .color(fabric));
}
hammock.part('left-end-strap', box(26, 36, 210, true).rotateY(-18).translate(-half - 72, 0, 680).color(strap));
hammock.part('right-end-strap', box(26, 36, 210, true).rotateY(18).translate(half + 72, 0, 680).color(strap));
for (const x of [-anchor, anchor]) {
  const side = x < 0 ? 'left' : 'right';
  hammock.part(side + '-crossbar', box(55, 700, 55, true).translate(x, 0, 735).color(frame));
  hammock.part(side + '-front-leg', box(34, 34, 790, true).rotateX(-18).translate(x, -165, 395).color(frame));
  hammock.part(side + '-rear-leg', box(34, 34, 790, true).rotateX(18).translate(x, 165, 395).color(frame));
  hammock.part(side + '-foot', box(80, 780, 42, true).translate(x, 0, 21).color(frame));
}

return hammock.model();
