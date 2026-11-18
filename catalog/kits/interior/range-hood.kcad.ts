// Original kernelCAD low-poly chimney cooker hood: a tapered canopy with a
// filter underside and a light strip, rising into a rectangular chimney
// duct. Origin 'wall': the back sits on the y = 0 wall plane, the hood
// projects toward -Y, centred on x = 0 with the middle of its height at z = 0.

meta({
  name: 'range-hood',
  license: 'CC0-1.0',
  title: 'Range hood',
  description: 'Wall-mounted chimney cooker hood with a tapered canopy, filters, lights and a duct cover. Knobs: width, chimney height, body, filter and light colours.',
  tags: ['range hood', 'cooker hood', 'extractor', 'hood', 'vent', 'kitchen', 'appliance'],
  kit: 'interior',
  category: 'attachment',
  origin: 'wall',
  compat: ['indoor', 'kitchen'],
  triangleBudget: 200,
});

const width = param('width', '900', { choices: ['600', '900', '1200'], label: 'Width (mm)' });
const chimney = param('chimney', '600', { choices: ['400', '600', '900'], label: 'Chimney height (mm)' });
const body = param('body', '#b9bcbf', { label: 'Body' });
const filter = param('filter', '#5c6066', { label: 'Filters and controls' });
const light = param('light', '#fff2c4', { label: 'Lights' });

presets({
  black: { body: '#2b2d30', filter: '#5c6066' },
  white: { body: '#f2f1ec', filter: '#9aa0a6' },
  copper: { body: '#b8733f', filter: '#3b3d42' },
});

const W = Number(width.value);
const ch = Number(chimney.value);
const D = 500;
const lipH = 60;
const canH = 300;
const H = lipH + canH + ch;
const z0 = -H / 2;
const blk = (x0: number, y0: number, z0b: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0b).translate(x0, y0, z0b);
const rect = (w: number, d: number) => path().moveTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).lineTo(w / 2, d / 2).lineTo(-w / 2, d / 2).close();

const h = assembly('range-hood');
h.part('lip', blk(-W / 2, -D, z0, W / 2, 0, z0 + lipH).color(body));
// Canopy: a ruled loft from the full footprint to the chimney's footprint,
// kept flush with the wall.
const cw = 280;
const cd = 260;
h.part('canopy', rect(W, D).loft(rect(cw, cd), {
  planes: [
    { plane: 'XY', origin: [0, -D / 2, z0 + lipH - 1] },
    { plane: 'XY', origin: [0, -cd / 2, z0 + lipH + canH] },
  ],
  ruled: true,
}).color(body));
h.part('chimney', blk(-cw / 2, -cd, z0 + lipH + canH - 1, cw / 2, 0, z0 + H).color(body));
h.part('filter', blk(-W / 2 + 40, -D + 40, z0 - 4, W / 2 - 40, -60, z0 + 1).color(filter));
for (const sx of [-1, 1]) {
  h.part(`light-${sx < 0 ? 'left' : 'right'}`, blk(sx * W * 0.3 - 40, -D + 15, z0 - 6, sx * W * 0.3 + 40, -D + 35, z0 + 1).color(light));
}
h.part('controls', blk(-90, -D - 4, z0 + 15, 90, -D + 1, z0 + 45).color(filter));

return h.model();
