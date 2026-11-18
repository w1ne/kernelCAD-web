// Original kernelCAD low-poly apple: a faceted ruled-loft fruit with a dimpled
// top, a short woody stem and one leaf, optionally with a bite taken out.
// Millimetres, Z up, base on z = 0 centred on x = y = 0, bite faces -Y.

meta({
  name: 'apple',
  license: 'CC0-1.0',
  title: 'Apple',
  description: 'Faceted apple with a short stem and a leaf, round or tall in shape, whole or with a bite showing the pale flesh, as a food pickup or market produce. Knobs: shape, bite, skin, flesh, stem and leaf colours.',
  tags: ['apple', 'fruit', 'food', 'pickup', 'produce', 'healthy', 'snack'],
  kit: 'food-kitchen',
  category: 'item',
  origin: 'base',
  compat: ['kitchen', 'food', 'market', 'farm', 'tavern', 'indoor', 'medieval'],
  triangleBudget: 380,
});

const shape = param('shape', 'round', { choices: ['round', 'tall'], label: 'Variety shape' });
const bite = param('bite', 'no', { choices: ['no', 'yes'], label: 'Bitten' });
const skin = param('skin', '#c8262a', { label: 'Skin' });
const flesh = param('flesh', '#f3e6b8', { label: 'Flesh' });
const stem = param('stem', '#6a4526', { label: 'Stem' });
const leaf = param('leaf', '#4f9a34', { label: 'Leaf' });

presets({
  'granny smith': { skin: '#8cc63e', leaf: '#3d7f2a' },
  golden: { skin: '#e8c443' },
});

const tall = shape.value === 'tall';
const ngon = (r: number, k0: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < k0; k++) p = p.lineTo(r * Math.cos(rot + (2 * Math.PI * k) / k0), r * Math.sin(rot + (2 * Math.PI * k) / k0));
  return p.close();
};
// Body rings (radius, height): a narrow dimpled base swelling to the shoulder
// and closing into the stem dimple.
const rings: [number, number][] = tall
  ? [[16, 0], [30, 7], [37, 24], [41, 46], [38, 66], [24, 80], [11, 76]]
  : [[15, 0], [32, 6], [41, 20], [43, 38], [38, 56], [24, 68], [10, 64]];
const N = 10;
const body = (sc: number) => ngon(rings[0][0] * sc, N).loft(rings.slice(1).map(([r]) => ngon(r * sc, N)), {
  planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z * (sc === 1 ? 1 : 0.98) + (sc === 1 ? 0 : 1)] as [number, number, number] })),
  ruled: true,
});
const topZ = rings[rings.length - 1][1];
const midZ = tall ? 44 : 36;
const biteBall = (r: number) => sphere(r).scale([0.85, 1, 1.25]).translate(0, -52, midZ);

const a = assembly('apple');
if (bite.value === 'yes') {
  a.part('skin', body(1).subtract(biteBall(26)).color(skin));
  a.part('flesh', body(0.95).subtract(biteBall(24)).color(flesh));
} else {
  a.part('skin', body(1).color(skin));
}
// Stem: thin tilted stick rising out of the top dimple.
a.part('stem', ngon(2.6, 5).loft(ngon(2, 5), { spacing: 22, ruled: true }).rotateY(12).translate(0, 0, topZ - 4).color(stem));
// Leaf: a flat diamond tilted out from the stem.
a.part('leaf', extrudePolygon([[0, 0], [8, -8], [20, -9], [30, 0], [20, 8], [8, 8]], 1.6)
  .rotateX(35).rotateY(-25).translate(1, 0, topZ + 10).rotateZ(-60).color(leaf));

return a.model();
