// SPDX-License-Identifier: CC0-1.0
// Double-sided overhead store direction sign with a long panel and two ceiling suspension rods

meta({
  name: "hanging-wayfinding-sign",
  license: 'CC0-1.0',
  title: "Hanging wayfinding sign",
  description: "Double-sided overhead store direction sign with a long panel and two ceiling suspension rods. Knobs: overall scale and aluminium, acrylic, vinyl color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#727f84', { label: 'Aluminium color' });
const acrylic = param('acrylic', '#e8e1c8', { label: 'Acrylic color' });
const vinyl = param('vinyl', '#397c99', { label: 'Vinyl color' });

presets({
  cleanStore: {
    aluminium: '#c4cdd0',
    acrylic: '#a1d1dc',
    vinyl: '#dce9dc',
  },
  nightRestock: {
    aluminium: '#6b7a80',
    acrylic: '#486b80',
    vinyl: '#d2a536',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("hanging-wayfinding-sign");
p.part("panel", b(0, 0, 230, 1600, 100, 460).color(acrylic));
p.part("top-edge", b(0, 0, 470, 1640, 125, 28).color(aluminium));
p.part("hanger-left", c(-570, 0, 468, 650, 18, 8).color(aluminium));
p.part("hanger-right", c(570, 0, 468, 650, 18, 8).color(aluminium));
p.part("arrow-block", b(0, -62, 222, 170, 18, 18).color(vinyl));

return p.model();
