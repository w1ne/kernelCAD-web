// SPDX-License-Identifier: CC0-1.0
// Store returns collection bin with hinged-look lid, front deposit slot and lower label plate

meta({
  name: "returns-drop-bin",
  license: 'CC0-1.0',
  title: "Returns drop bin",
  description: "Store returns collection bin with hinged-look lid, front deposit slot and lower label plate. Knobs: overall scale and polypropylene, stainless steel, paper color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polypropylene = param('polypropylene', '#365c54', { label: 'Polypropylene color' });
const stainless = param('stainless', '#9da8aa', { label: 'Stainless steel color' });
const paper = param('paper', '#e8dfc4', { label: 'Paper color' });

presets({
  cleanStore: {
    polypropylene: '#d6e0d5',
    stainless: '#bfc8cb',
    paper: '#f0e5c9',
  },
  nightRestock: {
    polypropylene: '#45614e',
    stainless: '#66747a',
    paper: '#c9b27e',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("returns-drop-bin");
p.part("bin", b(0, 0, 430, 680, 600, 860).color(polypropylene));
p.part("lid", b(0, 0, 885, 720, 640, 50).color(polypropylene));
p.part("deposit-slot", b(0, -315, 840, 300, 18, 36).color(polypropylene));
p.part("label-panel", b(0, -314, 490, 410, 16, 180).color(paper));
p.part("lid-hinge-left", c(-285, 280, 885, 35, 26, 8).color(stainless));
p.part("lid-hinge-right", c(285, 280, 885, 35, 26, 8).color(stainless));

return p.model();
