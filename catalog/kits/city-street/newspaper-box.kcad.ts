// Original kernelCAD low-poly newspaper vending box: a cabinet with a sloped
// top, a front window door and a coin unit, on a pedestal or four legs.
// Millimetres, Z up, base on z = 0. The front faces -Y.

meta({
  name: 'newspaper-box',
  license: 'CC0-1.0',
  title: 'Newspaper box',
  description: 'Street newspaper vending box with a window door and coin unit, on a pedestal or legs. Knobs: stand, body, window and stand colours.',
  tags: ['newspaper', 'news', 'vending', 'box', 'kiosk', 'sidewalk', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 200,
});

const stand = param('stand', 'pedestal', { choices: ['pedestal', 'legs'], label: 'Stand' });
const body = param('body', '#d23a2c', { label: 'Body' });
const glass = param('glass', '#a9c8d8', { label: 'Window' });
const base = param('base', '#2a2c2e', { label: 'Stand and coin unit' });

presets({
  blue: { body: '#2a5ea8' },
  yellow: { body: '#efc12a' },
  green: { body: '#2f7d4a' },
});

const W = 500; // x
const D = 430; // y
const z0 = 330; // cabinet bottom
const H = 620; // cabinet front height

const nb = assembly('newspaper-box');
if (stand.value === 'pedestal') {
  nb.part('foot', box(420, 380, 30, true).translate(0, 0, 15).color(base));
  nb.part('column', box(140, 140, z0 - 30, true).translate(0, 0, 30 + (z0 - 30) / 2).color(base));
} else {
  for (const [i, x, y] of [[1, -1, -1], [2, 1, -1], [3, -1, 1], [4, 1, 1]] as [number, number, number][]) {
    nb.part(`leg-${i}`, box(40, 40, z0, true).translate(x * (W / 2 - 40), y * (D / 2 - 40), z0 / 2).color(base));
  }
}
// Cabinet built from stacked pieces so the window is a flush pane, not a
// decal: lower body, window row (pane between two side stiles), sloped top.
const zw0 = z0 + H * 0.33;
const zw1 = z0 + H * 0.83;
const stile = 55;
nb.part('cabinet', box(W, D, zw0 - z0, true).translate(0, 0, (z0 + zw0) / 2).color(body));
nb.part('stile-left', box(stile, D, zw1 - zw0, true).translate(-W / 2 + stile / 2, 0, (zw0 + zw1) / 2).color(body));
nb.part('stile-right', box(stile, D, zw1 - zw0, true).translate(W / 2 - stile / 2, 0, (zw0 + zw1) / 2).color(body));
nb.part('window', box(W - 2 * stile, 30, zw1 - zw0, true).translate(0, -D / 2 + 30, (zw0 + zw1) / 2).color(glass));
nb.part('core', box(W - 2 * stile, D - 45, zw1 - zw0, true).translate(0, 22.5, (zw0 + zw1) / 2).color(body));
// Top piece side profile (y, z) sloping up toward the back.
const topH = z0 + H - zw1;
const side: [number, number][] = [[-D / 2, 0], [D / 2, 0], [D / 2, topH + 90], [-D / 2, topH]];
nb.part('top', extrudePolygon(side, W).rotateX(90).rotateZ(90).translate(-W / 2, 0, zw1).color(body));
nb.part('handle', box(180, 30, 30, true).translate(0, -D / 2 - 15, z0 + H * 0.25).color(base));
nb.part('coin-unit', box(150, 160, 120, true).translate(W / 2 - 110, -D / 2 + 40, z0 + H + 60).color(base));

return nb.model();
