// SPDX-License-Identifier: CC0-1.0
// Compact plate heat exchanger with a pack of cooling plates, tie bars and four connection ports.
meta({
  name: 'plate-heat-exchanger',
  license: 'CC0-1.0',
  title: 'Plate heat exchanger',
  description: 'Compact plate heat exchanger with a pack of cooling plates, tie bars and four open face-mounted connection ports. Illustrative CC0 scene geometry; internal flow, pressure rating and manufacturing details are not verified. Controls: plate count, plate height, overall scale, steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const plateCount = param('plateCount', '9', { label: 'Plate count', choices: ['5', '9', '13'] });
const plateHeight = param('plateHeight', 620, { label: 'Plate height', unit: 'mm', min: 480, max: 800, step: 10 });
const count = Number(plateCount.value);
const endX = (count - 1) * 33.25 / 2 + 51.8;
const steel = param('steel', '#647b84', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4ad4b', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('plate-heat-exchanger');
// Four visible circuit connections on the fixed end plate. These nominal
// dimensions identify the scene prop; they are not a vendor interface.
const portCenters = [[-55, plateHeight * 130 / 620], [55, plateHeight * 130 / 620],
  [-55, plateHeight * 500 / 620], [55, plateHeight * 500 / 620]];
const boreDiameter = 34;

p.part('base-frame', box(2 * endX + 123.2, 198, 32, true).translate(0, 0, 16).scale(scale).color(safetyPaint));
p.part('fixed-end-plate', box(32, 220, plateHeight, true)
  .holes('left', { positions: portCenters.map(([y, z]) => ({ u: y, v: z - plateHeight / 2 })), diameter: boreDiameter, depth: 'through' })
  .translate(-endX, 0, plateHeight / 2).scale(scale).color(steel));
p.part('movable-end-plate', box(32, 220, plateHeight, true).translate(endX, 0, plateHeight / 2).scale(scale).color(safetyPaint));
for (let i = 0; i < count; i++) {
  const x = (i - (count - 1) / 2) * 33.25 - 7.8;
  p.part(`heat-plate-${i}`, box(15, 180.4, plateHeight * .78, true)
    .translate(x, 0, plateHeight * .54).scale(scale).color(steel));
}
p.part('tie-bar-0', box(2 * endX - 8.8, 18, 18, true).translate(0, -66, plateHeight * .92).scale(scale).color(safetyPaint));
p.part('tie-bar-1', box(2 * endX - 8.8, 18, 18, true).translate(0, 66, plateHeight * .92).scale(scale).color(safetyPaint));
for (const [i, [y, z]] of portCenters.entries()) {
  const neck = cylinder(62, 24, 10)
    .hole('top', { u: 0, v: 0, diameter: boreDiameter, depth: 'through' }).color(safetyPaint);
  const flange = cylinder(12, 36, 10)
    .hole('top', { u: 0, v: 0, diameter: boreDiameter, depth: 'through' })
    .translate(0, 0, 42).color(steel);
  // The neck and flange form one connected fitting. Its axis faces out of
  // the fixed plate along -X, and its open bore meets a through-hole.
  p.part(`port-${i}`, neck.union(flange).rotateY(-90)
    .translate(-endX - 16, y, z).scale(scale));
}

return p.model();
