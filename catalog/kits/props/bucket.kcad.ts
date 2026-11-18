// Original kernelCAD low-poly bucket: a tapered faceted pail hollowed by a
// smaller loft, with a rolled rim, a wire bail handle and optional water.
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'bucket',
  license: 'CC0-1.0',
  title: 'Bucket',
  description: 'Tapered pail with rolled rim and bail handle, in metal or wood style, empty or filled with water. Knobs: style, fill, body, rim and contents colours.',
  tags: ['bucket', 'pail', 'water', 'well', 'farm', 'cleaning', 'container'],
  kit: 'props',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'outdoor', 'farm', 'medieval', 'garden', 'workshop'],
  triangleBudget: 400,
});

const style = param('style', 'metal', { choices: ['metal', 'wood'], label: 'Style' });
const fill = param('fill', 'water', { choices: ['empty', 'water'], label: 'Fill' });
const body = param('body', '#9aa2a8', { label: 'Body' });
const rim = param('rim', '#6e767c', { label: 'Rim and handle' });
const contents = param('contents', '#4f8fc8', { label: 'Contents' });

presets({
  wooden: { style: 'wood', body: '#a8743f', rim: '#3d3b39' },
  red: { body: '#c8302a', rim: '#2a2a2c' },
  milk: { contents: '#f4f2ea' },
});

const n = 10;
const H = 300;
const r0 = style.value === 'wood' ? 130 : 115;
const r1 = 155;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const b = assembly('bucket');
b.part('body', ngon(r0).loft(ngon(r1), { spacing: H, ruled: true })
  .subtract(ngon(r0 - 12).loft(ngon(r1 - 12), { spacing: H, ruled: true }).translate(0, 0, 15)).color(body));
// Metal: rolled rim; wood: two iron hoops.
if (style.value === 'wood') {
  b.part('hoop-1', ngon(r0 + 12 + (r1 - r0) * 0.15).extrude(28).translate(0, 0, H * 0.12).color(rim));
  b.part('hoop-2', ngon(r0 + 10 + (r1 - r0) * 0.8).loft(ngon(r0 + 10 + (r1 - r0) * 0.9), { spacing: 28, ruled: true }).translate(0, 0, H * 0.8).color(rim));
} else {
  b.part('rim', ngon(r1 + 8).extrude(18).subtract(ngon(r1 - 10).extrude(40).translate(0, 0, -10)).translate(0, 0, H - 18).color(rim));
}
// Bail handle: two lugs and a raised three-segment wire arch.
const hz = H - 40;
const lug = (sx: number) => box(16, 40, 50, true).translate(sx * (r1 - 2), 0, hz);
const seg = (x0: number, z0: number, x1: number, z1: number) => {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = (Math.atan2(z1 - z0, x1 - x0) * 180) / Math.PI;
  return box(len + 12, 12, 12, true).rotateY(-a).translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
};
b.part('handle', lug(-1).union(lug(1))
  .union(seg(-(r1 + 4), hz, -r1 * 0.55, H + 130))
  .union(seg(-r1 * 0.55, H + 130, r1 * 0.55, H + 130))
  .union(seg(r1 * 0.55, H + 130, r1 + 4, hz))
  .color(rim));
if (fill.value === 'water') {
  const zr = H * 0.8;
  b.part('contents', ngon(r0 - 12 + ((r1 - r0) * zr) / H + 1).extrude(10).translate(0, 0, zr).color(contents));
}

return b.model();
