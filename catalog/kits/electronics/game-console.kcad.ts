// Original kernelCAD low-poly home video game console: a modern slab with a
// disc slot and light bar, or a retro wedge with a cartridge slot, with one
// or two twin-stick gamepads lying beside it.
// Millimetres, Z up, base on z = 0 centred on x = y = 0. Console front faces -Y.

meta({
  name: 'game-console',
  license: 'CC0-1.0',
  title: 'Game console',
  description: 'Home video game console box, a modern slab with a disc slot and light bar or a retro cartridge wedge, with one or two gamepad controllers beside it. Knobs: style, controllers, console, accent, controller and button colours.',
  tags: ['game console', 'video game', 'console', 'gamepad', 'controller', 'gaming', 'retro', 'tv'],
  kit: 'electronics',
  category: 'prop',
  origin: 'base',
  compat: ['indoor', 'living-room', 'bedroom', 'retro'],
  triangleBudget: 520,
});

const style = param('style', 'modern', { choices: ['modern', 'retro'], label: 'Style' });
const pads = param('controllers', '1', { choices: ['1', '2'], label: 'Controllers' });
const consoleC = param('console', '#1e1f23', { label: 'Console' });
const accent = param('accent', '#2f8cff', { label: 'Accent light' });
const pad = param('pad', '#2b2d32', { label: 'Controller' });
const buttons = param('buttons', '#cfd2d8', { label: 'Buttons and sticks' });

presets({
  white: { console: '#ecebe8', pad: '#f2f1ee', buttons: '#2a2b2f', accent: '#4a9cff' },
  retro: { console: '#bdb8ae', accent: '#c4342c', pad: '#8a857c', buttons: '#3a3a3e' },
});

const blk = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) =>
  box(x1 - x0, y1 - y0, z1 - z0).translate(x0, y0, z0);
const ngon = (r: number, n: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};

const g = assembly('game-console');
const modern = style.value === 'modern';
const W = modern ? 300 : 260;
const D = modern ? 250 : 210;
const cx = -95; // console centre, leaving room for the controller on +X
const fy = -D / 2;
if (modern) {
  const H = 72;
  g.part('console', extrudePolygon([[-D / 2 + 10, 0], [D / 2, 0], [D / 2, H], [-D / 2, H], [-D / 2, 14]], W)
    .rotateX(90).rotateZ(90).translate(cx - W / 2, 0, 0).color(consoleC));
  g.part('band', blk(cx - W / 2 - 1, fy - 1, H * 0.45, cx + W / 2 + 1, D / 2 + 1, H * 0.55).color(buttons));
  g.part('slot', blk(cx - W * 0.3, fy - 2, H - 22, cx + W * 0.2, fy + 1, H - 16).color(pad));
  g.part('light', blk(cx - W / 2 + 6, fy - 2, H - 4, cx + W / 2 - 6, fy + 20, H + 2).color(accent));
} else {
  const H = 80;
  g.part('console', extrudePolygon([[-D / 2, 0], [D / 2, 0], [D / 2, H], [-D / 2 + 70, H], [-D / 2, H - 35]], W)
    .rotateX(90).rotateZ(90).translate(cx - W / 2, 0, 0).color(consoleC));
  g.part('cartridge-slot', blk(cx - 70, 0, H - 2, cx + 70, 60, H + 3).color(pad));
  g.part('cartridge', blk(cx - 60, 12, H + 2, cx + 60, 34, H + 70).color(accent));
  for (const [i, x] of [-60, 60].entries()) g.part(`button-${i}`, blk(cx + x - 22, fy + 22, H - 22, cx + x + 22, fy + 46, H - 4).color(buttons));
  for (const [i, x] of [-50, 50].entries()) g.part(`port-${i}`, blk(cx + x - 20, fy - 2, 14, cx + x + 20, fy + 1, 32).color(pad));
}

// Gamepad lying flat: an outline with two grips toward -Y, sticks, d-pad and face buttons.
const half: [number, number][] = [[0, 38], [52, 38], [70, 30], [80, 8], [82, -30], [70, -56], [52, -60], [40, -46], [32, -20], [0, -18]];
const outline: [number, number][] = [...half, ...half.slice(1, -1).reverse().map(([x, y]): [number, number] => [-x, y])];
const controller = (px: number, py: number, yaw: number, id: number) => {
  const at = (s: ReturnType<typeof box>) => s.rotateZ(yaw).translate(px, py, 0);
  g.part(`pad-${id}`, at(extrudePolygon(outline, 26)).color(pad));
  for (const [k, sx] of [-1, 1].entries()) g.part(`stick-${id}-${k}`, at(ngon(10, 6).extrude(10).translate(sx * 24, -8, 25)).color(buttons));
  g.part(`dpad-${id}`, at(blk(-60, 6, 25, -40, 12, 30).union(blk(-53, -1, 25, -47, 19, 30))).color(buttons));
  for (const [k, [bx, by]] of [[50, 18], [50, 0], [41, 9], [59, 9]].entries()) g.part(`btn-${id}-${k}`, at(blk(bx - 3.5, by - 3.5, 25, bx + 3.5, by + 3.5, 31)).color(accent));
};
controller(cx + W / 2 + 95, fy + 20, 20, 0);
if (pads.value === '2') controller(cx + 40, fy - 95, -8, 1);

return g.model();
