// SPDX-License-Identifier: CC0-1.0
// Survey tripod with compact rotating laser head and control panel.
meta({
  name: "laser-level-tripod",
  license: 'CC0-1.0',
  title: "Laser level and tripod",
  description: "Survey tripod with compact rotating laser head and control panel. Material controls: cab glass, equipment enamel paint; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cabGlassColor = param('cabGlassColor', '#77a4b0', { label: 'Cab glass' });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
presets({
  weathered: { cabGlassColor: '#66858b', equipmentPaintColor: '#a87b36' },
  highVisibility: { cabGlassColor: '#91bdc6', equipmentPaintColor: '#f06b26' },
});
const p = assembly('laser-level-tripod');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('tripod-leg-0', box(38, 38, 1076.4, true).translate(81.6, 0, 538.2), equipmentPaintColor);
add('tripod-leg-1', box(38, 38, 1076.4, true).translate(-40.8, 70.668, 538.2), equipmentPaintColor);
add('tripod-leg-2', box(38, 38, 1076.4, true).translate(-40.8, -70.668, 538.2), equipmentPaintColor);
add('tripod-column', cylinder(358.8, 38, 8).translate(0, 0, 897), equipmentPaintColor);
add('head-plate', box(168, 168, 45, true).translate(0, 0, 1264.5), equipmentPaintColor);
add('laser-head', cylinder(170, 115, 12).translate(0, 0, 1283.4), equipmentPaintColor);
add('display', box(100, 26, 58, true).translate(0, -57.6, 1353.8), cabGlassColor);

return p.model();
