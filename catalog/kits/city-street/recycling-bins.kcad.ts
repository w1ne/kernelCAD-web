// Original kernelCAD low-poly recycling bins: a row of wheelie bins, each a
// tapered body with an overhanging lid, a rear handle bar and two wheels.
// Millimetres, Z up, lids hinge at the back (+Y), fronts face -Y.

meta({
  name: 'recycling-bins',
  license: 'CC0-1.0',
  title: 'Recycling bins',
  description: 'Row of two to four colour-coded wheelie bins with lids, handles and wheels. Knobs: bin count, three bin colours, lid and wheel colours.',
  tags: ['bin', 'wheelie bin', 'recycling', 'trash', 'garbage', 'waste', 'container', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'backyard'],
  triangleBudget: 520,
});

const count = param('count', '3', { choices: ['2', '3', '4'], label: 'Bins' });
const bin1 = param('bin1', '#2f7d4a', { label: 'Bin 1' });
const bin2 = param('bin2', '#2a5ea8', { label: 'Bin 2' });
const bin3 = param('bin3', '#e0b225', { label: 'Bin 3' });
const lid = param('lid', '#2c2e30', { label: 'Lids and handles' });
const wheel = param('wheel', '#1b1c1d', { label: 'Wheels' });

presets({
  grey: { bin1: '#5d6166', bin2: '#5d6166', bin3: '#5d6166' },
  council: { bin1: '#3d3f42', bin2: '#7a4a2a', bin3: '#2a5ea8', lid: '#3d3f42' },
});

const n = Number(count.value);
const colours = [bin1, bin2, bin3];
const rect = (w: number, d: number) => path().moveTo(w / 2, d / 2).lineTo(-w / 2, d / 2).lineTo(-w / 2, -d / 2).lineTo(w / 2, -d / 2).close();
const oct = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < 8; k++) p = p.lineTo(r * Math.cos((Math.PI * k) / 4), r * Math.sin((Math.PI * k) / 4));
  return p.close();
};
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const rb = assembly('recycling-bins');
const pitch = 660;
for (let i = 0; i < n; i++) {
  const x = (i - (n - 1) / 2) * pitch;
  const c = colours[i % 3]!;
  rb.part(`body-${i + 1}`, rect(470, 560).loft(rect(570, 700), { spacing: 960, ruled: true }).translate(x, 0, 40).color(c));
  rb.part(`foot-${i + 1}`, blk(x - 200, -270, 0, x + 200, -170, 60).color(c));
  rb.part(`lid-${i + 1}`, blk(x - 300, -370, 995, x + 300, 380, 1050).color(lid));
  rb.part(`handle-${i + 1}`, blk(x - 260, 345, 900, x + 260, 400, 960).color(lid));
  rb.part(`axle-${i + 1}`, blk(x - 230, 250, 70, x + 230, 300, 130).color(lid));
  for (const side of [-1, 1]) {
    rb.part(`wheel-${i + 1}-${side < 0 ? 'l' : 'r'}`, oct(100).extrude(50).rotateY(90).translate(x + side * 230 - 25, 270, 100).color(wheel));
  }
}

return rb.model();
