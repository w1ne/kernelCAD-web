// SPDX-License-Identifier: CC0-1.0
// Grounding rod set: Three vertical grounding rods with top clamps and a short bonding strap with clearly separated telecom materials and visible component cues.

meta({
  name: "grounding-rod-kit",
  license: 'CC0-1.0',
  title: "Grounding rod set",
  description: "Three vertical grounding rods with top clamps and a short bonding strap. Knobs: overall scale; copper conductor, stainless steel.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const copper = param('copper', '#c27836', { label: 'Copper conductor' });
const stainlessSteel = param('stainlessSteel', '#d2dbdc', { label: 'Stainless steel' });
presets({
  fieldSite: {
    copper: '#a96d37',
    stainlessSteel: '#d0d9d6',
  },
  highVisibility: {
    copper: '#c4823c',
    stainlessSteel: '#e4e9e6',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("grounding-rod-kit");
p.part("rod-0", c(-300, 0, 0, 1200, 24, 8).color(copper));
p.part("rod-1", c(0, 0, 0, 1200, 24, 8).color(copper));
p.part("rod-2", c(300, 0, 0, 1200, 24, 8).color(copper));
p.part("clamp-0", c(-300, 0, 1050, 55, 42, 8).color(stainlessSteel));
p.part("clamp-1", c(0, 0, 1050, 55, 42, 8).color(stainlessSteel));
p.part("clamp-2", c(300, 0, 1050, 55, 42, 8).color(stainlessSteel));
p.part("bonding-bar", b(0, 0, 1125, 760, 45, 45).color(copper));

return p.model();
