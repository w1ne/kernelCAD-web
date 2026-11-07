// SPDX-License-Identifier: CC0-1.0
// One retail entrance security pedestal with sensing tower, status light and floor anchor plate

meta({
  name: "entry-security-gate",
  license: 'CC0-1.0',
  title: "Entry security gate",
  description: "One retail entrance security pedestal with sensing tower, status light and floor anchor plate. Knobs: overall scale and powder-coated steel, glass, polycarbonate color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoat = param('powderCoat', '#555f64', { label: 'Powder-coated steel color' });
const glass = param('glass', '#83c8d1', { label: 'Glass color' });
const polycarbonate = param('polycarbonate', '#e3ad2b', { label: 'Polycarbonate color' });

presets({
  cleanStore: {
    powderCoat: '#e5ebed',
    glass: '#9ccfd6',
    polycarbonate: '#a2d1d7',
  },
  nightRestock: {
    powderCoat: '#354750',
    glass: '#3e6677',
    polycarbonate: '#486b7b',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("entry-security-gate");
p.part("base", b(0, 0, 40, 350, 270, 80).color(powderCoat));
p.part("pedestal", b(0, 0, 500, 240, 190, 920).color(powderCoat));
p.part("sensor-face", b(0, -100, 560, 180, 15, 330).color(glass));
p.part("status-light", c(0, -125, 780, 38, 26, 8).color(polycarbonate));
p.part("anchor--130--90", b(-130, -90, 14, 60, 60, 28).color(powderCoat));
p.part("anchor--130-90", b(-130, 90, 14, 60, 60, 28).color(powderCoat));
p.part("anchor-130--90", b(130, -90, 14, 60, 60, 28).color(powderCoat));
p.part("anchor-130-90", b(130, 90, 14, 60, 60, 28).color(powderCoat));

return p.model();
