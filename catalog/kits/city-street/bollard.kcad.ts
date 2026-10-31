// Original kernelCAD low-poly street bollard: faceted or square post with a
// reflective band and a cap. Millimetres, Z up, base on z = 0.

meta({
  name: 'bollard',
  license: 'CC0-1.0',
  title: 'Bollard',
  description: 'Street bollard post with a reflective band and cap, round-faceted or square. Knobs: height, style, post, band and cap colours.',
  tags: ['bollard', 'post', 'barrier', 'pedestrian', 'sidewalk', 'street'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 160,
});

const heightMm = param('heightMm', '1000', { choices: ['800', '1000', '1200'], label: 'Height (mm)' });
const style = param('style', 'round', { choices: ['round', 'square'], label: 'Style' });
const post = param('post', '#2b2d30', { label: 'Post' });
const band = param('band', '#f2f2ee', { label: 'Reflective band' });
const capColor = param('cap', '#9aa0a6', { label: 'Cap' });

presets({
  safety: { post: '#f2c418', band: '#1e1e1e', cap: '#f2c418' },
  heritage: { post: '#1f3d2b', band: '#c9a64a', cap: '#c9a64a' },
});

const h = Number(heightMm.value);
const s = style.value === 'round' ? 8 : 4;
const rot = style.value === 'round' ? 0 : Math.PI / 4;

const ngon = (r: number) => {
  let p = path().moveTo(r * Math.cos(rot), r * Math.sin(rot));
  for (let k = 1; k < s; k++) {
    const a = rot + (2 * Math.PI * k) / s;
    p = p.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  return p.close();
};
const prism = (r: number, z0: number, z1: number) => ngon(r).extrude(z1 - z0).translate(0, 0, z0);

const r = style.value === 'round' ? 95 : 110;
const b = assembly('bollard');
b.part('foot', prism(r * 1.18, 0, 40).color(post));
b.part('post-low', prism(r, 40, h * 0.72).color(post));
b.part('band', prism(r * 1.02, h * 0.72, h * 0.82).color(band));
b.part('post-high', prism(r, h * 0.82, h - 60).color(post));
b.part('cap', ngon(r * 1.08).loft(ngon(r * 0.5), { spacing: 60, ruled: true }).translate(0, 0, h - 60).color(capColor));

return b.model();
