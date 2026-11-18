// Original kernelCAD low-poly ottoman: a faceted round pouf with a button,
// or an upholstered footstool with a domed cushion on four short legs.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0.

meta({
  name: 'ottoman',
  license: 'CC0-1.0',
  title: 'Ottoman',
  description: 'Upholstered ottoman: a round faceted pouf with a centre button or a square padded footstool on short legs. Knobs: style, size, fabric and accent colours.',
  tags: ['ottoman', 'pouf', 'footstool', 'footrest', 'hassock', 'seat', 'living room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom'],
  triangleBudget: 200,
});

const style = param('style', 'pouf', { choices: ['pouf', 'footstool'], label: 'Style' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const fabric = param('fabric', '#c78a3b', { label: 'Fabric' });
const accent = param('accent', '#5a3a27', { label: 'Button and legs' });

presets({
  teal: { fabric: '#2f7a7a', accent: '#d9c08a' },
  blush: { fabric: '#d9a3a0', accent: '#b8913f' },
  charcoal: { fabric: '#3b3d42', accent: '#8a6a48' },
});

const s = size.value === 'small' ? 0.8 : size.value === 'large' ? 1.25 : 1;
const ngon = (r: number, n: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < n; k++) {
    const a = rot + (2 * Math.PI * k) / n;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();

const o = assembly('ottoman');
if (style.value === 'pouf') {
  const r = 250 * s;
  const h = 400 * s;
  // Bulging drum: rings widen to the middle, then round over on top.
  o.part('body', ngon(r * 0.85, 12).loft([ngon(r, 12), ngon(r * 0.97, 12), ngon(r * 0.72, 12)], {
    planes: [
      { plane: 'XY', origin: [0, 0, 0] },
      { plane: 'XY', origin: [0, 0, h * 0.45] },
      { plane: 'XY', origin: [0, 0, h * 0.88] },
      { plane: 'XY', origin: [0, 0, h] },
    ],
    ruled: true,
  }).color(fabric));
  o.part('button', ngon(28 * s, 6).extrude(14 * s).translate(0, 0, h - 6 * s).color(accent));
} else {
  const w = 600 * s;
  const d = 450 * s;
  const legH = 110 * s;
  const lw = 40 * s;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy], i) => {
    const x = sx * (w / 2 - lw);
    const y = sy * (d / 2 - lw);
    o.part(`leg-${i + 1}`, rect(lw * 0.6, lw * 0.6).loft(rect(lw, lw), { spacing: legH + 5, ruled: true }).translate(x, y, 0).color(accent));
  });
  o.part('cushion', rect(w, d).loft([rect(w, d), rect(w - 50 * s, d - 50 * s)], {
    planes: [
      { plane: 'XY', origin: [0, 0, legH] },
      { plane: 'XY', origin: [0, 0, legH + 200 * s] },
      { plane: 'XY', origin: [0, 0, legH + 260 * s] },
    ],
    ruled: true,
  }).color(fabric));
}

return o.model();
