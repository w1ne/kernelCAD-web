// Original kernelCAD low-poly pedal bin: a faceted or square kitchen waste
// bin with a hinged lid, a lid hinge block and a foot pedal at the front.
// Millimetres, Z up, standing on z = 0 centred on x = y = 0. Pedal faces -Y.

meta({
  name: 'pedal-bin',
  license: 'CC0-1.0',
  title: 'Pedal bin',
  description: 'Kitchen or bathroom pedal bin, round or square, with a lid that is closed or raised and a front foot pedal. Knobs: shape, size, lid, body, lid and pedal colours.',
  tags: ['pedal bin', 'trash can', 'waste bin', 'garbage can', 'bin', 'kitchen', 'bathroom', 'office'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'bathroom', 'office'],
  triangleBudget: 200,
});

const shape = param('shape', 'round', { choices: ['round', 'square'], label: 'Shape' });
const size = param('size', '30', { choices: ['5', '30', '50'], label: 'Capacity (L)' });
const lid = param('lid', 'closed', { choices: ['closed', 'open'], label: 'Lid' });
const body = param('body', '#c9ccd0', { label: 'Body' });
const top = param('top', '#b9bcbf', { label: 'Lid' });
const pedal = param('pedal', '#2b2d30', { label: 'Pedal and trim' });

presets({
  white: { body: '#f2f1ec', top: '#f2f1ec', pedal: '#9aa0a6' },
  black: { body: '#2b2d30', top: '#2b2d30', pedal: '#9aa0a6' },
  red: { body: '#b8342c', top: '#c9ccd0' },
});

const cap = Number(size.value);
const k = cap === 5 ? 0.55 : cap === 50 ? 1.2 : 1;
const R = 150 * k;
const H = 640 * k;
const n = shape.value === 'round' ? 10 : 4;
const ngon = (r: number, s: number) => {
  const rot = s === 4 ? Math.PI / 4 : 0;
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let i = 1; i < s; i++) {
    const a = rot + (2 * Math.PI * i) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const rr = n === 4 ? R * 1.25 : R; // square bins measure corner to corner
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const b = assembly('pedal-bin');
b.part('base-trim', ngon(rr * 0.95, n).extrude(30).color(pedal));
b.part('body', ngon(rr * 0.92, n).loft(ngon(rr, n), { spacing: H - 60, ruled: true }).translate(0, 0, 29).color(body));
const lidShape = ngon(rr * 1.02, n).loft(ngon(rr * 0.9, n), { spacing: 35, ruled: true });
const ry = n === 4 ? R * 0.9 : R; // hinge line at the back
b.part('hinge', blk(-40 * k, ry - 15, H - 40, 40 * k, ry + 25, H - 5).color(pedal));
if (lid.value === 'open') {
  b.part('lid', lidShape.translate(0, -ry, 0).rotateX(-75).translate(0, ry, H - 32).color(top));
} else {
  b.part('lid', lidShape.translate(0, 0, H - 32).color(top));
}
const py = n === 4 ? -R * 0.9 : -R;
b.part('pedal', blk(-55 * k, py - 70 * k, 15, 55 * k, py + 10, 40).color(pedal));

return b.model();
