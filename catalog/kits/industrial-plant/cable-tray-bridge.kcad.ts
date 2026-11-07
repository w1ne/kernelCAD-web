// SPDX-License-Identifier: CC0-1.0
// Raised cable tray bridge with perforated-looking rails, crossbars and two support frames.
meta({
  name: 'cable-tray-bridge',
  license: 'CC0-1.0',
  title: 'Cable tray bridge',
  description: 'Raised cable tray bridge with perforated-looking rails, crossbars and two support frames. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#718087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dda743', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('cable-tray-bridge');
p.part('side-rail--1', box(940, 26, 42, true).translate(0, -165, 320).scale(scale).color(safetyPaint));
p.part('support-upright--1', box(30, 30, 320, true).translate(0, -165, 160).scale(scale).color(steel));
p.part('foot--1', box(110, 60, 20, true).translate(0, -165, 10).scale(scale).color(safetyPaint));
p.part('side-rail-1', box(940, 26, 42, true).translate(0, 165, 320).scale(scale).color(safetyPaint));
p.part('support-upright-1', box(30, 30, 320, true).translate(0, 165, 160).scale(scale).color(steel));
p.part('foot-1', box(110, 60, 20, true).translate(0, 165, 10).scale(scale).color(safetyPaint));
p.part('tray-rung-0', box(26, 330, 14, true).translate(-432.4, 0, 320).scale(scale).color(steel));
p.part('tray-rung-1', box(26, 330, 14, true).translate(-308.9, 0, 320).scale(scale).color(steel));
p.part('tray-rung-2', box(26, 330, 14, true).translate(-185.3, 0, 320).scale(scale).color(steel));
p.part('tray-rung-3', box(26, 330, 14, true).translate(-61.8, 0, 320).scale(scale).color(steel));
p.part('tray-rung-4', box(26, 330, 14, true).translate(61.8, 0, 320).scale(scale).color(steel));
p.part('tray-rung-5', box(26, 330, 14, true).translate(185.3, 0, 320).scale(scale).color(steel));
p.part('tray-rung-6', box(26, 330, 14, true).translate(308.9, 0, 320).scale(scale).color(steel));
p.part('tray-rung-7', box(26, 330, 14, true).translate(432.4, 0, 320).scale(scale).color(steel));

return p.model();
