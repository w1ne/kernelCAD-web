// SPDX-License-Identifier: CC0-1.0
// Contoured sleep mask. What makes it a sleep mask rather than a bar: a
// padded front shaped round both eyes with a notch cut up for the nose, two
// domes bulging over moulded eye cups so the lids can move, a foam lining, a
// contrasting piped edge, and an elastic head strap with a slide adjuster
// that loops round behind. Generic visualization geometry at real size (mask
// 200 x 95 mm, strap loop about 190 mm across), millimetres, Z up, lying face
// up on z = 0 with the strap looped out behind it (+Y).
meta({
  name: 'sleep-mask',
  license: 'CC0-1.0',
  title: 'Sleep mask',
  description: 'Contoured travel sleep mask lying face up: padded front shaped round the eyes with a nose notch, moulded eye cups, piped edge, elastic head strap with slide adjuster. Silk or contoured style. Material controls: front fabric, piping, eye cups and lining foam, strap elastic; midnightSilk, blushSatin and lavenderFoam presets.',
  tags: ['sleep mask', 'eye mask', 'travel', 'sleep', 'airplane', 'comfort', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'airplane', 'hotel', 'bedroom'],
  triangleBudget: 1200,
});

const style = param('style', 'contoured', { choices: ['contoured', 'silk'], label: 'Mask style' });
const frontFabric = param('frontFabric', '#2c3046', { label: 'Front (fabric)' });
const piping = param('piping', '#c9a96a', { label: 'Edge piping (satin cord)' });
const foam = param('foam', '#5a5f78', { label: 'Eye cups and lining (foam)' });
const elastic = param('elastic', '#1d1f2a', { label: 'Head strap (elastic)' });
presets({
  midnightSilk: { frontFabric: '#1c2036', piping: '#d6b56e', foam: '#2c3150', elastic: '#141626' },
  blushSatin: { frontFabric: '#e8b4b0', piping: '#f5e6d8', foam: '#d79a96', elastic: '#c07f7a' },
  lavenderFoam: { frontFabric: '#9b8fc4', piping: '#f1eef8', foam: '#7c70a8', elastic: '#4e4570' },
});

const p = assembly('sleep-mask');
const add = (name, shape) => p.part(name, shape);
const contoured = style.value === 'contoured';
const W = 200;
const TH = contoured ? 14 : 6;

// Mask outline (x, y): two eye lobes, a straight brow, a notch up for the nose.
const lobe = (cx, n0, n1) => Array.from({ length: 9 }, (_, i) => {
  const a = ((n0 + ((n1 - n0) * i) / 8) * Math.PI) / 180;
  return [cx + 52 * Math.cos(a), -6 + 44 * Math.sin(a)];
});
const outline = (grow) => {
  const s = (pts) => pts.map(([x, y]) => [x * (1 + grow / 100), y * (1 + grow / 50)]);
  return s([
    [-W / 2 + 6, 30], [W / 2 - 6, 30],
    ...lobe(W / 2 - 52, 30, -100),
    [18, -26], [8, -8], [-8, -8], [-18, -26],
    ...lobe(-W / 2 + 52, -80, -210),
  ]);
};

// Layers from the bottom up: piped edge, foam lining showing as a band, padded front.
add('piping', extrudePolygon(outline(3), 3).color(piping));
add('lining', extrudePolygon(outline(1.5), 3).translate(0, 0, 3).color(foam));
add('front', extrudePolygon(outline(0), TH).translate(0, 0, 6).color(frontFabric));
// The contoured style bulges over each eye cup so the lids can move underneath.
if (contoured) {
  for (const x of [-48, 48]) {
    const dome = sphere(36).scale([1.2, 0.85, 0.42]).intersect(box(100, 80, 40).translate(-50, -40, 0));
    add(`eye-dome-${x < 0 ? 'left' : 'right'}`, dome.translate(x, -4, TH + 5).color(frontFabric));
    add(`dome-seam-${x < 0 ? 'left' : 'right'}`, torus(40, 1.6, 6).scale([1.1, 0.8, 1]).translate(x, -4, TH + 6).color(foam));
  }
}

// Elastic head strap: a flat oval loop from both temples out behind the mask.
const SR = 92;
const loop = torus(SR, 5, 8).scale([1.05, 0.95, 0.5]).intersect(box(400, 300, 30).translate(-200, -20, -15));
add('strap', loop.translate(0, 15, 6).color(elastic));
for (const sx of [-1, 1]) add(`strap-anchor-${sx}`, box(18, 26, 8, true).translate(sx * (W / 2 - 8), 14, 6).color(piping));
// Slide adjuster on the back of the strap.
add('slide-adjuster', extrudeRoundedRect(36, 16, 5, 7).translate(0, 15 + SR * 0.95, 3).color(piping));

return p.model();
