// Original kernelCAD low-poly dining bench: a long plank seat on two
// trestle legs joined by a stretcher, with an optional cushion pad.
// Long axis along X. Millimetres, Z up, standing on z = 0 centred on
// x = y = 0.

meta({
  name: 'dining-bench',
  license: 'CC0-1.0',
  title: 'Dining bench',
  description: 'Backless farmhouse dining bench with a plank seat on trestle legs and an optional cushion. Knobs: length, leg style, cushion, wood, leg and cushion colours.',
  tags: ['bench', 'dining bench', 'farmhouse bench', 'trestle bench', 'seat', 'kitchen', 'dining room'],
  kit: 'interior',
  category: 'furniture',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'dining-room', 'hallway', 'tavern'],
  triangleBudget: 250,
});

const length = param('length', '1400', { choices: ['1000', '1400', '1800'], label: 'Length (mm)' });
const style = param('style', 'trestle', { choices: ['trestle', 'legs'], label: 'Leg style' });
const cushionK = param('cushion', 'no', { choices: ['yes', 'no'], label: 'Cushion' });
const wood = param('wood', '#a8703f', { label: 'Seat' });
const legs = param('legs', '#6b4a2f', { label: 'Legs' });
const pad = param('pad', '#8a9b6a', { label: 'Cushion' });

presets({
  white: { wood: '#c69c6d', legs: '#efeee9' },
  black: { wood: '#8a5a33', legs: '#2b2927' },
});

const L = Number(length.value);
const D = 360;
const H = 460;
const tt = 45;
const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);

const b = assembly('dining-bench');
// Seat from two planks with a thin gap.
b.part('plank-front', blk(-L / 2, -D / 2, H - tt, L / 2, -4, H).color(wood));
b.part('plank-back', blk(-L / 2, 4, H - tt, L / 2, D / 2, H).color(wood));
b.part('cleat', blk(-L / 2 + 120, -D / 2 + 20, H - tt - 30, L / 2 - 120, D / 2 - 20, H - tt + 1).color(legs));
const lx = L / 2 - 180;
if (style.value === 'trestle') {
  for (const sx of [-1, 1]) {
    const x = sx * lx;
    // Trestle: a splayed A-shaped end in YZ, extruded across X.
    const end = extrudePolygon([[-D / 2 + 10, 0], [-D / 2 + 90, 0], [-20, H - tt - 60], [20, H - tt - 60], [D / 2 - 90, 0], [D / 2 - 10, 0], [40, H - tt - 29], [-40, H - tt - 29]], 50)
      .rotateX(90).rotateZ(90).translate(x - 25, 0, 0);
    b.part(`trestle-${sx < 0 ? 'left' : 'right'}`, end.color(legs));
    b.part(`foot-${sx < 0 ? 'left' : 'right'}`, blk(x - 35, -D / 2 + 5, 0, x + 35, D / 2 - 5, 40).color(legs));
  }
  b.part('stretcher', blk(-lx, -20, 120, lx, 20, 170).color(legs));
} else {
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = sx * lx;
    const y = sy * (D / 2 - 50);
    b.part(`leg-${sx}-${sy}`, blk(x - 22, y - 22, 0, x + 22, y + 22, H - tt + 1).color(legs));
  }
  b.part('stretcher', blk(-lx, -15, 150, lx, 15, 185).color(legs));
}
if (cushionK.value === 'yes') {
  b.part('cushion', blk(-L / 2 + 30, -D / 2 + 20, H - 1, L / 2 - 30, D / 2 - 20, H + 50).color(pad));
}

return b.model();
