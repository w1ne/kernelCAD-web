// SPDX-License-Identifier: CC0-1.0
// Fiber terminal box: Wall-mounted fiber terminal enclosure with weather hood, door seam and cable glands with clearly separated telecom materials and visible component cues.

meta({
  name: "fiber-terminal-box",
  license: 'CC0-1.0',
  title: "Fiber terminal box",
  description: "Wall-mounted fiber terminal enclosure with weather hood, door seam and cable glands. Knobs: overall scale; engineering polymer and cable jacket, powder-coated steel, stainless steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
const powderCoat = param('powderCoat', '#318b96', { label: 'Powder-coated steel' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    polymer: '#263a37',
    powderCoat: '#52756b',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    polymer: '#27363c',
    powderCoat: '#e0aa18',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("fiber-terminal-box");
p.part("body", b(0, 0, 210, 460, 170, 420).color(powderCoat));
p.part("hood", b(0, 0, 440, 500, 210, 45).color(powderCoat));
p.part("door", b(0, -90, 225, 390, 16, 340).color(powderCoat));
p.part("gland-left", c(-130, 0, 0, 75, 25, 8).color(polymer));
p.part("gland-right", c(130, 0, 0, 75, 25, 8).color(polymer));
p.part("latch", c(150, -108, 270, 24, 14, 8).color(stainlessSteel));

return p.model();
