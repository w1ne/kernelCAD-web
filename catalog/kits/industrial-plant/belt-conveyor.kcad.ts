// SPDX-License-Identifier: CC0-1.0
// A raised conveyor with a continuous rubber belt, transverse rollers, guarded
// steel frame, braced support stations and an end-mounted drive motor.
meta({
  name: 'belt-conveyor',
  license: 'CC0-1.0',
  title: 'Belt conveyor',
  description: 'Straight conveyor with a rubber belt, transverse rollers, guarded frame, adjustable support stations and drive motor. Controls: scale, support stations, frame steel, belt rubber, roller steel, safety paint.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const supportStations = param('supportStations', '3', { choices: ['2', '3', '4'], label: 'Support stations' });
const frameSteel = param('frameSteel', '#687b83', { label: 'Structural steel' });
const beltRubber = param('beltRubber', '#292f32', { label: 'Belt rubber' });
const rollerSteel = param('rollerSteel', '#a7b0b2', { label: 'Roller steel' });
const safetyPaint = param('safetyPaint', '#e2a744', { label: 'Safety paint' });

presets({
  weathered: { frameSteel: '#575851', beltRubber: '#292927', rollerSteel: '#89877f', safetyPaint: '#9e722f' },
  highVisibility: { frameSteel: '#485c65', beltRubber: '#252a2c', rollerSteel: '#c0c7c8', safetyPaint: '#f5c640' },
  cleanPlant: { frameSteel: '#536d75', beltRubber: '#23292b', rollerSteel: '#adb8ba', safetyPaint: '#d46538' },
});

const stationCount = Number(supportStations.value);
const stationXs = Array.from({ length: stationCount }, (_, i) =>
  stationCount === 1 ? 0 : -372 + (744 * i) / (stationCount - 1),
);
const p = assembly('belt-conveyor');

// Two continuous stringers carry the bed; yellow guide lips sit just above the belt.
for (const side of [-1, 1]) {
  p.part(`side-stringer-${side}`, box(980, 28, 52, true).translate(0, side * 151, 300).scale(scale).color(frameSteel));
  p.part(`belt-guide-${side}`, box(930, 10, 42, true).translate(0, side * 128, 441).scale(scale).color(safetyPaint));
}
p.part('conveyor-deck', box(980, 270, 22, true).translate(0, 0, 390).scale(scale).color(frameSteel));
p.part('belt-surface', box(924, 242, 16, true).translate(0, 0, 417).scale(scale).color(beltRubber));
p.part('return-belt', box(900, 238, 10, true).translate(0, 0, 326).scale(scale).color(beltRubber));
p.part('tail-end-stop', box(18, 270, 66, true).translate(481, 0, 429).scale(scale).color(safetyPaint));

// The end drums and intermediate idlers span the belt width on a common Y axis.
const transverseRoller = (name: string, x: number, z: number, radius: number) => {
  const roller = cylinder(260, radius, 12).translate(0, 0, -130).rotate([1, 0, 0], 90).translate(x, 0, z).scale(scale);
  p.part(name, roller.color(rollerSteel));
};
transverseRoller('head-drum', 458, 414, 22);
transverseRoller('tail-drum', -458, 414, 22);
for (let i = 0; i < 7; i++) {
  const x = -330 + i * 110;
  transverseRoller(`carrying-idler-${i + 1}`, x, 402, 16);
}
for (let i = 0; i < 5; i++) {
  const x = -260 + i * 130;
  transverseRoller(`return-idler-${i + 1}`, x, 342, 12);
}

// Each station has a pair of long legs, a cross tie and broad feet.
for (const [i, x] of stationXs.entries()) {
  for (const side of [-1, 1]) {
    p.part(`support-leg-${i + 1}-${side}`, box(28, 28, 364, true).translate(x, side * 112, 199).scale(scale).color(frameSteel));
    p.part(`support-foot-${i + 1}-${side}`, box(76, 70, 18, true).translate(x, side * 112, 9).scale(scale).color(frameSteel));
  }
  p.part(`support-cross-tie-${i + 1}`, box(22, 250, 20, true).translate(x, 0, 185).scale(scale).color(frameSteel));
}

// A guarded gearmotor drives the head drum from the service side.
p.part('drive-gearbox', box(92, 88, 84, true).translate(505, -90, 348).scale(scale).color(safetyPaint));
p.part('drive-motor', cylinder(118, 42, 12).translate(0, 0, -59).rotate([0, 1, 0], 90).translate(526, -90, 348).scale(scale).color(frameSteel));
p.part('motor-fan-cover', cylinder(18, 45, 12).translate(0, 0, -9).rotate([0, 1, 0], 90).translate(585, -90, 348).scale(scale).color(rollerSteel));

return p.model();
