// SPDX-License-Identifier: CC0-1.0
// Retail till drawer with broad faceplate, recessed pull and compact lock cylinder

meta({
  name: "cash-drawer",
  license: 'CC0-1.0',
  title: "Cash drawer",
  description: "Retail till drawer with broad faceplate, recessed pull and compact lock cylinder. Knobs: overall scale and stainless steel, abs plastic, brass color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#69767c', { label: 'Stainless steel color' });
const abs = param('abs', '#373f44', { label: 'ABS plastic color' });
const brass = param('brass', '#c19740', { label: 'Brass color' });

presets({
  cleanStore: {
    stainless: '#bfc8cb',
    abs: '#e5e9e9',
    brass: '#c29a4c',
  },
  nightRestock: {
    stainless: '#66747a',
    abs: '#364a55',
    brass: '#8f682c',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("cash-drawer");
p.part("drawer-box", b(0, 0, 80, 430, 440, 160).color(stainless));
p.part("faceplate", b(0, -226, 90, 450, 22, 138).color(stainless));
p.part("pull", b(0, -246, 105, 100, 12, 24).color(abs));
p.part("lock", c(150, -246, 105, 12, 16, 8).color(brass));

return p.model();
