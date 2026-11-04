// SPDX-License-Identifier: CC0-1.0
// Ground monitor with twin feet, swiveling barrel and directional hand wheels. Material controls: tool coating, safety marking, steel and aluminum; weathered and highVisibility presets.
meta({
  name: "portable-ground-monitor",
  license: 'CC0-1.0',
  title: "Portable ground monitor",
  description: "Ground monitor with twin feet, swiveling barrel and directional hand wheels. Material controls: tool coating, safety marking, steel and aluminum; weathered and highVisibility presets.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const toolCoatingColor = param('toolCoatingColor', '#d98727', { label: 'Tool coating' });
const safetyMarkingColor = param('safetyMarkingColor', '#c83730', { label: 'Safety marking' });
const steelColor = param('steelColor', '#aab5b9', { label: 'Steel and aluminum' });
presets({
  weathered: { toolCoatingColor: '#956438', safetyMarkingColor: '#874e49', steelColor: '#858f92' },
  highVisibility: { toolCoatingColor: '#e8b331', safetyMarkingColor: '#f0db56', steelColor: '#c3c6b6' },
});
const p = assembly("portable-ground-monitor");
const groundOffset = -18;
const add = (name, shape, finish = toolCoatingColor) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("base-feet", box(360, 280, 36, true).translate(0, 0, 36), toolCoatingColor);
add("stabilizer-foot--1", box(450, 45, 48, true).translate(0, -180, 49), safetyMarkingColor);
add("stabilizer-foot-1", box(450, 45, 48, true).translate(0, 180, 49), safetyMarkingColor);
add("swivel-pedestal", cylinder(120, 64, 8).translate(0, 0, 48), safetyMarkingColor);
add("elevation-yoke", box(70, 180, 180, true).translate(0, 0, 265), toolCoatingColor);
add("monitor-barrel", cylinder(420, 50, 10).rotateY(90).translate(120, 0, 230), safetyMarkingColor);
add("nozzle-tip", cylinder(120, 32, 10).rotateY(90).translate(350, 0, 230), steelColor);
add("handwheel--1", cylinder(24, 50, 8).rotateX(90).translate(0, -145, 192), safetyMarkingColor);
add("handwheel-1", cylinder(24, 50, 8).rotateX(90).translate(0, 145, 192), safetyMarkingColor);

return p.model();
