// Original low-poly trail fishing rod with a grip, reel and guide rings.
// Millimetres, Z up, handle base at z = 0.

meta({
  name: 'fishing-rod',
  license: 'CC0-1.0',
  title: 'Trail fishing rod',
  description: 'Travel fishing rod with a cork grip, spinning reel, tapered shaft and line guides. Knobs: rod length, shaft, grip, reel and guide colours.',
  tags: ['fishing rod', 'fishing', 'camping', 'outdoor', 'trail', 'reel'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail', 'fishing'],
  triangleBudget: 550,
});

const length = param('length', '1800', { choices: ['1800', '2100', '2400'], label: 'Rod length (mm)' });
const shaft = param('shaft', '#4c6875', { label: 'Shaft' });
const grip = param('grip', '#aa7b4c', { label: 'Grip' });
const reel = param('reel', '#3d4140', { label: 'Reel and guides' });

const rodLength = Number(length.value);
const fishing = assembly('fishing-rod');
fishing.part('cork-handle', cylinder(190, 24, 8).translate(0, 0, 0).color(grip));
fishing.part('lower-shaft', cylinder(rodLength * 0.54, 12, 8).translate(0, 0, 178).color(shaft));
fishing.part('middle-shaft', cylinder(rodLength * 0.30, 8, 8).translate(0, 0, 178 + rodLength * 0.54).color(shaft));
fishing.part('tip-section', cylinder(rodLength * 0.16, 5, 8).translate(0, 0, 178 + rodLength * 0.84).color(shaft));
fishing.part('reel-spool', cylinder(22, 48, 10).rotateY(90).translate(42, 0, 310).color(reel));
fishing.part('reel-hub', cylinder(46, 24, 10).rotateY(90).translate(64, 0, 310).color(grip));
fishing.part('reel-handle', box(120, 18, 18, true).rotateZ(12).translate(98, 0, 310).color(reel));
const guideHeights = [420, 760, 1120, 1480, 1780].filter((z) => z < rodLength + 150);
for (let i = 0; i < guideHeights.length; i++) {
  fishing.part('line-guide-' + (i + 1), cylinder(12, 18, 8).rotateY(90).translate(0, 0, guideHeights[i]).color(reel));
}

return fishing.model();
