// SPDX-License-Identifier: CC0-1.0
// Countertop barcode scanner with an angled reading head, glass windows and a low weighted base

meta({
  name: "barcode-scanner",
  license: 'CC0-1.0',
  title: "Barcode scanner",
  description: "Countertop barcode scanner with an angled reading head, glass windows and a low weighted base. Knobs: overall scale and abs plastic, glass, polycarbonate color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const abs = param('abs', '#38474e', { label: 'ABS plastic color' });
const glass = param('glass', '#75c5d4', { label: 'Glass color' });
const polycarbonate = param('polycarbonate', '#e0a735', { label: 'Polycarbonate color' });

presets({
  cleanStore: {
    abs: '#e5e9e9',
    glass: '#9ccfd6',
    polycarbonate: '#a2d1d7',
  },
  nightRestock: {
    abs: '#364a55',
    glass: '#3e6677',
    polycarbonate: '#486b7b',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const tiltedB = (x: number, y: number, z: number, w: number, d: number, h: number, angle: number) => box(w, d, h, true).rotateX(angle).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("barcode-scanner");
p.part("base", b(0, 0, 36, 310, 240, 72).color(abs));
p.part("scanner-head", tiltedB(0, 0, 112, 260, 210, 90, -10).color(abs));
p.part("front-window", tiltedB(0, -108, 145, 185, 12, 52, -10).color(glass));
p.part("side-window", b(136, 0, 144, 12, 135, 44).color(glass));
p.part("status-light", c(110, 60, 158, 18, 10, 8).color(polycarbonate));

return p.model();
