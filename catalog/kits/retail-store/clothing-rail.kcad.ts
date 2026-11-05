// SPDX-License-Identifier: CC0-1.0
// Retail garment rail with straight hanging bar, four corner posts and stabilizing feet

meta({
  name: "clothing-rail",
  license: 'CC0-1.0',
  title: "Clothing rail",
  description: "Retail garment rail with straight hanging bar, four corner posts and stabilizing feet. Knobs: overall scale and stainless steel, rubber, abs plastic color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#727f84', { label: 'Stainless steel color' });
const rubber = param('rubber', '#363c40', { label: 'Rubber color' });
const abs = param('abs', '#d8dedf', { label: 'ABS plastic color' });

presets({
  cleanStore: {
    stainless: '#bfc8cb',
    rubber: '#40474b',
    abs: '#e5e9e9',
  },
  nightRestock: {
    stainless: '#66747a',
    rubber: '#262b2e',
    abs: '#364a55',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("clothing-rail");
p.part("top-rail", b(0, 0, 1510, 1500, 50, 50).color(stainless));
p.part("post--700--205", b(-700, -205, 755, 42, 42, 1510).color(stainless));
p.part("post--700-205", b(-700, 205, 755, 42, 42, 1510).color(stainless));
p.part("post-700--205", b(700, -205, 755, 42, 42, 1510).color(stainless));
p.part("post-700-205", b(700, 205, 755, 42, 42, 1510).color(stainless));
p.part("foot--700", b(-700, 0, 30, 220, 420, 60).color(rubber));
p.part("foot-700", b(700, 0, 30, 220, 420, 60).color(rubber));
p.part("end-cap", c(750, 0, 1510, 40, 36, 8).color(abs));

return p.model();
