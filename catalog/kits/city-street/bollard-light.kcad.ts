// Original kernelCAD low-poly bollard light: a short faceted post on a base
// ring with a glowing lens band under louvre rings and a flat cap.
// Millimetres, Z up.

meta({
  name: 'bollard-light',
  license: 'CC0-1.0',
  title: 'Bollard light',
  description: 'Low path and plaza bollard light with a glowing lens band and louvred cap, round or square. Knobs: height, shape, post and light colours.',
  tags: ['bollard', 'light', 'lamp', 'path light', 'garden light', 'plaza', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street', 'park', 'garden', 'plaza'],
  triangleBudget: 220,
});

const heightMm = param('heightMm', '900', { choices: ['600', '900', '1200'], label: 'Height (mm)' });
const shape = param('shape', 'round', { choices: ['round', 'square'], label: 'Shape' });
const post = param('post', '#34383c', { label: 'Post' });
const light = param('light', '#fff2b8', { label: 'Light' });

presets({
  steel: { post: '#a9adb0', light: '#f4f8ff' },
  bronze: { post: '#6b4a2e', light: '#ffd27a' },
});

const H = Number(heightMm.value);
const s = shape.value === 'round' ? 8 : 4;
const rot = Math.PI / s;
const ngon = (r: number, s: number, rot = 0) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const sec = (r: number, h: number, z: number) => ngon(r, s, rot).extrude(h).translate(0, 0, z);

const bl = assembly('bollard-light');
bl.part('base', sec(115, 40, 0).color(post));
bl.part('post', sec(90, H - 260, 30).color(post));
bl.part('lens', sec(84, 170, H - 240).color(light));
bl.part('louvre-1', sec(98, 18, H - 190).color(post));
bl.part('louvre-2', sec(98, 18, H - 130).color(post));
bl.part('cap', ngon(110, s, rot).loft(ngon(80, s, rot), { spacing: 80, ruled: true }).translate(0, 0, H - 80).color(post));

return bl.model();
