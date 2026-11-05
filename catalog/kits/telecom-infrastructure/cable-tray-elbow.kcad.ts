// SPDX-License-Identifier: CC0-1.0
// Cable tray elbow: Right-angle cable tray elbow with raised side rails and corner floor panels with clearly separated telecom materials and visible component cues.

meta({
  name: "cable-tray-elbow",
  license: 'CC0-1.0',
  title: "Cable tray elbow",
  description: "Right-angle cable tray elbow with raised side rails and corner floor panels. Knobs: overall scale; galvanized steel, engineering polymer and cable jacket.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });

const galvanizedSteel = param('galvanizedSteel', '#77868d', { label: 'Galvanized steel' });
const polymer = param('polymer', '#315267', { label: 'Engineering polymer and cable jacket' });
presets({
  fieldSite: {
    galvanizedSteel: '#8f9b9b',
    polymer: '#263a37',
  },
  highVisibility: {
    galvanizedSteel: '#3a4b51',
    polymer: '#27363c',
  },
});

const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("cable-tray-elbow");
p.part("run-a", b(-280, 0, 0, 940, 320, 50).color(galvanizedSteel));
p.part("run-b", b(280, 280, 0, 320, 940, 50).color(galvanizedSteel));
p.part("rail-a1", b(-280, -165, 50, 940, 35, 100).color(galvanizedSteel));
p.part("rail-a2", b(-280, 165, 50, 940, 35, 100).color(galvanizedSteel));
p.part("rail-b1", b(115, 280, 50, 35, 940, 100).color(galvanizedSteel));
p.part("rail-b2", b(445, 280, 50, 35, 940, 100).color(galvanizedSteel));


p.part('cable-run-a', b(-280, -70, 82, 900, 18, 18).color(polymer));
p.part('cable-run-a-2', b(-280, 70, 82, 900, 18, 18).color(polymer));
p.part('cable-run-b', b(150, 280, 82, 18, 900, 18).color(polymer));
p.part('cable-run-b-2', b(410, 280, 82, 18, 900, 18).color(polymer));

return p.model();
