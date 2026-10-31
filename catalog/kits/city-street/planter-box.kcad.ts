// Original kernelCAD low-poly street planter: a tapered square or round
// planter with a rim, soil and a faceted bush. Millimetres, Z up.

meta({
  name: 'planter-box',
  license: 'CC0-1.0',
  title: 'Planter box',
  description: 'Street planter with a rim, soil and a faceted bush, square or round. Knobs: shape, size, planter, rim, foliage and soil colours.',
  tags: ['planter', 'plant', 'bush', 'pot', 'flower box', 'greenery', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 300,
});

const shape = param('shape', 'square', { choices: ['square', 'round'], label: 'Shape' });
const size = param('size', 'medium', { choices: ['small', 'medium', 'large'], label: 'Size' });
const planter = param('planter', '#9a9690', { label: 'Planter' });
const rim = param('rim', '#c4c0b8', { label: 'Rim' });
const foliage = param('foliage', '#3f8a3e', { label: 'Foliage' });
const soil = param('soil', '#4a3626', { label: 'Soil' });

presets({
  timber: { planter: '#8e6a42', rim: '#6e5032' },
  terracotta: { planter: '#b5643c', rim: '#c9805a', foliage: '#4f9a3a' },
});

const k = size.value === 'small' ? 0.7 : size.value === 'large' ? 1.35 : 1;
const s = shape.value === 'square' ? 4 : 10;
const rot = shape.value === 'square' ? Math.PI / 4 : 0;
const ngon = (r: number) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let i = 1; i < s; i++) {
    const a = rot + (2 * Math.PI * i) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
// For a square, r is the half-diagonal; scale so the half-width is `w`.
const rFor = (w: number) => (shape.value === 'square' ? w * Math.SQRT2 : w);

const H = 500 * k;
const W = 380 * k; // top half-width
const pl = assembly('planter-box');
const rimH = 60 * k;
pl.part('body', ngon(rFor(W * 0.85)).loft(ngon(rFor(W)), { spacing: H - rimH, ruled: true }).color(planter));
// Rim band with the soil heaped flush to its outer edge on top.
pl.part('rim', ngon(rFor(W + 25 * k)).extrude(rimH).translate(0, 0, H - rimH).color(rim));
pl.part('soil', ngon(rFor(W + 25 * k)).extrude(15 * k).translate(0, 0, H).color(soil));
// Faceted bush: a few overlapping low-res spheres squashed into a mound.
const bush = (r: number, x: number, y: number, z: number) =>
  sphere(r).scale([1, 1, 0.8]).translate(x, y, z);
pl.part('bush-1', bush(W * 0.72, 0, 0, H + W * 0.45).color(foliage));
pl.part('bush-2', bush(W * 0.45, W * 0.4, -W * 0.3, H + W * 0.3).color(foliage));
pl.part('bush-3', bush(W * 0.45, -W * 0.4, W * 0.35, H + W * 0.3).color(foliage));

return pl.model();
