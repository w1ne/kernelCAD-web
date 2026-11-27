// SPDX-License-Identifier: CC0-1.0
// Guarded palletizer cell: articulated robot, loaded pallet, roller infeed,
// open mesh fencing and a separate access gate make the material flow legible.
meta({
  name: 'palletizer-robot-cell',
  license: 'CC0-1.0',
  title: 'Palletizer robot cell',
  description: 'Compact guarded palletizing cell with an articulated robot, roller infeed, a carton-loaded timber pallet, mesh fencing and an access gate. Controls: overall scale, concrete, structural steel, safety paint, cartons; weathered and highVisibility presets.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 12000
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const concrete = param('concrete', '#8a8e89', { label: 'Concrete floor' });
const steel = param('steel', '#53636a', { label: 'Structural and roller steel' });
const safetyPaint = param('safetyPaint', '#e9a43b', { label: 'Safety paint' });
const carton = param('carton', '#b47a4e', { label: 'Corrugated cartons' });
presets({
  weathered: { concrete: '#777a75', steel: '#575851', safetyPaint: '#9e722f', carton: '#805239' },
  highVisibility: { concrete: '#b5b8b3', steel: '#4b565a', safetyPaint: '#f5c640', carton: '#c58a55' },
});

const p = assembly('palletizer-robot-cell');
const addPart = (name, shape) => p.part(name, shape.scale(scale));

addPart('cell-floor', box(4200, 3900, 100, true).translate(0, 0, 50).color(concrete));

// Weld the painted posts and rails into one guard frame. Each mesh panel is a
// single steel grid, set between posts so preview geometry stays unobstructed.
let guardFrame = box(80, 80, 1800, true).translate(-2060, 1450, 1000);
const addFrame = (shape) => { guardFrame = guardFrame.union(shape).color(safetyPaint); };
const fencePosts = [
  [-1030, 1450], [0, 1450], [1030, 1450], [2060, 1450],
  [-2060, 0], [-2060, -1450], [2060, 0], [2060, -1450],
  [-1450, -1450], [-550, -1450], [1300, -1450],
];
for (const [x, y] of fencePosts) {
  addFrame(box(80, 80, 1800, true).translate(x, y, 1000));
}
function addAcrossRails(x0, x1, y) {
  const length = x1 - x0 - 80 + 0.2;
  const centerX = (x0 + x1) / 2;
  addFrame(box(length, 34, 34, true).translate(centerX, y, 1760));
  addFrame(box(length, 34, 34, true).translate(centerX, y, 200));
}
function addAlongRails(x, y0, y1) {
  const length = y1 - y0 - 80 + 0.2;
  const centerY = (y0 + y1) / 2;
  addFrame(box(34, length, 34, true).translate(x, centerY, 1760));
  addFrame(box(34, length, 34, true).translate(x, centerY, 200));
}
for (const [x0, x1] of [[-2060, -1030], [-1030, 0], [0, 1030], [1030, 2060]]) {
  addAcrossRails(x0, x1, 1450);
}
for (const x of [-2060, 2060]) {
  addAlongRails(x, -1450, 0);
  addAlongRails(x, 0, 1450);
}
for (const [x0, x1] of [[-2060, -1450], [-1450, -550], [1300, 2060]]) {
  addAcrossRails(x0, x1, -1450);
}
addFrame(cylinder(100, 26).translate(-1450, -1450, 330));
addFrame(cylinder(100, 26).translate(-1450, -1450, 1640));
addFrame(box(42, 56, 110, true).translate(-520, -1450, 1020));
addPart('safety-fence-frame', guardFrame);

function meshAcrossX(x0, x1, y) {
  const span = x1 - x0 - 82;
  const centerX = (x0 + x1) / 2;
  let mesh = box(span, 14, 18, true).translate(centerX, y, 500)
    .union(box(span, 14, 18, true).translate(centerX, y, 900))
    .union(box(span, 14, 18, true).translate(centerX, y, 1300));
  const count = Math.max(3, Math.floor(span / 150));
  for (let index = 0; index <= count; index += 1) {
    const x = x0 + 50 + ((x1 - x0 - 100) * index) / count;
    mesh = mesh.union(box(18, 14, 1524, true).translate(x, y, 980));
  }
  return mesh.color(steel);
}
function meshAlongY(x, y0, y1) {
  const span = y1 - y0 - 82;
  const centerY = (y0 + y1) / 2;
  let mesh = box(14, span, 18, true).translate(x, centerY, 500)
    .union(box(14, span, 18, true).translate(x, centerY, 900))
    .union(box(14, span, 18, true).translate(x, centerY, 1300));
  const count = Math.max(3, Math.floor(span / 150));
  for (let index = 0; index <= count; index += 1) {
    const y = y0 + 50 + ((y1 - y0 - 100) * index) / count;
    mesh = mesh.union(box(14, 18, 1524, true).translate(x, y, 980));
  }
  return mesh.color(steel);
}

for (const [name, x0, x1] of [
  ['rear-guard-west', -2060, -1030], ['rear-guard-center', -1030, 0],
  ['rear-guard-east', 0, 1030], ['rear-guard-end', 1030, 2060],
  ['entry-guard-west', -2060, -1450], ['access-gate', -1450, -550],
  ['entry-guard-east', 1300, 2060],
]) {
  addPart(name, meshAcrossX(x0, x1, name.startsWith('rear') ? 1450 : -1450));
}
addPart('west-guard-rear', meshAlongY(-2060, 0, 1450));
addPart('west-guard-entry', meshAlongY(-2060, -1450, 0));
addPart('east-guard-rear', meshAlongY(2060, 0, 1450));
addPart('east-guard-entry', meshAlongY(2060, -1450, 0));

// The side frames and support stands form one component. Separate rollers
// terminate at the inside faces of the rails and remain individually visible.
for (let side = 0; side < 2; side += 1) {
  const x = side === 0 ? 150 : 1250;
  let railFrame = box(70, 1750, 120, true).translate(x, -925, 620);
  for (let station = 0; station < 3; station += 1) {
    const y = -1750 + station * 825;
    railFrame = railFrame
      .union(box(82, 82, 438, true).translate(x, y, 341));
  }
  const suffix = side === 0 ? 'left' : 'right';
  addPart(`infeed-frame-${suffix}`, railFrame.color(steel));
  for (let station = 0; station < 3; station += 1) {
    const y = -1750 + station * 825;
    addPart(`infeed-foot-${suffix}-${station + 1}`, box(160, 150, 26, true).translate(x, y, 109).color(safetyPaint));
  }
}
for (let index = 0; index < 11; index += 1) {
  const y = -1750 + index * 165;
  addPart(
    `infeed-roller-${index + 1}`,
    cylinder(1030, 48).rotate([0, 1, 0], 90).translate(700, y, 710).color(steel),
  );
}
addPart('infeed-carton', box(500, 450, 320, true).translate(700, -925, 894).color(carton));

// Frame, deck, and timber slats are fused as one station. The cartons touch
// the slats and one another without filling the gaps between pallet boards.
let palletFrame = box(1380, 1160, 180, true).translate(850, 300, 290)
  .union(box(1420, 1200, 50, true).translate(850, 300, 402));
for (const x of [200, 1500]) {
  for (const y of [-250, 850]) {
    palletFrame = palletFrame.union(box(100, 100, 102, true).translate(x, y, 151));
  }
}
addPart('pallet-frame', palletFrame.color(steel));

for (let index = 0; index < 3; index += 1) {
  const x = 450 + index * 400;
  addPart(`pallet-timber-runner-${index + 1}`, box(100, 1050, 90, true).translate(x, 300, 472).color('#9d7446'));
}

for (let index = 0; index < 7; index += 1) {
  const y = -225 + index * 175;
  addPart(`pallet-timber-slat-${index + 1}`, box(1350, 130, 34, true).translate(850, y, 534).color('#b28a55'));
}
for (let layer = 0; layer < 2; layer += 1) {
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const x = 550 + column * 600;
      const y = 50 + row * 500;
      const z = 731 + layer * 360;
      addPart(
        `pallet-carton-${layer + 1}-${row + 1}-${column + 1}`,
        box(500, 410, 360, true).translate(x, y, z).color(carton),
      );
    }
  }
}

// Static display pose only: six visible joint housings connect the links and
// gripper. This asset does not claim a motion, reach, or safety validation.
const robotBase = box(620, 620, 120, true).translate(-750, 150, 160)
  .union(cylinder(431, 195).translate(-750, 150, 219));
addPart('robot-base', robotBase.color(steel));
const robotArm = cylinder(120, 356).translate(-750, 150, 650)
  .union(box(220, 220, 190, true).translate(-750, 150, 865))
  .union(box(300, 300, 300, true).translate(-750, 150, 950))
  .union(cylinder(380, 160).rotate([1, 0, 0], 90).translate(-750, 340, 1110))
  .union(cylinder(900, 125).rotate([0, 1, 0], 60).translate(-750, 150, 1110))
  .union(cylinder(360, 140).rotate([1, 0, 0], 90).translate(29, 510, 1560))
  .union(cylinder(700, 96).rotate([0, 1, 0], 100).translate(29, 150, 1560))
  .union(cylinder(180, 96).rotate([0, 1, 0], 90).translate(718, 150, 1438))
  .union(cylinder(250, 76).rotate([1, 0, 0], 90).translate(808, 275, 1438))
  .union(cylinder(150, 62).rotate([0, 1, 0], 90).translate(808, 150, 1438))
  .union(box(220, 210, 100, true).translate(970, 150, 1515))
  .union(box(44, 70, 180, true).translate(910, 150, 1400))
  .union(box(44, 70, 180, true).translate(1030, 150, 1400));
addPart('robot-arm', robotArm.color(safetyPaint));

return p.model();
