// SPDX-License-Identifier: CC0-1.0
// Bucket elevator with a front inspection cutaway that reveals buckets carried inside the casing.
meta({
  name: 'bucket-elevator',
  license: 'CC0-1.0',
  title: 'Bucket elevator',
  description: 'Bucket elevator with a tall casing, visible enclosed bucket belt, boot housing, head pulley cover and service ladder. Controls: overall scale, structural steel, safety paint, belt rubber, bucket polymer.',
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
const beltRubber = param('beltRubber', '#283238', { label: 'Belt rubber' });
const bucketPolymer = param('bucketPolymer', '#d6982d', { label: 'Bucket polymer' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f', beltRubber: '#202629', bucketPolymer: '#89643a' },
  highVisibility: { steel: '#718087', safetyPaint: '#f5c640', beltRubber: '#30373b', bucketPolymer: '#e2a52d' },
});
const p = assembly('bucket-elevator');

// A framed front inspection opening exposes the bucket loop without moving it outside the steel casing.
p.part('casing-back-panel', box(300, 20, 777.6, true).translate(0, 120, 583.2).scale(scale).color(steel));
p.part('casing-side-left', box(20, 220, 777.6, true).translate(-140, 0, 583.2).scale(scale).color(steel));
p.part('casing-side-right', box(20, 220, 777.6, true).translate(140, 0, 583.2).scale(scale).color(steel));
p.part('casing-front-left', box(74, 20, 777.6, true).translate(-113, -120, 583.2).scale(scale).color(steel));
p.part('casing-front-right', box(74, 20, 777.6, true).translate(113, -120, 583.2).scale(scale).color(steel));
p.part('inspection-panel-lower', box(152, 20, 135.6, true).translate(0, -120, 262.2).scale(scale).color(steel));
p.part('inspection-panel-upper', box(152, 20, 142, true).translate(0, -120, 901).scale(scale).color(steel));
p.part('inspection-frame-left', box(8, 20, 500, true).translate(-72, -120, 580).scale(scale).color(steel));
p.part('inspection-frame-right', box(8, 20, 500, true).translate(72, -120, 580).scale(scale).color(steel));
p.part('inspection-sill', box(152, 20, 8, true).translate(0, -120, 330).scale(scale).color(steel));
p.part('inspection-header', box(152, 20, 8, true).translate(0, -120, 830).scale(scale).color(steel));

// The belt runs over head and boot pulleys; the six open buckets attach to the rising strand.
p.part('bucket-belt-rising', box(12, 8, 380, true).translate(-25, -75, 582).scale(scale).color(beltRubber));
p.part('bucket-belt-return', box(12, 8, 380, true).translate(37, -75, 582).scale(scale).color(beltRubber));
p.part('bucket-head-pulley', cylinder(60, 30, 12).rotateX(90).translate(6, -48, 802).scale(scale).color(steel));
p.part('bucket-boot-pulley', cylinder(60, 30, 12).rotateX(90).translate(6, -48, 362).scale(scale).color(steel));

const bucketStations = [405, 478, 551, 624, 697, 770];
for (const [index, z] of bucketStations.entries()) {
  p.part(`bucket-${index}-back`, box(80, 8, 30, true).translate(-25, -82, z).scale(scale).color(bucketPolymer));
  p.part(`bucket-${index}-floor`, box(80, 44, 10, true).translate(-25, -102, z - 13).scale(scale).color(bucketPolymer));
  p.part(`bucket-${index}-left-cheek`, box(8, 44, 24, true).translate(-61, -102, z - 1).scale(scale).color(bucketPolymer));
  p.part(`bucket-${index}-right-cheek`, box(8, 44, 24, true).translate(11, -102, z - 1).scale(scale).color(bucketPolymer));
  p.part(`bucket-${index}-front-lip`, box(80, 8, 10, true).translate(-25, -118, z - 8).scale(scale).color(bucketPolymer));
}

p.part('boot', box(465, 377, 150, true).translate(0, 0, 75).scale(scale).color(safetyPaint));
p.part('head-house', box(444, 390, 180, true).translate(0, 0, 993.6).scale(scale).color(safetyPaint));
p.part('head-shaft', cylinder(330, 36, 10).rotate([0, 1, 0], 90).translate(-165, 0, 1026).scale(scale).color(steel));
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
