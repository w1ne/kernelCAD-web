// SPDX-License-Identifier: CC0-1.0
// Open-front chilled display with framed glass sides, three stainless shelves and an insulated base

meta({
  name: "refrigerated-display-case",
  license: 'CC0-1.0',
  title: "Refrigerated display case",
  description: "Open-front chilled display with framed glass sides, three stainless shelves and an insulated base. Knobs: overall scale and powder-coated steel, stainless steel, glass color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#526a71', { label: 'Powder-coated steel color' });
const stainless = param('stainless', '#aab5b7', { label: 'Stainless steel color' });
const glass = param('glass', '#91cbd2', { label: 'Glass color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    stainless: '#bfc8cb',
    glass: '#9ccfd6',
  },
  nightRestock: {
    powderCoat: '#354750',
    stainless: '#66747a',
    glass: '#3e6677',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("refrigerated-display-case");
p.part("base-cabinet", b(0, 0, 360, 1800, 850, 720).color(powderCoat));
p.part("bottom-deck", b(0, -100, 760, 1720, 650, 48).color(stainless));
p.part("shelf-0", b(0, -140, 890, 1720, 590, 42).color(stainless));
p.part("shelf-1", b(0, -140, 1190, 1720, 590, 42).color(stainless));
p.part("shelf-2", b(0, -140, 1490, 1720, 590, 42).color(stainless));
p.part("canopy", b(0, 0, 1800, 1880, 900, 90).color(powderCoat));
p.part("side-glass-left", b(-892, 0, 1290, 16, 650, 1010).color(glass));
p.part("side-glass-right", b(892, 0, 1290, 16, 650, 1010).color(glass));
p.part("front-upright--840", b(-840, -350, 1260, 42, 42, 950).color(powderCoat));
p.part("front-upright-840", b(840, -350, 1260, 42, 42, 950).color(powderCoat));
p.part("temperature-dial", c(830, 437, 400, 22, 28, 8).color(stainless));

return p.model();
