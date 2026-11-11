// SPDX-License-Identifier: CC0-1.0
// Compact external-gear pump package. The gear-pump casing and bolted circular
// service cover distinguish the pumping head from the drive motor; the two
// raised flanged ports and the relief return line identify its fluid side.
meta({
  name: 'positive-displacement-pump',
  license: 'CC0-1.0',
  title: 'Positive displacement pump',
  description: 'Compact external-gear pump scene prop with a horizontal electric motor, guarded coupling, bolted circular pump-head cover, raised suction and discharge flanges, a relief valve and return line, and a steel skid. Controls: overall scale, pump steel, motor enamel and safety finish.',
  tags: ['industrial plant', 'factory', 'process equipment', 'gear pump', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#647985', { label: 'Pump casing and pipe metal' });
const motorPaint = param('motorPaint', '#315c4a', { label: 'Drive motor enamel' });
const safetyPaint = param('safetyPaint', '#e2a747', { label: 'Skid and safety finish' });
presets({
  weathered: { steel: '#575851', motorPaint: '#424c45', safetyPaint: '#9e722f' },
  highVisibility: { steel: '#647985', motorPaint: '#315c4a', safetyPaint: '#f5c640' },
});

const p = assembly('positive-displacement-pump');
const addSteel = (name, shape) => p.part(name, shape.scale(scale).color(steel));
const addMotorPaint = (name, shape) => p.part(name, shape.scale(scale).color(motorPaint));
const addSafetyPaint = (name, shape) => p.part(name, shape.scale(scale).color(safetyPaint));
const addDark = (name, shape) => p.part(name, shape.scale(scale).color('#252b2d'));
const alongX = (shape) => shape.rotateY(90);
const alongFront = (shape) => shape.rotateX(90);

// A low fabricated skid supports both the motor and pump head.
addSafetyPaint('skid-deck', box(820, 300, 48, true).translate(0, 0, 24));
for (const y of [-122, 122]) {
  addSteel(`skid-rail-${y}`, box(780, 34, 74, true).translate(0, y, 37));
}
for (const x of [-280, 190]) {
  addSteel(`skid-crossmember-${x}`, box(36, 270, 74, true).translate(x, 0, 37));
}

// Horizontal TEFC motor: finned frame, fan cowl, feet and terminal box.
for (const x of [-345, -155]) {
  addSteel(`motor-foot-${x}`, box(105, 140, 98, true).translate(x, 0, 108));
}
addMotorPaint('motor-frame', alongX(cylinder(290, 76, 12)).translate(-435, 0, 214));
for (let i = 0; i < 5; i++) {
  addMotorPaint(`motor-cooling-fin-${i}`, alongX(cylinder(9, 87, 12)).translate(-385 + i * 48, 0, 214));
}
addMotorPaint('motor-fan-cowl', alongX(cylinder(42, 74, 12)).translate(-477, 0, 214));
addMotorPaint('motor-terminal-box', box(148, 104, 82, true).translate(-235, -8, 300));
addSteel('motor-shaft', alongX(cylinder(112, 18, 10)).translate(-145, 0, 214));

// A boxed guard covers the motor-to-pump coupling without hiding the pump head.
addSafetyPaint('coupling-hub-motor', alongX(cylinder(34, 42, 10)).translate(-105, 0, 214));
addSafetyPaint('coupling-hub-pump', alongX(cylinder(34, 42, 10)).translate(-59, 0, 214));
addSafetyPaint('coupling-guard', box(122, 126, 112, true).translate(-58, 0, 214));
addSteel('pump-drive-shaft', alongX(cylinder(98, 20, 10)).translate(-10, 0, 214));

// The heavy rectangular head carries a round removable cover and perimeter bolts.
addSteel('gear-pump-case', box(190, 190, 184, true).translate(170, 0, 208));
for (const x of [112, 228]) {
  addSteel(`pump-foot-${x}`, box(52, 146, 92, true).translate(x, 0, 92));
}
addSteel('pump-service-cover', alongFront(cylinder(20, 90, 12)).translate(170, -91, 208));
addSteel('pump-cover-center', alongFront(cylinder(8, 70, 12)).translate(170, -109, 208));
for (let i = 0; i < 8; i++) {
  const a = (Math.PI * 2 * i) / 8;
  const x = 170 + Math.cos(a) * 82;
  const z = 208 + Math.sin(a) * 82;
  addSafetyPaint(`cover-bolt-${i}`, alongFront(cylinder(8, 6, 8)).translate(x, -117, z));
}

// Opposed raised ports and separate top flanges make both fluid connections legible.
const addPort = (name, x, y, radius) => {
  addSteel(`${name}-nozzle`, cylinder(58, radius, 12).translate(x, y, 284));
  addSteel(`${name}-flange`, cylinder(14, radius + 16, 12).translate(x, y, 328));
  addDark(`${name}-bore`, cylinder(2, radius * 0.68, 12).translate(x, y, 340));
}
addPort('suction', 112, -50, 34);
addPort('discharge', 228, 50, 30);

// The small spring cap and bridge pipe indicate an integral pressure-relief bypass.
addSteel('relief-branch', alongX(cylinder(116, 10, 10)).translate(112, 88, 382));
addSteel('pressure-relief-valve', cylinder(42, 21, 10).translate(228, 88, 350));
addSafetyPaint('pressure-relief-cap', cylinder(14, 28, 10).translate(228, 88, 392));
addSteel('bypass-return-drop', cylinder(94, 9, 10).translate(120, 88, 288));

return p.model();
