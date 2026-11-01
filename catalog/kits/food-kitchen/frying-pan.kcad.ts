// Original kernelCAD low-poly frying pan: a faceted shallow pan with flared
// walls and a long raised handle, empty or with a fried egg or egg and bacon.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, handle toward +X.

meta({
  name: 'frying-pan',
  license: 'CC0-1.0',
  title: 'Frying pan',
  description: 'Skillet frying pan with flared walls and a long handle, empty or cooking a fried egg or egg and bacon breakfast. Knobs: size, contents, pan, handle, egg white, yolk and bacon colours.',
  tags: ['frying pan', 'skillet', 'pan', 'fried egg', 'breakfast', 'bacon', 'cookware', 'kitchen'],
  kit: 'food-kitchen',
  category: 'prop',
  origin: 'base',
  compat: ['kitchen', 'indoor', 'food', 'restaurant', 'camp', 'diner'],
  triangleBudget: 320,
});

const size = param('size', '26', { choices: ['20', '26', '32'], label: 'Diameter (cm)' });
const food = param('contents', 'egg', { choices: ['empty', 'egg', 'egg-and-bacon'], label: 'Contents' });
const pan = param('pan', '#2e3033', { label: 'Pan' });
const grip = param('grip', '#1a1a1c', { label: 'Handle' });
const white = param('white', '#f4f1e8', { label: 'Egg white' });
const yolk = param('yolk', '#f2b51c', { label: 'Yolk' });
const bacon = param('bacon', '#b5483a', { label: 'Bacon' });

presets({
  'cast-iron': { pan: '#3a3634', grip: '#3a3634' },
  copper: { pan: '#b8693a', grip: '#8a8f94' },
  wooden: { grip: '#8a5a33' },
});

const s = Number(size.value) / 26;
const R = 130 * s;
const H = 42 * s;
const n = 12;
const ngon = (r: number, k = n) => {
  let p = path().moveTo(r, 0);
  for (let i = 1; i < k; i++) p = p.lineTo(r * Math.cos((2 * Math.PI * i) / k), r * Math.sin((2 * Math.PI * i) / k));
  return p.close();
};
const lathe = (rings: [number, number][], k = n) =>
  ngon(rings[0][0], k).loft(rings.slice(1).map(([r]) => ngon(r, k)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

const f = assembly('frying-pan');
// Flared pan, hollowed from above leaving a 5 mm floor and wall.
const floor = 5 * s;
f.part('pan', lathe([[R * 0.78, 0], [R * 0.8, floor], [R, H]])
  .subtract(lathe([[R * 0.78 - 5 * s, floor], [R - 5 * s, H + 1]])).color(pan));
// Long handle rising gently from the rim, profile in (x, z), 22 mm thick.
const hp: [number, number][] = [
  [R - 14 * s, H - 22 * s], [R + 60 * s, H - 8 * s], [R + 200 * s, H + 14 * s],
  [R + 212 * s, H + 24 * s], [R + 204 * s, H + 34 * s], [R + 60 * s, H + 8 * s], [R - 14 * s, H - 4 * s],
];
f.part('handle', extrudePolygon(hp, 24 * s).rotateX(90).translate(0, 12 * s, 0).color(grip));

if (food.value !== 'empty') {
  // Fried egg: an irregular white puddle with a domed yolk.
  const blob: [number, number][] = [[0, -55], [42, -40], [60, 0], [44, 38], [8, 58], [-38, 46], [-60, 6], [-44, -36]];
  const ex = food.value === 'egg' ? 0 : -30 * s;
  f.part('egg-white', extrudePolygon(blob.map(([x, y]) => [x * s + ex, y * s] as [number, number]), 5 * s)
    .translate(0, 0, floor).color(white));
  f.part('yolk', lathe([[20 * s, floor + 4 * s], [19 * s, floor + 12 * s], [11 * s, floor + 18 * s], [3 * s, floor + 20 * s]], 8)
    .translate(ex + 4 * s, -2 * s, 0).color(yolk));
  if (food.value === 'egg-and-bacon') {
    // Two rashers beside the egg, each a slightly bent pair of strips.
    for (const y of [-28, 18]) {
      f.part(`bacon-${y < 0 ? 1 : 2}`, box(130 * s, 24 * s, 5 * s, true).rotateZ(78)
        .union(box(70 * s, 24 * s, 5 * s, true).rotateZ(60).translate(-6 * s, 40 * s, 3 * s))
        .translate(52 * s + y * 0.9 * s, y * 0.2 * s - 10 * s, floor + 2.5 * s).color(bacon));
    }
  }
}

return f.model();
