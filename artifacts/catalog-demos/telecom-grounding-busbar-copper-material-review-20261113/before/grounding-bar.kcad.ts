// SPDX-License-Identifier: CC0-1.0
// Grounding busbar: Wall-mounted bonding bar with a thick base rail and six rounded-looking terminal posts with clearly separated telecom materials and visible component cues.

meta({
  name: "grounding-bar",
  license: 'CC0-1.0',
  title: "Grounding busbar",
  description: "Wall-mounted bonding bar with a thick base rail and six rounded-looking terminal posts. Knobs: overall scale; copper conductor, galvanized steel, engineering polymer and cable jacket.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const copper = param('copper', '#c27836', { label: 'Copper conductor' });
const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
presets({
  fieldSite: {
    copper: '#a96d37',
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
  },
  highVisibility: {
    copper: '#c4823c',
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);
const c = (x: number, y: number, z: number, h: number, r: number, n = 8) => cylinder(h, r, n).translate(x, y, z).scale(scale);

const p = assembly("grounding-bar");
p.part("rail", b(0, 0, 85, 850, 95, 90).color(galvanizedSteel));
p.part("insulator-left", b(-350, 0, 0, 100, 130, 90).color(polymer));
p.part("insulator-right", b(350, 0, 0, 100, 130, 90).color(polymer));
p.part("terminal-0", c(-300, 0, 130, 90, 24, 8).color(copper));
p.part("terminal-1", c(-180, 0, 130, 90, 24, 8).color(copper));
p.part("terminal-2", c(-60, 0, 130, 90, 24, 8).color(copper));
p.part("terminal-3", c(60, 0, 130, 90, 24, 8).color(copper));
p.part("terminal-4", c(180, 0, 130, 90, 24, 8).color(copper));
p.part("terminal-5", c(300, 0, 130, 90, 24, 8).color(copper));

return p.model();
