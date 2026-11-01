// Original kernelCAD low-poly dinner plate: a faceted plate with a sunken well
//, empty or served with a meal (seared steak with
// broccoli and carrots, or a mound of pasta with sauce and meatballs).
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'dinner-plate',
  license: 'CC0-1.0',
  title: 'Dinner plate',
  description: 'Faceted dinner plate, empty or served with steak and vegetables or a mound of pasta with tomato sauce and meatballs, for dining tables, restaurants and food pickups. Knobs: meal, plate, meat, sear, greens, side, pasta and sauce colours.',
  tags: ['plate', 'dinner', 'meal', 'steak', 'pasta', 'food', 'dish', 'restaurant', 'tableware'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'food', 'dining', 'restaurant', 'tavern', 'indoor'],
  triangleBudget: 440,
});

const meal = param('meal', 'steak', { choices: ['empty', 'steak', 'pasta'], label: 'Meal' });
const plate = param('plate', '#f4f2ec', { label: 'Plate' });
const meat = param('meat', '#8a4a2c', { label: 'Meat' });
const sear = param('sear', '#3a2216', { label: 'Grill marks' });
const greens = param('greens', '#3f8f34', { label: 'Greens' });
const side = param('side', '#ee8a2a', { label: 'Carrots' });
const pasta = param('pasta', '#f0d27a', { label: 'Pasta' });
const sauce = param('sauce', '#c8321e', { label: 'Sauce' });

presets({
  rustic: { plate: '#d8b48a' },
  'blue china': { plate: '#cfe0f0' },
});

const N = 12;
const ngon = (r: number, k0 = N, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
  return p.close();
};
const stack = (rings: [number, number][], k0: number, x = 0, y = 0, rot = 0) =>
  ngon(rings[0][0], k0, rot).loft(rings.slice(1).map(([r]) => ngon(r, k0, rot)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [x, y, z] as [number, number, number] })),
    ruled: true,
  });

const d = assembly('dinner-plate');
// Plate: foot ring up to a flared rim, with the well hollowed out.
const floor = 7;
d.part('plate', stack([[92, 0], [100, 4], [136, 20]], N)
  .subtract(stack([[100, floor], [134, 25]], N))
  .color(plate));

const z0 = floor - 1;
if (meal.value === 'steak') {
  // Steak: an irregular slab with a slightly smaller top, seared stripes on it.
  const outline: [number, number][] = [[-55, -20], [-35, -42], [10, -45], [45, -30], [55, 0], [40, 32], [0, 40], [-40, 30], [-58, 5]];
  const slab = (sc: number) => {
    let p = path().moveTo(outline[0][0] * sc, outline[0][1] * sc);
    for (const [x, y] of outline.slice(1)) p = p.lineTo(x * sc, y * sc);
    return p.close();
  };
  const sx = -22;
  const sy = 18;
  d.part('steak', slab(1).loft(slab(0.9), { spacing: 18, ruled: true }).translate(sx, sy, z0).color(meat));
  for (let i = 0; i < 3; i++) {
    d.part(`grill-${i + 1}`, box(70, 6, 3, true).rotateZ(-35).translate(sx - 18 + i * 20, sy - 4 + i * 6, z0 + 18).color(sear));
  }
  // Broccoli florets: a short stalk under a lumpy dome.
  const florets: [number, number][] = [[52, 28], [70, 0], [40, 2]];
  florets.forEach(([x, y], i) => {
    d.part(`broccoli-${i + 1}`, stack([[6, 0], [5, 14]], 4, x, y).translate(0, 0, z0)
      .union(stack([[11, 10], [19, 19], [8, 31]], 6, x, y).translate(0, 0, z0))
      .color(greens));
  });
  // Carrot coins in a little heap toward the front.
  const coins: [number, number, number][] = [[14, -58, 0], [38, -50, 0], [26, -44, 8]];
  coins.forEach(([x, y, z], i) => {
    d.part(`carrot-${i + 1}`, ngon(12, 6).extrude(7).rotateX(i === 2 ? 18 : 0).translate(x, y, z0 + z).color(side));
  });
} else if (meal.value === 'pasta') {
  // Pasta mound, a sauce cap, meatballs and a basil leaf.
  d.part('pasta', stack([[82, 0], [72, 14], [48, 30], [16, 40]], 11).translate(0, 0, z0).color(pasta));
  d.part('sauce', stack([[44, 0], [30, 10], [8, 15]], 9).translate(-6, 4, z0 + 28).color(sauce));
  const balls: [number, number][] = [[30, -30], [-34, -22], [8, 40]];
  balls.forEach(([x, y], i) => {
    d.part(`meatball-${i + 1}`, stack([[9, 0], [17, 9], [17, 19], [9, 27]], 7, x, y).translate(0, 0, z0 + 18).color(meat));
  });
  d.part('basil', extrudePolygon([[0, 0], [12, -9], [30, 0], [12, 9]], 2).rotateY(-12).translate(-14, 4, z0 + 43).color(greens));
}

return d.model();
