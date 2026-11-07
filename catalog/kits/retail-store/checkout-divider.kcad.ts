// SPDX-License-Identifier: CC0-1.0
// Low polygon checkout divider with long body, raised grip fin and beveled-looking end blocks

meta({
  name: "checkout-divider",
  license: 'CC0-1.0',
  title: "Checkout divider",
  description: "Low polygon checkout divider with long body, raised grip fin and beveled-looking end blocks. Knobs: overall scale and polypropylene, rubber, abs plastic color controls. Presets: cleanStore and nightRestock.",
  tags: ['retail', 'grocery', 'shop', 'low poly', 'scene prop'],
  kit: 'retail-store',
  category: 'prop',
  origin: 'base',
  compat: ['retail', 'shop', 'grocery', 'interior', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const polypropylene = param('polypropylene', '#df8f38', { label: 'Polypropylene color' });
const rubber = param('rubber', '#41484d', { label: 'Rubber color' });
const abs = param('abs', '#f0b747', { label: 'ABS plastic color' });

presets({
  cleanStore: {
    polypropylene: '#d6e0d5',
    rubber: '#40474b',
    abs: '#e5e9e9',
  },
  nightRestock: {
    polypropylene: '#45614e',
    rubber: '#262b2e',
    abs: '#364a55',
  },
});
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("checkout-divider");
p.part("body", b(0, 0, 26, 260, 62, 52).color(polypropylene));
p.part("grip-fin", b(0, 0, 64, 24, 54, 32).color(rubber));
p.part("end-left", b(-112, 0, 42, 38, 76, 84).color(rubber));
p.part("end-right", b(112, 0, 42, 38, 76, 84).color(rubber));
p.part("top-button", c(0, 0, 80, 10, 12, 8).color(abs));

return p.model();
