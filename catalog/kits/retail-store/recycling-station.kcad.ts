// SPDX-License-Identifier: CC0-1.0
// Three-stream recycling station with separate openings, top dividers and a shared removable base

meta({
  name: "recycling-station",
  license: 'CC0-1.0',
  title: "Retail recycling station",
  description: "Three-stream recycling station with separate openings, top dividers and a shared removable base. Knobs: overall scale and polypropylene, stainless steel, polycarbonate color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polypropylene = param('polypropylene', '#507b62', { label: 'Polypropylene color' });
const stainless = param('stainless', '#9ca7a8', { label: 'Stainless steel color' });
const polycarbonate = param('polycarbonate', '#273b3d', { label: 'Polycarbonate color' });

presets({
  cleanStore: {
    polypropylene: '#d6e0d5',
    stainless: '#bfc8cb',
    polycarbonate: '#a2d1d7',
  },
  nightRestock: {
    polypropylene: '#45614e',
    stainless: '#66747a',
    polycarbonate: '#486b7b',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("recycling-station");
p.part("bin-0", b(-390, 0, 400, 360, 440, 800).color(polypropylene));
p.part("bin-1", b(0, 0, 400, 360, 440, 800).color(polypropylene));
p.part("bin-2", b(390, 0, 400, 360, 440, 800).color(polypropylene));
p.part("opening-0", b(-390, -230, 840, 220, 22, 110).color(polycarbonate));
p.part("opening-1", b(0, -230, 840, 220, 22, 110).color(polycarbonate));
p.part("opening-2", b(390, -230, 840, 220, 22, 110).color(polycarbonate));
p.part("shared-top", b(0, 0, 830, 1190, 480, 60).color(stainless));
p.part("base-plinth", b(0, 0, 35, 1210, 500, 70).color(stainless));
p.part("corner-foot-0", c(-540, 0, 0, 28, 28, 8).color(polypropylene));
p.part("corner-foot-1", c(0, 0, 0, 28, 28, 8).color(polypropylene));
p.part("corner-foot-2", c(540, 0, 0, 28, 28, 8).color(polypropylene));

return p.model();
