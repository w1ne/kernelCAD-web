// Original kernelCAD low-poly cutting board: a chamfered wooden board or a
// paddle board with a hanging hole, optionally with a chef's knife and a
// scatter of chopped carrot coins.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, long side along X.

meta({
  name: 'cutting-board',
  license: 'CC0-1.0',
  title: 'Cutting board',
  description: "Wooden chopping board, chamfered rectangle or paddle with a hanging hole, bare or with a chef's knife and chopped vegetables. Knobs: shape, extras, wood, blade, knife handle and vegetable colours.",
  tags: ['cutting board', 'chopping board', 'board', 'knife', 'chef knife', 'chopped vegetables', 'kitchen', 'cooking'],
  kit: 'food-kitchen',
  category: 'prop',
  origin: 'base',
  compat: ['kitchen', 'indoor', 'food', 'restaurant', 'tavern'],
  triangleBudget: 320,
});

const shape = param('shape', 'rectangle', { choices: ['rectangle', 'paddle'], label: 'Shape' });
const extras = param('extras', 'knife-and-veg', { choices: ['none', 'knife', 'knife-and-veg'], label: 'On the board' });
const wood = param('wood', '#c69c6d', { label: 'Wood' });
const blade = param('blade', '#c8ced2', { label: 'Blade' });
const handle = param('knifeHandle', '#2a2a2c', { label: 'Knife handle' });
const veg = param('veg', '#e07a22', { label: 'Vegetables' });

presets({
  walnut: { wood: '#6b4428' },
  bamboo: { wood: '#d8b878' },
  cucumber: { veg: '#7aa84a' },
});

const L = 380;
const W = 250;
const T = 22;
const rect = (l: number, w: number) => path().moveTo(-l / 2, -w / 2).lineTo(l / 2, -w / 2).lineTo(l / 2, w / 2).lineTo(-l / 2, w / 2).close();

const b = assembly('cutting-board');
if (shape.value === 'rectangle') {
  // Slab with a chamfered top edge.
  b.part('board', rect(L, W).extrude(T - 5).union(rect(L, W).loft(rect(L - 10, W - 10), { spacing: 5, ruled: true }).translate(0, 0, T - 5)).color(wood));
} else {
  // Paddle: clipped-corner board with a handle tab and a hanging hole on +X.
  const c = 40;
  const pts: [number, number][] = [
    [-L / 2 + c, -W / 2], [L / 2 - c, -W / 2], [L / 2, -W / 2 + c], [L / 2, -45], [L / 2 + 110, -35],
    [L / 2 + 125, -18], [L / 2 + 125, 18], [L / 2 + 110, 35], [L / 2, 45], [L / 2, W / 2 - c],
    [L / 2 - c, W / 2], [-L / 2 + c, W / 2], [-L / 2, W / 2 - c], [-L / 2, -W / 2 + c],
  ];
  let hole = path().moveTo(L / 2 + 85 + 12, 0);
  for (let k = 1; k < 8; k++) hole = hole.lineTo(L / 2 + 85 + 12 * Math.cos((Math.PI * k) / 4), 12 * Math.sin((Math.PI * k) / 4));
  b.part('board', extrudePolygon(pts.map(([x, y]) => [x - 55, y] as [number, number]), T)
    .subtract(hole.close().extrude(T + 2).translate(-55, 0, -1)).color(wood));
}

if (extras.value !== 'none') {
  // Chef's knife lying flat, angled across the board: straight spine, curved edge.
  const bl: [number, number][] = [[0, 0], [130, 0], [175, 9], [205, 30], [0, 30]];
  b.part('blade', extrudePolygon(bl, 3).translate(-40, -15, T).rotateZ(-14).translate(-20, 30, 0).color(blade));
  b.part('knife-handle', box(115, 26, 18).translate(-152, -13, T).rotateZ(-14).translate(-20, 30, 0).color(handle));
  if (extras.value === 'knife-and-veg') {
    // Chopped carrot coins in a loose fan near the front edge.
    const coins: [number, number][] = [[20, -70], [52, -78], [84, -72], [112, -86], [70, -100], [36, -98]];
    for (const [i, [x, y]] of coins.entries()) {
      let p = path().moveTo(15, 0);
      for (let k = 1; k < 7; k++) p = p.lineTo(15 * Math.cos((Math.PI * k) / 3.5), 15 * Math.sin((Math.PI * k) / 3.5));
      b.part(`coin-${i + 1}`, p.close().extrude(7).translate(x, y, T).color(veg));
    }
  }
}

return b.model();
