// SPDX-License-Identifier: CC0-1.0
// Cable entry gland plate: Rectangular entry plate with four raised cable glands and corner bolt heads with clearly separated telecom materials and visible component cues.

meta({
  name: "cable-entry-gland-plate",
  license: 'CC0-1.0',
  title: "Cable entry gland plate",
  description: "Rectangular entry plate with four raised cable glands and corner bolt heads. Knobs: overall scale; engineering polymer and cable jacket, powder-coated steel, stainless steel.",
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

const p = assembly("cable-entry-gland-plate");
p.part("plate", b(0, 0, 0, 680, 420, 50).color(powderCoat));
p.part("gland-0", c(-230, 0, 25, 120, 48, 8).color(polymer));
p.part("gland-1", c(-80, 0, 25, 120, 48, 8).color(polymer));
p.part("gland-2", c(70, 0, 25, 120, 48, 8).color(polymer));
p.part("gland-3", c(220, 0, 25, 120, 48, 8).color(polymer));
p.part("bolt--290--160", c(-290, -160, 25, 18, 16, 8).color(stainlessSteel));
p.part("bolt--290-160", c(-290, 160, 25, 18, 16, 8).color(stainlessSteel));
p.part("bolt-290--160", c(290, -160, 25, 18, 16, 8).color(stainlessSteel));
p.part("bolt-290-160", c(290, 160, 25, 18, 16, 8).color(stainlessSteel));

return p.model();
