// Original kernelCAD low-poly traffic cone: square base plate, faceted cone
// with a reflective band. Millimetres, Z up, base on z = 0.

meta({
  name: 'traffic-cone',
  license: 'CC0-1.0',
  title: 'Traffic cone',
  description: 'Faceted traffic cone on a square rubber base with a reflective band. Knobs: height, facets, cone, band and base colours.',
  tags: ['cone', 'traffic', 'road', 'roadworks', 'safety', 'pylon'],
  kit: 'city-street',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'street'],
  triangleBudget: 160,
});

const heightMm = param('heightMm', '700', { choices: ['450', '700', '900'], label: 'Height (mm)' });
const sides = param('sides', '8', { choices: ['6', '8', '10'], label: 'Facets' });
const coneColor = param('cone', '#f26a1b', { label: 'Cone' });
const band = param('band', '#f2f2ee', { label: 'Reflective band' });
const baseColor = param('base', '#262626', { label: 'Base' });

presets({
  yellow: { cone: '#f2c418' },
  lime: { cone: '#b8e01e', band: '#f2f2ee' },
});

const h = Number(heightMm.value);
const s = Number(sides.value);

const ngon = (r: number) => {
  let p = path().moveTo(r, 0);
  for (let k = 1; k < s; k++) {
    p = p.lineTo(r * Math.cos((2 * Math.PI * k) / s), r * Math.sin((2 * Math.PI * k) / s));
  }
  return p.close();
};

const baseW = h * 0.55;
const plateT = h * 0.04;
const rBot = h * 0.2;
const rTop = h * 0.035;
const coneH = h - plateT;
// Radius at a fraction t of the cone height.
const rAt = (t: number) => rBot + (rTop - rBot) * t;
const frustum = (t0: number, t1: number) =>
  ngon(rAt(t0)).loft(ngon(rAt(t1)), { spacing: coneH * (t1 - t0), ruled: true }).translate(0, 0, plateT + coneH * t0);

const cone = assembly('traffic-cone');
cone.part('base', box(baseW, baseW, plateT, true).translate(0, 0, plateT / 2).color(baseColor));
cone.part('lower', frustum(0, 0.45).color(coneColor));
cone.part('band', frustum(0.45, 0.65).color(band));
cone.part('upper', frustum(0.65, 1).color(coneColor));

return cone.model();
