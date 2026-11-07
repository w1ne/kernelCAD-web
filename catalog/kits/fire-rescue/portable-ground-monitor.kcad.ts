// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly portable ground monitor scene prop, modeled from scratch.
meta({
  name: "portable-ground-monitor",
  license: 'CC0-1.0',
  title: "Portable ground monitor",
  description: "Ground monitor with twin feet, swiveling barrel and directional hand wheels. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("portable-ground-monitor");
const groundOffset = -18;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("base-feet", box(360, 280, 36, true).translate(0, 0, 36), body);
add("stabilizer-foot--1", box(450, 45, 48, true).translate(0, -180, 49), accent);
add("stabilizer-foot-1", box(450, 45, 48, true).translate(0, 180, 49), accent);
add("swivel-pedestal", cylinder(120, 64, 8).translate(0, 0, 48), accent);
add("elevation-yoke", box(70, 180, 180, true).translate(0, 0, 265), body);
add("monitor-barrel", cylinder(420, 50, 10).rotate([0, 1, 0], 90).translate(120, 0, 230), accent);
add("nozzle-tip", cylinder(120, 32, 10).rotate([0, 1, 0], 90).translate(350, 0, 230), body);
add("handwheel--1", cylinder(24, 50, 8).rotate([1, 0, 0], 90).translate(0, -145, 192), accent);
add("handwheel-1", cylinder(24, 50, 8).rotate([1, 0, 0], 90).translate(0, 145, 192), accent);

return p.model();
