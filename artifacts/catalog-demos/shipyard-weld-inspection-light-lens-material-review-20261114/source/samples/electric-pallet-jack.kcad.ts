// SPDX-License-Identifier: CC0-1.0
// Walk-behind electric pallet jack with twin forks, steer tiller, battery case and load rollers.
meta({
  name: 'electric-pallet-jack',
  license: 'CC0-1.0',
  title: 'Electric pallet jack',
  description: 'Walk-behind electric pallet jack with twin forks, steer tiller, battery case and load rollers. Controls: overall scale, steel, safety paint, rubber.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'vehicle',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#758087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e1a33b', { label: 'Safety paint' });
const rubber = param('rubber', '#30363a', { label: 'Rubber' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', rubber: '#27292b' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('electric-pallet-jack');
p.part('pump-body', box(190, 210, 85, true).translate(-249.6, 0, 60).translate(0, 0, 20).scale(scale).color(safetyPaint));
p.part('fork--1', box(655.2, 58, 42, true).translate(39, -81, 50).translate(0, 0, 20).scale(scale).color(steel));
p.part('load-roller--1', cylinder(32, 38, 8).rotate([1, 0, 0], 90).translate(374.4, -65, 38).translate(0, 0, 20).scale(scale).color(rubber));
p.part('fork-1', box(655.2, 58, 42, true).translate(39, 81, 50).translate(0, 0, 20).scale(scale).color(steel));
p.part('load-roller-1', cylinder(32, 38, 8).rotate([1, 0, 0], 90).translate(374.4, 97, 38).translate(0, 0, 20).scale(scale).color(rubber));
p.part('tiller-base', box(55, 58, 110, true).translate(-312, 0, 120).translate(0, 0, 20).scale(scale).color(steel));
p.part('tiller-shaft', box(30, 30, 217, true).rotate([0, 1, 0], -18).translate(-351, 0, 170.5).translate(0, 0, 20).scale(scale).color(safetyPaint));
p.part('tiller-grip', box(180, 45, 45, true).translate(-429, 0, 285.2).translate(0, 0, 20).scale(scale).color(steel));
p.part('steer-wheel', cylinder(42, 68, 8).rotate([1, 0, 0], 90).translate(-234, 21, 48).translate(0, 0, 20).scale(scale).color(rubber));

return p.model();
