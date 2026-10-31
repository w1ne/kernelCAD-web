// Original kernelCAD low-poly parking meter: faceted post with one or two
// meter heads, each with a domed top and a display window. Millimetres, Z up.

meta({
  name: 'parking-meter',
  license: 'CC0-1.0',
  title: 'Parking meter',
  description: 'Kerbside parking meter on a post with a single or twin head and display windows. Knobs: heads, post, head and display colours.',
  tags: ['parking', 'meter', 'parking meter', 'kerb', 'curb', 'sidewalk', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 220,
});

const heads = param('heads', 'single', { choices: ['single', 'twin'], label: 'Heads' });
const post = param('post', '#3c4046', { label: 'Post' });
const head = param('head', '#9aa3ab', { label: 'Meter head' });
const display = param('display', '#cfe6a8', { label: 'Display' });

presets({
  classic: { post: '#2a2c2e', head: '#3a5f8a' },
  green: { post: '#1f3d2b', head: '#c9a64a' },
});

const ngon = (r: number, s = 8) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) {
    p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  }
  return p.close();
};

const pm = assembly('parking-meter');
pm.part('foot', ngon(80).extrude(30).color(post));
pm.part('post', ngon(38).extrude(1000).translate(0, 0, 30).color(post));

const twin = heads.value === 'twin';
const offsets = twin ? [-130, 130] : [0];
if (twin) pm.part('yoke', box(380, 90, 60, true).translate(0, 0, 1030).color(post));
offsets.forEach((x, i) => {
  // Head: lower body, a display band (slightly inset), upper body and a
  // chamfered hood. Stacked pieces keep the flat-shaded faces clean.
  pm.part(`head-${i + 1}`, box(210, 150, 170, true).translate(x, 0, 1060 + 85).color(head));
  pm.part(`display-${i + 1}`, box(196, 140, 90, true).translate(x, 0, 1230 + 45).color(display));
  pm.part(`head-top-${i + 1}`, box(210, 150, 20, true).translate(x, 0, 1320 + 10).color(head));
  const hood: [number, number][] = [[-105, 0], [105, 0], [105, 30], [60, 85], [-60, 85], [-105, 30]];
  pm.part(`hood-${i + 1}`, extrudePolygon(hood, 150).rotateX(90).translate(x, 75, 1340).color(head));
  pm.part(`coin-${i + 1}`, box(60, 26, 30, true).translate(x, -80, 1130).color(post));
});

return pm.model();
