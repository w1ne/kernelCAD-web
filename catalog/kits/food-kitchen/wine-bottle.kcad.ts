// Original kernelCAD low-poly wine bottle: a faceted 750 ml bottle with a
// paper label band and a foil capsule or a proud cork, optionally with a
// stemmed wine glass poured beside it.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, glass in front (-Y).

meta({
  name: 'wine-bottle',
  license: 'CC0-1.0',
  title: 'Wine bottle',
  description: 'Faceted 750 ml wine bottle in Bordeaux or Burgundy shape with a label band and a foil capsule or cork, optionally with a filled wine glass beside it, for taverns, dinners and kitchens. Knobs: shape, closure, glass, bottle, label, capsule, cork, wine and glassware colours.',
  tags: ['wine', 'bottle', 'drink', 'alcohol', 'glass', 'cork', 'tavern', 'dinner', 'pickup'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'food', 'tavern', 'restaurant', 'indoor', 'medieval', 'market'],
  triangleBudget: 520,
});

const shape = param('shape', 'bordeaux', { choices: ['bordeaux', 'burgundy'], label: 'Bottle shape' });
const closure = param('closure', 'capsule', { choices: ['capsule', 'cork'], label: 'Closure' });
const glassOpt = param('glass', 'yes', { choices: ['no', 'yes'], label: 'Glass beside' });
const bottle = param('bottle', '#2c5a2e', { label: 'Bottle' });
const label = param('label', '#f1e6c8', { label: 'Label' });
const cap = param('capsule', '#8a1e2a', { label: 'Foil capsule' });
const cork = param('cork', '#b8864e', { label: 'Cork' });
const wine = param('wine', '#7a1426', { label: 'Wine' });
const glassC = param('glassware', '#d6e6ea', { label: 'Wine glass' });

presets({
  'white wine': { bottle: '#b9c98a', wine: '#e8d46a', capsule: '#d8c070' },
  rose: { bottle: '#e8b0a8', wine: '#e87a86', capsule: '#c9c9c9' },
});

const withGlass = glassOpt.value === 'yes';
const ngon = (r: number, k0: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / k0), r * Math.sin((2 * Math.PI * k) / k0));
  return p.close();
};
const stack = (rings: [number, number][], k0: number, x: number, y: number) =>
  ngon(rings[0][0], k0).loft(rings.slice(1).map(([r]) => ngon(r, k0)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });

const w = assembly('wine-bottle');
const bx = withGlass ? -40 : 0;
const by = withGlass ? 25 : 0;
const R = 38;
const rings: [number, number][] = shape.value === 'bordeaux'
  ? [[R - 2, 0], [R, 5], [R, 190], [R - 5, 205], [17, 228], [14, 245], [14, 284], [16, 286], [16, 296]]
  : [[R - 2, 0], [R, 5], [R, 140], [R - 6, 185], [17, 225], [14, 245], [14, 284], [16, 286], [16, 296]];
const N = 10;
w.part('bottle', stack(rings, N, bx, by).color(bottle));
const labelTop = shape.value === 'bordeaux' ? 150 : 125;
w.part('label', ngon(R + 1.2, N).extrude(labelTop - 65).translate(bx, by, 65).color(label));
if (closure.value === 'capsule') {
  w.part('capsule', ngon(15.5, N).extrude(50).translate(bx, by, 248).color(cap));
} else {
  w.part('cork', ngon(11.5, 8).extrude(22).translate(bx, by, 285).color(cork));
}

if (withGlass) {
  // Wine glass: foot, stem and a hollow bowl with wine poured in.
  const gx = 55;
  const gy = -35;
  w.part('glass', stack([[34, 0], [30, 3], [4, 6], [4, 78], [10, 84]], 8, gx, gy)
    .union(stack([[10, 82], [32, 98], [40, 125], [36, 165]], 8, gx, gy)
      .subtract(stack([[24, 100], [36, 125], [32, 170]], 8, gx, gy)))
    .color(glassC));
  w.part('wine', stack([[23, 99.5], [35, 124], [33, 155]], 8, gx, gy).color(wine));
}

return w.model();
