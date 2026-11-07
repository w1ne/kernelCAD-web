// Original folding camp chair with a fabric seat and crossed frame.
// Millimetres, Z up, feet at z = 0.

meta({
  name: 'camp-chair',
  license: 'CC0-1.0',
  title: 'Camp chair',
  description: 'Portable folding camp chair with a fabric seat, backrest, armrests and crossed legs. Knobs: chair size, fabric and frame colours.',
  tags: ['camp chair', 'folding chair', 'camping', 'outdoor', 'seat', 'furniture'],
  kit: 'outdoor-gear',
  category: 'furniture',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 320,
});

const size = param('size', 'classic', { choices: ['compact', 'classic'], label: 'Size' });
const fabric = param('fabric', '#b25636', { label: 'Fabric' });
const frame = param('frame', '#555b5c', { label: 'Frame' });

const compact = size.value === 'compact';
const width = compact ? 390 : 440;
const seatHeight = compact ? 360 : 430;
const backHeight = compact ? 420 : 500;
const legLength = seatHeight + 90;
const footAdjustment = compact ? 1.538 : 2.636;
const chair = assembly('camp-chair');

chair.part('seat', box(width, 420, 42, true).translate(0, 0, seatHeight).color(fabric));
chair.part('backrest', box(width, 44, backHeight, true).rotateX(-8).translate(0, 188, seatHeight + backHeight / 2 - 6).color(fabric));
chair.part('left-front-leg', box(32, 32, legLength, true).rotateY(-12).rotateX(-8).translate(-145, -150, legLength / 2 - footAdjustment).color(frame));
chair.part('right-front-leg', box(32, 32, legLength, true).rotateY(12).rotateX(-8).translate(145, -150, legLength / 2 - footAdjustment).color(frame));
chair.part('left-rear-leg', box(32, 32, legLength, true).rotateY(12).rotateX(12).translate(-145, 150, legLength / 2 - footAdjustment).color(frame));
chair.part('right-rear-leg', box(32, 32, legLength, true).rotateY(-12).rotateX(12).translate(145, 150, legLength / 2 - footAdjustment).color(frame));
chair.part('left-armrest', box(48, 330, 38, true).translate(-width / 2 - 10, 8, seatHeight + 80).color(frame));
chair.part('right-armrest', box(48, 330, 38, true).translate(width / 2 + 10, 8, seatHeight + 80).color(frame));

return chair.model();
