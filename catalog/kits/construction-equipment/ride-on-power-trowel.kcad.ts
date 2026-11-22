// SPDX-License-Identifier: CC0-1.0
// Ride-on concrete finishing machine with two open rotor guards, radial blade shoes,
// engine, operator seat and twin steering levers. Low-poly visualization geometry in millimetres, Z up.
meta({
  name: "ride-on-power-trowel",
  license: 'CC0-1.0',
  title: "Ride-on power trowel",
  description: "Rider concrete finisher with twin guarded rotors, visible blade shoes, engine, bucket seat and paired control levers. Material controls: equipment enamel, structural steel, rubber grips and seat vinyl; selectable rotor diameter and blade count; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const bladeCount = param('bladeCount', '6', {
  choices: ['4', '6'],
  label: 'Blades per rotor',
});
const rotorSize = param('rotorSize', 'standard', {
  choices: ['compact', 'standard', 'wide'],
  label: 'Rotor diameter',
});
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Structural steel' });
const rubberColor = param('rubberColor', '#303638', { label: 'Rubber grips' });
const seatVinylColor = param('seatVinylColor', '#32383a', { label: 'Seat vinyl' });
presets({
  weathered: {
    equipmentPaintColor: '#a87b36',
    structuralSteelColor: '#716b61',
    rubberColor: '#3c403e',
    seatVinylColor: '#41403b',
  },
  highVisibility: {
    equipmentPaintColor: '#f06b26',
    structuralSteelColor: '#c1c7c2',
    rubberColor: '#292e31',
    seatVinylColor: '#252a2d',
  },
});

const bladeN = Number(bladeCount.value);
const rotorGeometry = {
  compact: { center: 235, guardRadius: 218, innerRadius: 168, bladeRadius: 115, bladeLength: 100 },
  standard: { center: 270, guardRadius: 252, innerRadius: 202, bladeRadius: 144, bladeLength: 118 },
  wide: { center: 300, guardRadius: 280, innerRadius: 220, bladeRadius: 155, bladeLength: 126 },
}[rotorSize.value];
const p = assembly('ride-on-power-trowel');
const add = (name, shape, finish = equipmentPaintColor) =>
  p.part(name, shape.scale(scale).color(finish));
const rotorCenters = [-rotorGeometry.center, rotorGeometry.center];

// The two guard rings leave an open center so the blade pattern and gearbox read
// as separate working assemblies rather than solid discs below a flat platform.
for (let rotor = 0; rotor < rotorCenters.length; rotor += 1) {
  const cx = rotorCenters[rotor];
  const side = rotor === 0 ? 'left' : 'right';
  const ring = cylinder(50, rotorGeometry.guardRadius, 18).subtract(
    cylinder(52, rotorGeometry.innerRadius, 18).translate(0, 0, -1),
  );
  add('rotor-guard-' + side, ring.translate(cx, 0, 34), structuralSteelColor);
  add('rotor-gearbox-' + side, cylinder(70, 84, 14).translate(cx, 0, 52), equipmentPaintColor);
  add('rotor-output-shaft-' + side, cylinder(58, 24, 10).translate(cx, 0, 0), structuralSteelColor);
  for (let blade = 0; blade < bladeN; blade += 1) {
    const angle = (360 * blade) / bladeN + 18;
    add(
      'blade-shoe-' + side + '-' + (blade + 1),
      box(rotorGeometry.bladeLength, 24, 12, true).translate(rotorGeometry.bladeRadius, 0, 0).rotateZ(angle).translate(cx, 0, 46),
      structuralSteelColor,
    );
  }
  add('rotor-support-arm-' + side, box(250, 58, 38, true).translate(cx / 2, 0, 130), structuralSteelColor);
}

// A narrow bridge carries the operator, controls and engine above the two pans.
add('central-chassis-spine', box(360, 148, 72, true).translate(0, 0, 154), equipmentPaintColor);
add('chassis-crossmember-near', box(220, 38, 46, true).translate(-145, -98, 133), structuralSteelColor);
add('chassis-crossmember-far', box(220, 38, 46, true).translate(-145, 98, 133), structuralSteelColor);
add('operator-footplate', box(190, 180, 26, true).translate(105, 0, 201), equipmentPaintColor);
add('rear-engine-housing', box(224, 204, 154, true).translate(-157, 0, 294), equipmentPaintColor);
add('engine-side-panel', box(12, 158, 112, true).translate(-157, -108, 294), structuralSteelColor);
for (let i = 0; i < 7; i += 1) {
  add('engine-vent-' + (i + 1), box(8, 12, 98, true).translate(-157, -117, 247 + i * 15), equipmentPaintColor);
}
add('engine-intake', cylinder(66, 36, 12).rotateX(90).translate(-246, -137, 328), structuralSteelColor);
add('exhaust-riser', cylinder(106, 14, 10).translate(-238, 78, 370), structuralSteelColor);
add('exhaust-muffler', cylinder(86, 24, 12).rotateX(90).translate(-238, 62, 450), structuralSteelColor);

// The operator sits between the engine and the paired forward steering levers.
add('seat-post', cylinder(125, 22, 10).translate(65, 0, 207), structuralSteelColor);
add('seat-frame', box(190, 156, 28, true).translate(65, 0, 342), structuralSteelColor);
add('seat-cushion', box(184, 156, 52, true).translate(65, 0, 382), seatVinylColor);
add('seat-back-shell', box(172, 58, 146, true).rotateX(-12).translate(65, 68, 467), seatVinylColor);
add('seat-back-pad', box(146, 18, 104, true).rotateX(-12).translate(65, 28, 471), rubberColor);
add('control-console', box(192, 230, 80, true).translate(203, 0, 226), equipmentPaintColor);
add('console-display', box(122, 8, 42, true).translate(203, -118, 245), structuralSteelColor);
add('console-screen', box(80, 6, 22, true).translate(203, -124, 247), seatVinylColor);
for (const y of [-72, 72]) {
  const side = y < 0 ? 'near' : 'far';
  add('steering-lever-' + side, cylinder(205, 10, 10).rotateY(18).translate(170, y, 265), structuralSteelColor);
  add('steering-grip-' + side, box(106, 28, 27, true).translate(214, y, 454), rubberColor);
  add('footrest-' + side, box(148, 74, 22, true).translate(208, y * 1.55, 107), rubberColor);
}
add('operator-step', box(210, 270, 30, true).translate(58, 0, 116), structuralSteelColor);
add('rear-light', box(74, 40, 52, true).translate(-258, 0, 219), seatVinylColor);

return p.model();
