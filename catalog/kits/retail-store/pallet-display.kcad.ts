// SPDX-License-Identifier: CC0-1.0
// Original low-poly retail scene prop, authored in millimetres, Z up, with a floor origin at z = 0.

meta({
  name: "pallet-display",
  license: 'CC0-1.0',
  title: "Promotional pallet display",
  description: "Low promotional island with a pallet base, stacked riser blocks and a tall branded sign panel. Knobs: overall scale and asset color.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8c704c", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("pallet-display");
p.part("pallet-deck", b(0, 0, 95, 1200, 1000, 190).color(color));
p.part("runner--440", b(-440, 0, 32, 135, 880, 64).color(color));
p.part("runner-0", b(0, 0, 32, 135, 880, 64).color(color));
p.part("runner-440", b(440, 0, 32, 135, 880, 64).color(color));
p.part("display-base", b(0, 0, 390, 1000, 800, 400).color(color));
p.part("sign-mast", b(0, 380, 1050, 55, 70, 900).color(color));
p.part("sign-panel", b(0, 380, 1560, 760, 70, 240).color(color));
p.part("mast-cap", c(0, 380, 1680, 28, 42, 8).color(color));

return p.model();
