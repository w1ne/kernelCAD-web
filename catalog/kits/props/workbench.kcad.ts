// Original kernelCAD low-poly workbench: a thick plank top on four legs with
// stretchers and a lower shelf, a front vice and a few tools on top.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, front towards -Y.

meta({
  name: 'workbench',
  license: 'CC0-1.0',
  title: 'Workbench',
  description: 'Wooden carpenter workbench with a thick top, lower shelf, front vice and tools laid on top. Knobs: length, tools, top, frame and metal colours.',
  tags: ['workbench', 'bench', 'workshop', 'carpentry', 'garage', 'table', 'tools', 'crafting'],
  kit: 'props',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'workshop', 'garage', 'medieval', 'farm'],
  triangleBudget: 360,
});

const lengthMm = param('lengthMm', '1800', { choices: ['1200', '1800', '2400'], label: 'Length (mm)' });
const tools = param('tools', 'yes', { choices: ['yes', 'no'], label: 'Tools on top' });
const top = param('top', '#c49a5c', { label: 'Top' });
const frame = param('frame', '#8a6236', { label: 'Frame' });
const metal = param('metal', '#5a5e63', { label: 'Vice and tools' });

presets({
  dark: { top: '#7a5434', frame: '#4a3220' },
  painted: { frame: '#3f5f7a' },
});

const L = Number(lengthMm.value);
const D = 700;
const H = 900;
const tt = 70;
const lw = 80;

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const wb = assembly('workbench');
wb.part('top', blk(-L / 2, -D / 2, H - tt, L / 2, D / 2, H).color(top));
const lx = L / 2 - 120;
const ly = D / 2 - 60;
let k = 0;
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    k++;
    wb.part(`leg-${k}`, blk(sx * lx - lw / 2, sy * ly - lw / 2, 0, sx * lx + lw / 2, sy * ly + lw / 2, H - tt + 1).color(frame));
  }
  // Side stretchers between front and back legs.
  wb.part(`stretcher-${sx < 0 ? 'left' : 'right'}`, blk(sx * lx - lw / 2 + 10, -ly, 150, sx * lx + lw / 2 - 10, ly, 230).color(frame));
}
wb.part('apron', blk(-lx, -ly - lw / 2, H - tt - 120, lx, -ly + lw / 2 - 20, H - tt + 1).color(frame));
wb.part('shelf', blk(-lx - lw / 2 + 1, -ly, 229, lx + lw / 2 - 1, ly, 255).color(top));
// Front vice at the left end: jaw, screw and handle bar.
const vx = -L / 2 + 260;
wb.part('vice', blk(vx - 140, -D / 2 - 70, H - 200, vx + 140, -D / 2 + 1, H)
  .union(blk(vx - 20, -D / 2 - 160, H - 120, vx + 20, -D / 2 - 69, H - 80))
  .union(blk(vx - 130, -D / 2 - 170, H - 115, vx + 130, -D / 2 - 150, H - 85))
  .color(metal));
if (tools.value === 'yes') {
  // Hammer, saw and a wood offcut laid on the top.
  wb.part('hammer', blk(L * 0.05, -150, H - 1, L * 0.05 + 300, -120, H + 30)
    .union(blk(L * 0.05 + 300, -200, H - 1, L * 0.05 + 330, -70, H + 35)).color(metal));
  wb.part('saw', extrudePolygon([[0, 0], [520, 0], [520, 30], [0, 120]], 6).translate(L * 0.05 - 100, 30, H - 1).color(metal));
  wb.part('offcut', blk(-L * 0.25, -60, H - 1, -L * 0.25 + 400, 100, H + 40).color(top));
}

return wb.model();
