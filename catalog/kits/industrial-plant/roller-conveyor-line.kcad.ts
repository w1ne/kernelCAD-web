// SPDX-License-Identifier: CC0-1.0
// Gravity roller conveyor scene section: transverse rollers between connected side frames.
// Millimetres, Z up. Illustrative geometry, not a load-rated production conveyor.
meta({
  name: 'roller-conveyor-line',
  license: 'CC0-1.0',
  title: 'Roller conveyor line',
  description: 'Gravity roller conveyor section with nine separate transverse rollers on axles, connected side frames, six support feet and two end stops. Generic visualization prop, not load-rated manufacturing CAD. Controls: overall scale, steel and safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#707f84', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e4ab47', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});
const p = assembly('roller-conveyor-line');
const add = (name, shape, finish = steel) =>
  p.part(name, shape.scale(scale).color(finish));

// Legs sit on the feet and reach the side frames without vertical or lateral gaps.
const railY = 165.6;
const railBottom = 274;
const footTop = 18;
const supportHeight = railBottom - footTop;
const stations = [-349.6, 0, 349.6];
for (const side of [-1, 1]) {
  add(`side-frame-${side}`, box(920, 30, 55, true).translate(0, side * railY, railBottom + 27.5), safetyPaint);
  for (const [station, x] of stations.entries()) {
    add(`support-${side}-${station}`, box(26, 26, supportHeight, true)
      .translate(x, side * railY, footTop + supportHeight / 2));
    add(`foot-${side}-${station}`, box(74, 70, footTop, true)
      .translate(x, side * railY, footTop / 2), safetyPaint);
  }
}
for (const [station, x] of stations.entries()) {
  add(`cross-tie-${station}`, box(26, 2 * railY, 26, true).translate(x, 0, railBottom - 13));
}

// Travel is along X. Each roller turns about Y and leaves an open gap to its neighbours.
// The roller shell ends clear of the rail inner faces; the longer axle reaches the frames.
for (let index = 0; index < 9; index += 1) {
  const x = (index - 4) * 96.6;
  add(`roller-${index}`, cylinder(300, 22, 8).rotateX(90).translate(x, 150, 324));
  add(`roller-axle-${index}`, cylinder(2 * railY, 6, 8).rotateX(90).translate(x, railY, 324));
}
for (const side of [-1, 1]) {
  add(`end-stop-${side}`, box(24, 2 * railY + 30, 32, true)
    .translate(side * 444, 0, 340), safetyPaint);
}

return p.model();
