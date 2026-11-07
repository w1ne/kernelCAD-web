// SPDX-License-Identifier: CC0-1.0
// Compact concrete batch plant with raised aggregate bins, tapered discharge hoppers,
// a feed conveyor, central mixer, framed cement silo and control cabin. Generic visualization geometry in millimetres, Z up.
meta({
  name: "concrete-batch-plant",
  license: 'CC0-1.0',
  title: "Compact concrete batch plant",
  description: "Framed batching plant with selectable aggregate-bin count, tapered discharge chutes, transfer conveyor, mixer and configurable-height cement silo. Material controls: equipment enamel, structural steel, aggregate bins and cement silo; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'structure',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const aggregateBinCount = param('aggregateBinCount', '3', {
  choices: ['2', '3', '4'],
  label: 'Aggregate bins',
});
const siloHeight = param('siloHeight', '1500', {
  choices: ['1200', '1500', '1900'],
  label: 'Silo body height (mm)',
});
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Structural steel' });
const aggregateColor = param('aggregateColor', '#758266', { label: 'Aggregate-bin coating' });
const cementSiloColor = param('cementSiloColor', '#c3c8c3', { label: 'Cement-silo coating' });
presets({
  weathered: {
    equipmentPaintColor: '#a87b36',
    structuralSteelColor: '#716b61',
    aggregateColor: '#6a7059',
    cementSiloColor: '#a8aaa4',
  },
  highVisibility: {
    equipmentPaintColor: '#f06b26',
    structuralSteelColor: '#c1c7c2',
    aggregateColor: '#d2a742',
    cementSiloColor: '#e2e5dc',
  },
});

const binCount = Number(aggregateBinCount.value);
const siloH = Number(siloHeight.value);
const p = assembly('concrete-batch-plant');
const add = (name, shape, finish = equipmentPaintColor) =>
  p.part(name, shape.scale(scale).color(finish));
const rectProfile = (width, depth) =>
  path()
    .moveTo(-width / 2, -depth / 2)
    .lineTo(width / 2, -depth / 2)
    .lineTo(width / 2, depth / 2)
    .lineTo(-width / 2, depth / 2)
    .close();
const roundProfile = (radius, sides = 16) => {
  let outline = path().moveTo(radius, 0);
  for (let i = 1; i < sides; i += 1) {
    const angle = (Math.PI * 2 * i) / sides;
    outline = outline.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
  }
  return outline.close();
};
const taperedHopper = (x, y) =>
  rectProfile(142, 152).loft([rectProfile(292, 332)], {
    planes: [
      { plane: 'XY' as const, origin: [x, y, 410] as [number, number, number] },
      { plane: 'XY' as const, origin: [x, y, 640] as [number, number, number] },
    ],
    ruled: true,
  });
const siloBaseCone = roundProfile(72).loft([roundProfile(168)], {
  planes: [
    { plane: 'XY' as const, origin: [930, 185, 260] as [number, number, number] },
    { plane: 'XY' as const, origin: [930, 185, 390] as [number, number, number] },
  ],
  ruled: true,
});

// The aggregate train is elevated on open steel legs. Each selectable bin
// narrows to its own metering gate above the shared feed belt.
const binXs = [];
for (let i = 0; i < binCount; i += 1) {
  const x = (i - (binCount - 1) / 2) * 360;
  binXs.push(x);
  const suffix = '-' + (i + 1);
  add('aggregate-storage-bin' + suffix, box(292, 332, 420, true).translate(x, -320, 850), aggregateColor);
  add('aggregate-bin-top-rim' + suffix, box(316, 356, 32, true).translate(x, -320, 1076), equipmentPaintColor);
  add('aggregate-discharge-hopper' + suffix, taperedHopper(x, -320), aggregateColor);
  add('metering-gate' + suffix, box(180, 188, 34, true).translate(x, -320, 390), structuralSteelColor);
  add('metering-outlet' + suffix, cylinder(86, 34, 10).translate(x, -320, 332), structuralSteelColor);
  for (const dx of [-128, 128]) {
    for (const dy of [-143, 143]) {
      const post = (dx < 0 ? 'left' : 'right') + '-' + (dy < 0 ? 'near' : 'far');
      add('bin-support-' + post + suffix, box(34, 34, 350, true).translate(x + dx, -320 + dy, 215), structuralSteelColor);
    }
  }
  add('bin-cross-brace-near' + suffix, box(292, 28, 32, true).translate(x, -461, 205), structuralSteelColor);
}

// A sloped belt collects the metered aggregate and feeds the central mixer.
add('aggregate-conveyor-frame', box(binCount * 360 + 220, 104, 54, true).translate(0, -320, 374), structuralSteelColor);
add('aggregate-conveyor-belt', box(binCount * 360 + 184, 78, 18, true).translate(0, -320, 411), '#303638');
for (let i = 0; i < binCount + 1; i += 1) {
  const x = (i - binCount / 2) * 360;
  add('conveyor-roller-' + (i + 1), cylinder(90, 24, 10).rotateX(90).translate(x, -365, 376), structuralSteelColor);
}
add('mixer-transfer-chute', box(120, 390, 42, true).rotateX(18).translate(0, -500, 464), equipmentPaintColor);
add('mixer-platform-left', box(56, 240, 230, true).translate(-220, -650, 178), structuralSteelColor);
add('mixer-platform-right', box(56, 240, 230, true).translate(220, -650, 178), structuralSteelColor);
add('central-mixer-drum', cylinder(360, 156, 16).rotateY(90).translate(-180, -650, 314), structuralSteelColor);
add('mixer-drive-housing', cylinder(112, 112, 14).rotateY(90).translate(180, -650, 314), equipmentPaintColor);
add('mixer-discharge-chute', box(178, 210, 120, true).rotateX(18).translate(0, -832, 247), structuralSteelColor);
add('mixer-safety-rail', box(430, 42, 42, true).translate(0, -650, 527), equipmentPaintColor);

// The silo has a conical discharge hopper, cylindrical shell, service ladder,
// top filter can, and its own short load-out screw.
add('silo-discharge-cone', siloBaseCone, cementSiloColor);
add('cement-silo-shell', cylinder(siloH, 168, 16).translate(930, 185, 390), cementSiloColor);
add('silo-roof-ring', cylinder(48, 182, 16).translate(930, 185, 390 + siloH), structuralSteelColor);
add('silo-top-cap', cylinder(42, 142, 16).translate(930, 185, 438 + siloH), cementSiloColor);
add('silo-filter-canister', cylinder(182, 46, 12).translate(930, 185, 478 + siloH), structuralSteelColor);
add('silo-vent-cap', cylinder(28, 62, 12).translate(930, 185, 648 + siloH), equipmentPaintColor);
add('silo-feed-screw', cylinder(420, 28, 12).rotateX(90).translate(930, 396, 236), structuralSteelColor);
add('silo-leg-near-left', box(38, 38, 322, true).translate(805, 72, 161), structuralSteelColor);
add('silo-leg-near-right', box(38, 38, 322, true).translate(1055, 72, 161), structuralSteelColor);
add('silo-leg-far-left', box(38, 38, 322, true).translate(805, 298, 161), structuralSteelColor);
add('silo-leg-far-right', box(38, 38, 322, true).translate(1055, 298, 161), structuralSteelColor);
add('silo-access-ladder-left', box(16, 20, siloH + 400, true).translate(740, 186, 390 + siloH / 2), structuralSteelColor);
add('silo-access-ladder-right', box(16, 20, siloH + 400, true).translate(772, 186, 390 + siloH / 2), structuralSteelColor);
for (let rung = 0; rung < Math.floor((siloH + 400) / 110); rung += 1) {
  add('silo-ladder-rung-' + (rung + 1), box(48, 20, 14, true).translate(756, 186, 198 + rung * 110), structuralSteelColor);
}

// A separate glass-fronted control cabin faces the plant frame.
add('control-cabin-frame', box(230, 220, 300, true).translate(-690, 205, 348), structuralSteelColor);
add('control-cabin-shell', box(218, 208, 278, true).translate(-690, 205, 350), equipmentPaintColor);
add('control-cabin-window', box(10, 136, 132, true).translate(-574, 205, 392), '#8eb6ba');
add('control-cabin-console', box(82, 62, 88, true).translate(-594, 246, 300), structuralSteelColor);
add('plant-base-rail-front', box(1540, 56, 50, true).translate(180, -850, 73), structuralSteelColor);
add('plant-base-rail-back', box(1540, 56, 50, true).translate(180, 498, 73), structuralSteelColor);
add('plant-base-crossmember-left', box(56, 1400, 50, true).translate(-588, -176, 73), structuralSteelColor);
add('plant-base-crossmember-right', box(56, 1400, 50, true).translate(948, -176, 73), structuralSteelColor);

return p.model();
