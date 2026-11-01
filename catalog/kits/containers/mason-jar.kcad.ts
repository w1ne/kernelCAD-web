// Original kernelCAD low-poly mason jar: a faceted glass body with a
// rounded shoulder, a screw band and flat lid, filled to a chosen level
// (the contents show as a coloured band inside the pale "glass").
// Millimetres, Z up, base on z = 0 centred on x = y = 0.

meta({
  name: 'mason-jar',
  license: 'CC0-1.0',
  title: 'Mason jar',
  description: 'Glass mason preserving jar with shoulder, screw band and lid, empty or filled with jam, pickles or honey. Knobs: size, fill, glass, contents, band and lid colours.',
  tags: ['jar', 'mason jar', 'preserves', 'jam', 'pickles', 'kitchen', 'pantry', 'glass'],
  kit: 'containers',
  category: 'item',
  origin: 'base',
  compat: ['indoor', 'kitchen', 'farm', 'shop', 'cellar'],
  triangleBudget: 280,
});

const size = param('size', 'quart', { choices: ['half-pint', 'pint', 'quart'], label: 'Size' });
const fill = param('fill', 'full', { choices: ['empty', 'half', 'full'], label: 'Fill' });
const glass = param('glass', '#cfe3e0', { label: 'Glass' });
const contents = param('contents', '#b8323f', { label: 'Contents' });
const band = param('band', '#c9a43a', { label: 'Screw band' });
const lid = param('lid', '#d8d4c8', { label: 'Lid' });

presets({
  pickles: { contents: '#7a9a3a', band: '#9aa2a8', lid: '#9aa2a8' },
  honey: { contents: '#e0a020', band: '#d8d4c8', lid: '#c8302a' },
});

const n = 10;
const R = size.value === 'half-pint' ? 34 : 43;
const H = size.value === 'half-pint' ? 95 : size.value === 'pint' ? 130 : 170;
const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < n; k++) p = p.lineTo(r * Math.cos((2 * Math.PI * k) / n), r * Math.sin((2 * Math.PI * k) / n));
  return p.close();
};
const stack = (rings: [number, number][]) =>
  ngon(rings[0][0]).loft(rings.slice(1).map(([r]) => ngon(r)), {
    planes: rings.map(([, z]) => ({ plane: 'XY' as const, origin: [0, 0, z] as [number, number, number] })),
    ruled: true,
  });

const shoulder = H - 28;
const neckR = R * 0.82;
// Contents level: the lower part of the straight wall is drawn in the
// contents colour so the jar reads as a filled glass jar.
const level = fill.value === 'full' ? shoulder - 22 : fill.value === 'half' ? shoulder * 0.5 : 0;

const j = assembly('mason-jar');
if (level > 0) {
  // Thick glass heel below, contents just inside the wall, glass above.
  j.part('contents', ngon(R - 1).extrude(level - 11).translate(0, 0, 11).color(contents));
  j.part('heel', stack([[R - 3, 0], [R, 6], [R, 12]]).color(glass));
  j.part('glass', stack([[R, level - 1], [R, shoulder], [neckR, H - 14], [neckR, H - 10]]).color(glass));
} else {
  j.part('glass', stack([[R - 3, 0], [R, 6], [R, shoulder], [neckR, H - 14], [neckR, H - 10]]).color(glass));
}
j.part('band', ngon(neckR + 3).extrude(16).translate(0, 0, H - 16).color(band));
j.part('lid', ngon(neckR - 2).extrude(4).translate(0, 0, H - 1).color(lid));

return j.model();
