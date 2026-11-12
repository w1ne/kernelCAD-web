// SPDX-License-Identifier: CC0-1.0
// Towable light tower with a wheeled generator trailer, telescoping mast,
// adjustable lamp bank and four stabilizer jacks. Generic visualization geometry, millimetres, Z up.
meta({
  name: "towable-light-tower",
  license: 'CC0-1.0',
  title: "Towable site light tower",
  description: "Trailer-mounted generator enclosure with telescoping mast, selectable lamp bank and four stabilizer jacks. Material controls: equipment enamel, structural steel, rubber and light lenses; mast height and lamp count choices; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const mastHeight = param('mastHeight', '1800', {
  choices: ['1200', '1800', '2400'],
  label: 'Mast extension (mm)',
});
const lampCount = param('lampCount', '4', {
  choices: ['2', '4', '6'],
  label: 'Lamp heads',
});
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Structural steel' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire rubber' });
const lampLensColor = param('lampLensColor', '#f2dfaa', { label: 'Light lenses' });
presets({
  weathered: {
    equipmentPaintColor: '#a87b36',
    structuralSteelColor: '#716b61',
    tireRubberColor: '#3a3a37',
    lampLensColor: '#dbc99a',
  },
  highVisibility: {
    equipmentPaintColor: '#f06b26',
    structuralSteelColor: '#c1c7c2',
    tireRubberColor: '#292e31',
    lampLensColor: '#fff1c4',
  },
});

const mastH = Number(mastHeight.value);
const headCount = Number(lampCount.value);
const mastBaseX = 230;
const mastTopZ = 570 + mastH;
const p = assembly('towable-light-tower');
const add = (name, shape, finish = equipmentPaintColor) =>
  p.part(name, shape.scale(scale).color(finish));

// Low road trailer, enclosed generator, tandem-side wheels and tow tongue.
add('trailer-deck', box(930, 580, 64, true).translate(0, 0, 100), structuralSteelColor);
add('trailer-frame-front', box(875, 52, 64, true).translate(0, -236, 67), structuralSteelColor);
add('trailer-frame-rear', box(875, 52, 64, true).translate(0, 236, 67), structuralSteelColor);
add('generator-enclosure', box(430, 350, 280, true).translate(-180, 0, 272), equipmentPaintColor);
add('enclosure-service-door', box(16, 210, 176, true).translate(42, -184, 276), structuralSteelColor);
for (let i = 0; i < 6; i += 1) {
  add('enclosure-vent-' + (i + 1), box(7, 112, 9, true).translate(54, -184, 218 + i * 20), equipmentPaintColor);
}
add('exhaust-stack', cylinder(128, 16, 10).translate(-326, 118, 412), structuralSteelColor);
add('stack-cap', cylinder(16, 25, 10).translate(-326, 118, 532), structuralSteelColor);
add('generator-control-box', box(118, 74, 96, true).translate(-75, -210, 328), structuralSteelColor);
add('control-display', box(58, 6, 30, true).translate(-75, -250, 338), lampLensColor);
add('road-wheel-near', cylinder(85, 145, 14).rotateX(90).translate(0, -255, 145), tireRubberColor);
add('road-wheel-far', cylinder(85, 145, 14).rotateX(-90).translate(0, 255, 145), tireRubberColor);
add('wheel-hub-near', cylinder(24, 68, 12).rotateX(90).translate(0, -315, 145), structuralSteelColor);
add('wheel-hub-far', cylinder(24, 68, 12).rotateX(-90).translate(0, 315, 145), structuralSteelColor);
add('tow-tongue', box(420, 82, 58, true).translate(635, 0, 94), structuralSteelColor);
add('tow-coupler', box(92, 118, 62, true).translate(875, 0, 96), structuralSteelColor);
add('coupler-latch', box(90, 26, 32, true).translate(875, 0, 138), equipmentPaintColor);
add('safety-chain-left', cylinder(76, 8, 8).rotateY(90).translate(738, -56, 70), structuralSteelColor);
add('safety-chain-right', cylinder(76, 8, 8).rotateY(90).translate(738, 56, 70), structuralSteelColor);

// Cross-outriggers terminate in four adjustable screw jacks and ground pads.
add('stabilizer-outrigger-near', box(1360, 45, 42, true).translate(0, -380, 38), structuralSteelColor);
add('stabilizer-outrigger-far', box(1360, 45, 42, true).translate(0, 380, 38), structuralSteelColor);
for (const x of [-620, 620]) {
  for (const y of [-380, 380]) {
    const tag = (x < 0 ? 'rear' : 'front') + '-' + (y < 0 ? 'near' : 'far');
    add('jack-post-' + tag, cylinder(210, 18, 10).translate(x, y, 18), structuralSteelColor);
    add('jack-collar-' + tag, cylinder(34, 31, 10).translate(x, y, 188), equipmentPaintColor);
    add('jack-foot-' + tag, box(128, 108, 20, true).translate(x, y, 10), structuralSteelColor);
  }
}

// Two-stage mast with its hand winch, crossbar, and individually visible lamps.
add('mast-base-pedestal', box(250, 246, 136, true).translate(mastBaseX, 0, 156), equipmentPaintColor);
add('mast-lower-section', cylinder(450, 52, 12).translate(mastBaseX, 0, 150), structuralSteelColor);
add('mast-telescoping-section', cylinder(mastH, 30, 12).translate(mastBaseX, 0, 570), structuralSteelColor);
add('mast-winching-drum', cylinder(92, 43, 12).rotateX(90).translate(mastBaseX - 82, -40, 251), structuralSteelColor);
add('mast-winch-handle', box(116, 20, 20, true).translate(mastBaseX - 82, -112, 251), equipmentPaintColor);
add('mast-crossbar', box((headCount - 1) * 175 + 260, 60, 38, true).translate(mastBaseX, 0, mastTopZ + 30), structuralSteelColor);
for (let i = 0; i < headCount; i += 1) {
  const headX = mastBaseX + (i - (headCount - 1) / 2) * 175;
  const suffix = '-' + (i + 1);
  add('lamp-yoke' + suffix, box(30, 32, 68, true).translate(headX, 0, mastTopZ + 74), structuralSteelColor);
  add('lamp-housing' + suffix, box(146, 74, 94, true).translate(headX, 0, mastTopZ + 145), equipmentPaintColor);
  add('lamp-front-lens' + suffix, box(108, 8, 60, true).translate(headX, -40, mastTopZ + 145), lampLensColor);
  add('lamp-side-cap' + suffix, box(10, 70, 84, true).translate(headX + 76, 0, mastTopZ + 145), structuralSteelColor);
}

return p.model();
