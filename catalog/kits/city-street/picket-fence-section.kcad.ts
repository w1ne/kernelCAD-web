// Original kernelCAD low-poly picket fence section: pointed pickets on two
// rails between square end posts with caps. Millimetres, Z up, base on z = 0,
// pickets face -Y. Sections tile along X.

meta({
  name: 'picket-fence-section',
  license: 'CC0-1.0',
  title: 'Picket fence section',
  description: 'Tileable picket fence section with pointed pickets, two rails and capped end posts. Knobs: picket count, height, picket and post colours.',
  tags: ['fence', 'picket', 'garden', 'yard', 'boundary', 'street', 'suburb'],
  kit: 'city-street',
  category: 'structure',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 320,
});

const pickets = param('pickets', '10', { choices: ['6', '8', '10', '12'], label: 'Pickets' });
const heightMm = param('heightMm', '1000', { choices: ['800', '1000', '1200'], label: 'Height (mm)' });
const wood = param('picketColor', '#f2f0e8', { label: 'Pickets' });
const postColor = param('posts', '#e2ded2', { label: 'Posts and rails' });

presets({
  natural: { 'picketColor': '#b98a56', posts: '#8e6a42' },
  green: { 'picketColor': '#2f5d3a', posts: '#244a2e' },
});

const n = Number(pickets.value);
const h = Number(heightMm.value);
const pw = 80; // picket width
const gap = 60;
const post = 90;
const span = n * pw + (n - 1) * gap + 2 * gap; // clear width between posts
const L = span + 2 * post; // section length, post outer face to outer face

const fence = assembly('picket-fence-section');
for (const [i, xc] of [[1, -L / 2 + post / 2], [2, L / 2 - post / 2]] as [number, number][]) {
  fence.part(`post-${i}`, box(post, post, h + 50, true).translate(xc, 0, (h + 50) / 2).color(postColor));
  const cap: [number, number][] = [[-post / 2 - 10, 0], [post / 2 + 10, 0], [0, 60]];
  fence.part(`cap-${i}`, extrudePolygon(cap, post + 20).rotateX(90).translate(xc, (post + 20) / 2, h + 50).color(postColor));
}
// Two rails behind the pickets.
for (const [r, z] of [[1, h * 0.22], [2, h * 0.72]] as [number, number][]) {
  fence.part(`rail-${r}`, box(span, 30, 80, true).translate(0, 25, z).color(postColor));
}
// Pointed pickets: pentagon profile in XZ, 20 mm thick, in front of the rails.
const tip = pw * 0.6;
const picketPts: [number, number][] = [[-pw / 2, 60], [pw / 2, 60], [pw / 2, h - tip], [0, h], [-pw / 2, h - tip]];
for (let i = 0; i < n; i++) {
  const xc = -span / 2 + gap + pw / 2 + i * (pw + gap);
  fence.part(`picket-${i + 1}`, extrudePolygon(picketPts, 20).rotateX(90).translate(xc, 10, 0).color(wood));
}

return fence.model();
