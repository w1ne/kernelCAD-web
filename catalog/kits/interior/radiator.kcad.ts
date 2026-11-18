// Original kernelCAD low-poly radiator: a row of upright column sections on
// short feet, joined by top and bottom headers, with a thermostatic valve and
// lockshield at the ends. Millimetres, Z up, standing on z = 0 centred on
// x = y = 0. Front faces -Y; the back stands close to a wall at +Y.

meta({
  name: 'radiator',
  license: 'CC0-1.0',
  title: 'Radiator',
  description: 'Column radiator of upright sections on feet, with headers, a thermostatic valve and a lockshield. Knobs: sections, height, body and valve colours.',
  tags: ['radiator', 'heater', 'column radiator', 'heating', 'central heating', 'wall'],
  kit: 'interior',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'bathroom', 'office', 'hallway'],
  triangleBudget: 450,
});

const sections = param('sections', '10', { choices: ['6', '10', '14'], label: 'Sections' });
const height = param('height', '600', { choices: ['450', '600', '750'], label: 'Height (mm)' });
const body = param('body', '#ecebe6', { label: 'Body' });
const valve = param('valve', '#c9ccd0', { label: 'Valves' });

presets({
  anthracite: { body: '#3b3d42' },
  cast: { body: '#6b6d70', valve: '#b8913f' },
  red: { body: '#a8342c' },
});

const n = Number(sections.value);
const H = Number(height.value);
const pitch = 70;
const W = n * pitch;
const footH = 120;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const r = assembly('radiator');
const z0 = footH;
const z1 = footH + H;
r.part('header-top', blk(-W / 2, -35, z1 - 60, W / 2, 35, z1 - 15).color(body));
r.part('header-bottom', blk(-W / 2, -35, z0 + 15, W / 2, 35, z0 + 60).color(body));
for (let i = 0; i < n; i++) {
  const x = -W / 2 + pitch * (i + 0.5);
  // Each section: a slim column whose top is chamfered in one ruled loft.
  const rect = (hw: number, hd: number) => path().moveTo(-hw, -hd).lineTo(hw, -hd).lineTo(hw, hd).lineTo(-hw, hd).close();
  const col = rect(25, 50).loft([rect(25, 50), rect(17, 36)], {
    planes: [
      { plane: 'XY', origin: [x, 0, z0] },
      { plane: 'XY', origin: [x, 0, z1 - 18] },
      { plane: 'XY', origin: [x, 0, z1] },
    ],
    ruled: true,
  });
  r.part(`section-${i + 1}`, col.color(body));
}
for (const sx of [-1, 1]) {
  const x = sx * (W / 2 - pitch);
  r.part(`foot-${sx < 0 ? 'left' : 'right'}`, blk(x - 22, -45, 0, x + 22, 45, z0 + 1).color(body));
}
// Valves: a pipe tail down to the floor and a cap at each end.
r.part('tail-left', blk(-W / 2 - 70, -15, z0 + 25, -W / 2 + 1, 15, z0 + 50).color(valve));
r.part('pipe-left', blk(-W / 2 - 70, -15, 0, -W / 2 - 45, 15, z0 + 26).color(valve));
r.part('valve-head', blk(-W / 2 - 80, -25, z0 + 49, -W / 2 - 35, 25, z0 + 140).color(valve));
r.part('tail-right', blk(W / 2 - 1, -15, z0 + 25, W / 2 + 70, 15, z0 + 50).color(valve));
r.part('pipe-right', blk(W / 2 + 45, -15, 0, W / 2 + 70, 15, z0 + 26).color(valve));
r.part('lockshield', blk(W / 2 + 35, -20, z0 + 49, W / 2 + 80, 20, z0 + 80).color(valve));

return r.model();
