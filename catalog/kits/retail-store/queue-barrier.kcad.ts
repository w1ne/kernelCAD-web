// SPDX-License-Identifier: CC0-1.0
// Short retractable queue barrier with square weighted feet, posts and a taut cross strap

meta({
  name: "queue-barrier",
  license: 'CC0-1.0',
  title: "Queue barrier",
  description: "Short retractable queue barrier with square weighted feet, posts and a taut cross strap. Knobs: overall scale and stainless steel, fabric, rubber color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const stainless = param('stainless', '#78868a', { label: 'Stainless steel color' });
const fabric = param('fabric', '#bd4d43', { label: 'Fabric color' });
const rubber = param('rubber', '#33393c', { label: 'Rubber color' });

presets({
  cleanStore: {
    stainless: '#bfc8cb',
    fabric: '#be5548',
    rubber: '#40474b',
  },
  nightRestock: {
    stainless: '#66747a',
    fabric: '#d5a833',
    rubber: '#262b2e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("queue-barrier");
p.part("foot-left", b(-500, 0, 24, 280, 280, 48).color(rubber));
p.part("foot-right", b(500, 0, 24, 280, 280, 48).color(rubber));
p.part("post-left", c(-500, 0, 48, 930, 42, 10).color(stainless));
p.part("post-right", c(500, 0, 48, 930, 42, 10).color(stainless));
p.part("strap", b(0, 0, 900, 1000, 20, 42).color(fabric));
p.part("cap-left", c(-500, 0, 975, 25, 55, 10).color(stainless));
p.part("cap-right", c(500, 0, 975, 25, 55, 10).color(stainless));

return p.model();
