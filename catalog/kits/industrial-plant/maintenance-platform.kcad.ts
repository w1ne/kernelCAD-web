// SPDX-License-Identifier: CC0-1.0
// Raised service platform with four corner legs and base plates, a three-sided
// top/mid-rail and toe-board guard, and an open-riser access stair at the front.
// Three even rises and treads lead to the deck; paired handrails run from the
// stair to the front guard posts. Generic low-poly scene asset, Z up, mm units.
meta({
  name: 'maintenance-platform',
  license: 'CC0-1.0',
  title: 'Maintenance platform',
  description: 'Fixed-height maintenance platform at about real size: steel deck on four corner legs and base plates, three-sided safety guard with top rails, midrails and toe boards, and a three-tread open-riser access stair with paired handrails. Material controls: structural steel and safety paint; weathered and highVisibility presets.',
  tags: ['industrial plant', 'factory', 'maintenance', 'work platform', 'access stair', 'manufacturing', 'CC0'],
  kit: 'industrial-plant',
  category: 'structure',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const steel = param('steel', '#738087', { label: 'Structural steel' });
const safetyPaint = param('safetyPaint', '#e0a33f', { label: 'Safety paint' });
presets({
  weathered: { steel: '#575851', safetyPaint: '#9e722f' },
  highVisibility: { safetyPaint: '#f5c640' },
});

const p = assembly('maintenance-platform');
const addSteel = (name, shape) => p.part(name, shape.scale(scale).color(steel));
const addSafetyPaint = (name, shape) => p.part(name, shape.scale(scale).color(safetyPaint));

const deckTop = 674;
const guardTop = 1744;
const guardPostX = 260;
const guardPostY = 280;

// Deck and four continuous load-bearing legs. Each leg overlaps the deck and
// its foot plate slightly so the rendered members read as connected.
addSteel('platform-deck', box(620, 620, 28, true).translate(0, 0, 660));
for (const x of [-guardPostX, guardPostX]) {
  for (const y of [-guardPostY, guardPostY]) {
    const corner = `${x < 0 ? 'back' : 'front'}-${y < 0 ? 'left' : 'right'}`;
    addSteel(`platform-leg-${corner}`, box(32, 32, 660, true).translate(x, y, 330));
    addSafetyPaint(`base-foot-${corner}`, box(82, 82, 18, true).translate(x, y, 9));
    addSafetyPaint(`guard-post-${corner}`, box(24, 24, guardTop - deckTop, true)
      .translate(x, y, (guardTop + deckTop) / 2));
  }
}

// Guard the two long edges and the rear edge. The front opening lines up with
// the stair so the route onto the platform stays clear.
for (const [side, y] of [['left', -guardPostY], ['right', guardPostY]]) {
  addSafetyPaint(`platform-top-rail-side-${side}`, box(guardPostX * 2, 18, 20, true)
    .translate(0, y, guardTop - 10));
  addSafetyPaint(`platform-mid-rail-side-${side}`, box(guardPostX * 2, 16, 18, true)
    .translate(0, y, (guardTop + deckTop) / 2));
  addSafetyPaint(`platform-toe-board-side-${side}`, box(guardPostX * 2, 22, 100, true)
    .translate(0, y, deckTop + 50));
}
addSafetyPaint('platform-top-rail-back', box(18, guardPostY * 2, 20, true)
  .translate(-guardPostX, 0, guardTop - 10));
addSafetyPaint('platform-mid-rail-back', box(16, guardPostY * 2, 18, true)
  .translate(-guardPostX, 0, (guardTop + deckTop) / 2));
addSafetyPaint('platform-toe-board-back', box(22, guardPostY * 2, 100, true)
  .translate(-guardPostX, 0, deckTop + 50));

// Three equal 250 mm treads rise to the 674 mm deck. Yellow nosings make each
// tread legible; paired stringers carry them on the open sides.
const treads = [
  { name: 'lower', x: 885, top: 168.5 },
  { name: 'middle', x: 635, top: 337 },
  { name: 'upper', x: 385, top: 505.5 },
];
for (const tread of treads) {
  const centerZ = tread.top - 12;
  addSteel(`stair-tread-${tread.name}`, box(250, 560, 24, true)
    .translate(tread.x, 0, centerZ));
  addSafetyPaint(`stair-nosing-${tread.name}`, box(18, 560, 8, true)
    .translate(tread.x + 116, 0, tread.top - 4));
}

const stairRun = 750;
const stairRise = 505.5;
const stairAngle = (Math.atan(stairRise / stairRun) * 180) / Math.PI;
const stairRailLength = Math.hypot(stairRun, stairRise);
const stairCenterX = 635;
const stringerThickness = 70;
// Raise the stringers by half their depth so the lower ends clear the ground
// while their sloped members meet the underside of the stair treads.
const stringerCenterZ = stairRise / 2 + stringerThickness / 2;
const handrailCenterZ = deckTop + 900 - stairRise / 2;

for (const [side, y] of [['left', -240], ['right', 240]]) {
  addSteel(`stair-stringer-${side}`, box(stairRailLength, 40, stringerThickness, true)
    .rotate([0, 1, 0], stairAngle)
    .translate(stairCenterX, y, stringerCenterZ));
}

// Handrails stand 900 mm above each tread nosing and connect to the front
// guard posts. Vertical supports land on each tread instead of hovering.
const stairPosts = [
  { name: 'lower', x: 1010, base: 168.5, top: 1068.5 },
  { name: 'middle', x: 760, base: 337, top: 1237 },
  { name: 'upper', x: 510, base: 505.5, top: 1405.5 },
];
for (const [side, y] of [['left', -guardPostY], ['right', guardPostY]]) {
  addSafetyPaint(`stair-handrail-${side}`, box(stairRailLength, 22, 22, true)
    .rotate([0, 1, 0], stairAngle)
    .translate(stairCenterX, y, handrailCenterZ));
  for (const post of stairPosts) {
    addSafetyPaint(`stair-handrail-post-${side}-${post.name}`, box(22, 22, post.top - post.base, true)
      .translate(post.x, y, (post.top + post.base) / 2));
  }
}

return p.model();
