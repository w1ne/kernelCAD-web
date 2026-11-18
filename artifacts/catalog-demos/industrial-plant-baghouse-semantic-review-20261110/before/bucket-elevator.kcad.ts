// SPDX-License-Identifier: CC0-1.0
// Bucket elevator with a tall casing, boot housing, head pulley cover and service ladder.
meta({
  name: 'bucket-elevator',
  license: 'CC0-1.0',
  title: 'Bucket elevator',
  description: 'Bucket elevator with a tall casing, boot housing, head pulley cover and service ladder. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#718087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#dfa747', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('bucket-elevator');
p.part('elevator-casing', box(300, 260, 777.6, true).translate(0, 0, 583.2).scale(scale).color(steel));
p.part('boot', box(465, 377, 150, true).translate(0, 0, 75).scale(scale).color(safetyPaint));
p.part('head-house', box(444, 390, 180, true).translate(0, 0, 993.6).scale(scale).color(safetyPaint));
p.part('head-shaft', cylinder(330, 36, 10).rotate([0, 1, 0], 90).translate(-165, 0, 1026).scale(scale).color(steel));
p.part('bucket-0', box(48, 52, 42, true).translate(174, -145.6, 150).scale(scale).color(safetyPaint));
p.part('bucket-1', box(48, 52, 42, true).translate(174, -145.6, 271.5).scale(scale).color(safetyPaint));
p.part('bucket-2', box(48, 52, 42, true).translate(174, -145.6, 393).scale(scale).color(safetyPaint));
p.part('bucket-3', box(48, 52, 42, true).translate(174, -145.6, 514.6).scale(scale).color(safetyPaint));
p.part('bucket-4', box(48, 52, 42, true).translate(174, -145.6, 636.1).scale(scale).color(safetyPaint));
p.part('bucket-5', box(48, 52, 42, true).translate(174, -145.6, 757.6).scale(scale).color(safetyPaint));
p.part('service-ladder-left', box(12, 18, 885.6, true).translate(-210, -148.2, 518.4).scale(scale).color(safetyPaint));
p.part('service-ladder-right', box(12, 18, 885.6, true).translate(-162, -148.2, 518.4).scale(scale).color(safetyPaint));
p.part('ladder-rung-0', box(12, 24, 10, true).translate(-186, -148.2, 90).scale(scale).color(steel));
p.part('ladder-rung-1', box(12, 24, 10, true).translate(-186, -148.2, 208.8).scale(scale).color(steel));
p.part('ladder-rung-2', box(12, 24, 10, true).translate(-186, -148.2, 327.6).scale(scale).color(steel));
p.part('ladder-rung-3', box(12, 24, 10, true).translate(-186, -148.2, 446.4).scale(scale).color(steel));
p.part('ladder-rung-4', box(12, 24, 10, true).translate(-186, -148.2, 565.2).scale(scale).color(steel));
p.part('ladder-rung-5', box(12, 24, 10, true).translate(-186, -148.2, 684).scale(scale).color(steel));
p.part('ladder-rung-6', box(12, 24, 10, true).translate(-186, -148.2, 802.8).scale(scale).color(steel));

return p.model();
