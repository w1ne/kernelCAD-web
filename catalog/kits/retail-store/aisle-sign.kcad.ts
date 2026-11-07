// SPDX-License-Identifier: CC0-1.0
// Single aisle marker with a broad hanging panel, two ceiling rods and compact end caps

meta({
  name: "aisle-sign",
  license: 'CC0-1.0',
  title: "Aisle sign",
  description: "Single aisle marker with a broad hanging panel, two ceiling rods and compact end caps. Knobs: overall scale and aluminium, acrylic, vinyl color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const aluminium = param('aluminium', '#77858b', { label: 'Aluminium color' });
const acrylic = param('acrylic', '#e6d6ab', { label: 'Acrylic color' });
const vinyl = param('vinyl', '#c65b3e', { label: 'Vinyl color' });

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

const p = assembly("aisle-sign");
p.part("sign-panel", b(0, 0, 225, 720, 90, 420).color(acrylic));
p.part("top-border", b(0, 0, 445, 760, 22, 30).color(vinyl));
p.part("bottom-border", b(0, 0, 15, 760, 22, 30).color(vinyl));
p.part("rod-left", c(-270, 0, 445, 560, 15, 8).color(aluminium));
p.part("rod-right", c(270, 0, 445, 560, 15, 8).color(aluminium));
p.part("cap", c(0, 0, 471, 22, 24, 8).color(aluminium));

return p.model();
