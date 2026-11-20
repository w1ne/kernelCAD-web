// SPDX-License-Identifier: CC0-1.0
// Compact plate heat exchanger with a pack of cooling plates, tie bars and four connection ports.
meta({
  name: 'plate-heat-exchanger',
  license: 'CC0-1.0',
  title: 'Plate heat exchanger',
  description: 'Compact plate heat exchanger with a pack of cooling plates, tie bars and four open face-mounted connection ports. Illustrative CC0 scene geometry; internal flow, pressure rating and manufacturing details are not verified. Controls: overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#647b84', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4ad4b', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('plate-heat-exchanger');
// Four visible circuit connections on the fixed end plate. These nominal
// dimensions identify the scene prop; they are not a vendor interface.
const portCenters = [[-55, 130], [55, 130], [-55, 500], [55, 500]];
const boreDiameter = 34;

p.part('base-frame', box(492.8, 198, 32, true).translate(0, 0, 16).scale(scale).color(safetyPaint));
p.part('fixed-end-plate', box(32, 220, 620, true)
  .holes('left', { positions: portCenters.map(([y, z]) => ({ u: y, v: z - 310 })), diameter: boreDiameter, depth: 'through' })
  .translate(-184.8, 0, 310).scale(scale).color(steel));
p.part('movable-end-plate', box(32, 220, 620, true).translate(184.8, 0, 310).scale(scale).color(safetyPaint));
p.part('heat-plate-0', box(15, 180.4, 483.6, true).translate(-140.8, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-1', box(15, 180.4, 483.6, true).translate(-107.6, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-2', box(15, 180.4, 483.6, true).translate(-74.3, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-3', box(15, 180.4, 483.6, true).translate(-41.1, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-4', box(15, 180.4, 483.6, true).translate(-7.8, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-5', box(15, 180.4, 483.6, true).translate(25.4, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-6', box(15, 180.4, 483.6, true).translate(58.7, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-7', box(15, 180.4, 483.6, true).translate(91.9, 0, 334.8).scale(scale).color(steel));
p.part('heat-plate-8', box(15, 180.4, 483.6, true).translate(125.2, 0, 334.8).scale(scale).color(steel));
p.part('tie-bar-0', box(360.8, 18, 18, true).translate(0, -66, 570.4).scale(scale).color(safetyPaint));
p.part('tie-bar-1', box(360.8, 18, 18, true).translate(0, 66, 570.4).scale(scale).color(safetyPaint));
for (const [i, [y, z]] of portCenters.entries()) {
  const neck = cylinder(62, 24, 10)
    .hole('top', { u: 0, v: 0, diameter: boreDiameter, depth: 'through' }).color(safetyPaint);
  const flange = cylinder(12, 36, 10)
    .hole('top', { u: 0, v: 0, diameter: boreDiameter, depth: 'through' })
    .translate(0, 0, 42).color(steel);
  // The neck and flange form one connected fitting. Its axis faces out of
  // the fixed plate along -X, and its open bore meets a through-hole.
  p.part(`port-${i}`, neck.union(flange).rotateY(-90)
    .translate(-200.8, y, z).scale(scale));
}

return p.model();
