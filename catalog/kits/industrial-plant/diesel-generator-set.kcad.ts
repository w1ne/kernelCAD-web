// SPDX-License-Identifier: CC0-1.0
// A packaged generator with a painted acoustic enclosure, real radiator louvers,
// isolated skid mounts, access door and a tall exhaust stack.
meta({
  name: 'diesel-generator-set',
  license: 'CC0-1.0',
  title: 'Diesel generator set',
  description: 'Packaged generator with radiator louvers, isolated skid mounts, service access and exhaust. Controls: scale, louver count, enclosure paint, structural steel, radiator core, rubber mounts.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const louverCount = param('louverCount', '8', { choices: ['6', '8', '10'], label: 'Radiator louvers' });
const enclosurePaint = param('enclosurePaint', '#587a78', { label: 'Enclosure paint' });
const steel = param('steel', '#879398', { label: 'Structural steel' });
const radiatorCore = param('radiatorCore', '#303a3e', { label: 'Radiator core' });
const rubber = param('rubber', '#292d2f', { label: 'Rubber mounts' });

presets({
  weathered: { enclosurePaint: '#655b4e', steel: '#8a8377', radiatorCore: '#393a38', rubber: '#252525' },
  highVisibility: { enclosurePaint: '#d96f3d', steel: '#c2c7c7', radiatorCore: '#303a3e', rubber: '#202426' },
  cleanPlant: { enclosurePaint: '#416e68', steel: '#b5bec0', radiatorCore: '#263338', rubber: '#24292b' },
});

const louvers = Number(louverCount.value);
const p = assembly('diesel-generator-set');

// The base rails sit on four vibration isolators instead of merging into the housing.
p.part('base-skid', box(880, 430, 42, true).translate(0, 0, 21).scale(scale).color(steel));
for (const x of [-305, 305]) {
  for (const y of [-137, 137]) {
    p.part(`vibration-mount-${x}-${y}`, box(54, 46, 24, true).translate(x, y, 53).scale(scale).color(rubber));
  }
}

// The acoustic cabinet leaves room for a radiator intake on its service end.
p.part('generator-enclosure', box(740, 370, 360, true).translate(0, 0, 245).scale(scale).color(enclosurePaint));
p.part('radiator-core', box(208, 12, 240, true).translate(-260, -187, 245).scale(scale).color(radiatorCore));
p.part('radiator-frame-left', box(12, 20, 264, true).translate(-366, -193, 245).scale(scale).color(steel));
p.part('radiator-frame-right', box(12, 20, 264, true).translate(-154, -193, 245).scale(scale).color(steel));
p.part('radiator-frame-top', box(220, 20, 12, true).translate(-260, -193, 371).scale(scale).color(steel));
p.part('radiator-frame-bottom', box(220, 20, 12, true).translate(-260, -193, 119).scale(scale).color(steel));
const louverPitch = 232 / (louvers + 1);
for (let i = 0; i < louvers; i++) {
  const z = 129 + louverPitch * (i + 1);
  p.part(`radiator-louver-${i + 1}`, box(208, 10, 8, true).translate(-260, -203, z).scale(scale).color(steel));
}

// A separate door, hinges, latch and instrument panel make the service side legible.
p.part('service-door', box(180, 12, 260, true).translate(-55, -190, 245).scale(scale).color(enclosurePaint));
p.part('service-door-hinge-upper', box(12, 14, 48, true).translate(-144, -201, 325).scale(scale).color(steel));
p.part('service-door-hinge-lower', box(12, 14, 48, true).translate(-144, -201, 165).scale(scale).color(steel));
p.part('door-latch', box(14, 16, 52, true).translate(30, -203, 245).scale(scale).color(steel));
p.part('control-panel', box(114, 18, 142, true).translate(224, -190, 251).scale(scale).color(steel));
p.part('control-panel-display', box(62, 5, 42, true).translate(224, -202, 278).scale(scale).color(radiatorCore));
for (let i = 0; i < 3; i++) {
  p.part(`control-button-${i + 1}`, cylinder(8, 7, 10).rotate([1, 0, 0], 90).translate(201 + i * 23, -211, 224).scale(scale).color(enclosurePaint));
}

// The exhaust rises above the enclosure and has a rain cap at its tip.
p.part('exhaust-stack', cylinder(176, 22, 12).translate(-276, 102, 425).scale(scale).color(steel));
p.part('exhaust-rain-cap', cylinder(18, 34, 12).translate(-276, 102, 601).scale(scale).color(radiatorCore));
p.part('exhaust-muffler', cylinder(52, 38, 12).translate(-276, 102, 445).scale(scale).color(steel));

return p.model();
