// SPDX-License-Identifier: CC0-1.0
// A walk-behind concrete finisher: its circular safety ring, exposed spider
// and pitched blades, engine, and long two-rail operator handle make the tool
// readable from the preview. The guard size changes the working footprint.
meta({
  name: 'walk-behind-power-trowel',
  license: 'CC0-1.0',
  title: 'Walk-behind power trowel',
  description: 'Walk-behind concrete finisher with a circular safety ring, exposed four-blade spider, compact engine and long two-rail control handle. Choose compact, standard or wide guard size. Material controls: equipment enamel, structural steel, engine metal and grip rubber; weathered and highVisibility presets.',
  tags: ['construction equipment', 'concrete finishing', 'power trowel', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2600,
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const guardSize = param('guardSize', 'standard', { choices: ['compact', 'standard', 'wide'], label: 'Guard and blade diameter' });
const equipmentEnamel = param('equipmentEnamel', '#e1a31b', { label: 'Equipment enamel' });
const structuralSteel = param('structuralSteel', '#89969a', { label: 'Structural steel' });
const engineMetal = param('engineMetal', '#353b3f', { label: 'Engine metal' });
const gripRubber = param('gripRubber', '#24282a', { label: 'Handle grip rubber' });
presets({
  weathered: { equipmentEnamel: '#a87b36', structuralSteel: '#716b61', engineMetal: '#393c3b', gripRubber: '#302d2a' },
  highVisibility: { equipmentEnamel: '#f06b26', structuralSteel: '#c1c7c2', engineMetal: '#30363a', gripRubber: '#202326' },
});

const radius = guardSize.value === 'compact' ? 330 : guardSize.value === 'wide' ? 500 : 420;
const p = assembly('walk-behind-power-trowel');
const colorMaterial = (shape, finish) => {
  if (finish === equipmentEnamel) return shape.color(equipmentEnamel);
  if (finish === structuralSteel) return shape.color(structuralSteel);
  if (finish === engineMetal) return shape.color(engineMetal);
  if (finish === gripRubber) return shape.color(gripRubber);
  return shape.color(finish);
};
const add = (name, shape, finish) => p.part(name, colorMaterial(shape.translate(0, 0, -11.331).scale(scale), finish));
const boxAt = (x, y, z, w, d, h) => box(w, d, h, true).translate(x, y, z);
const barBetween = (a, b, r, n = 10) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
  const length = Math.hypot(dx, dy, dz);
  return cylinder(length, r, n)
    .rotateY((Math.acos(dz / length) * 180) / Math.PI)
    .rotateZ((Math.atan2(dy, dx) * 180) / Math.PI)
    .translate(a[0], a[1], a[2]);
};

// The open ring and four pitched blades read as a trowel instead of a solid
// pancake. The spider bars connect the central gearbox to the blade shoes.
const ring = cylinder(24, radius + 36, 24).translate(0, 0, 30)
  .subtract(cylinder(26, radius, 24).translate(0, 0, 29));
add('circular-safety-ring', ring, structuralSteel);
for (const angle of [0, 90]) {
  add(`spider-arm-${angle}`, box(radius * 1.75, 34, 18, true).rotateZ(angle).translate(0, 0, 62), structuralSteel);
}
for (let k = 0; k < 4; k++) {
  const angle = 45 + k * 90;
  const a = (angle * Math.PI) / 180;
  const x = Math.cos(a) * radius * 0.61;
  const y = Math.sin(a) * radius * 0.61;
  add(`pitched-blade-${k}`, box(radius * 0.43, 28, 10, true).rotateX(7).rotateZ(angle + 11).translate(x, y, 18), structuralSteel);
  add(`blade-adjuster-${k}`, cylinder(32, 12, 8).translate(x, y, 37), engineMetal);
}

// Compact engine, fuel tank, air cleaner and the side-mounted exhaust.
add('gearbox', cylinder(116, 102, 12).translate(0, 0, 76), engineMetal);
add('engine-crankcase', boxAt(0, 0, 214, 210, 192, 156), equipmentEnamel);
add('engine-cylinder-head', boxAt(8, 8, 318, 122, 130, 78), engineMetal);
add('fuel-tank', boxAt(-22, 0, 374, 178, 150, 48), equipmentEnamel);
add('air-cleaner', cylinder(92, 42, 10).rotateX(90).translate(88, 34, 280), engineMetal);
add('exhaust-muffler', cylinder(108, 28, 10).rotateX(90).translate(-98, 0, 286), engineMetal);
add('starter-cover', cylinder(28, 59, 12).rotateY(90).translate(-116, 0, 242), structuralSteel);

// Two rails rise and run back from the engine to a cross handle and throttle.
for (const x of [-1, 1]) {
  add(`handle-rail-${x}`, barBetween([x * 72, -35, 336], [x * 118, -710, 690], 18), structuralSteel);
  add(`grip-${x}`, cylinder(170, 24, 10).rotateX(90).translate(x * 118, -760, 716), gripRubber);
  add(`handle-brace-${x}`, barBetween([x * 72, -105, 290], [x * 118, -360, 506], 10), structuralSteel);
}
add('operator-crossbar', cylinder(266, 17, 10).rotateX(90).translate(0, -700, 690), structuralSteel);
add('throttle-lever', barBetween([96, -712, 700], [160, -650, 748], 8), equipmentEnamel);
add('deadman-control', boxAt(0, -710, 672, 72, 30, 24), engineMetal);

return p.model();
