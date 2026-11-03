// Original low-poly field canteen with a neck, cap and carry loop.
// Millimetres, Z up, base at z = 0.

meta({
  name: 'canteen',
  license: 'CC0-1.0',
  title: 'Field canteen',
  description: 'Reusable field canteen with a flattened flask body, screw cap and side carry loop. Knobs: capacity, flask, cap and loop colours.',
  tags: ['canteen', 'water bottle', 'flask', 'camping', 'hiking', 'outdoor'],
  kit: 'outdoor-gear',
  category: 'prop',
  origin: 'base',
  compat: ['outdoor', 'camping', 'hiking', 'trail'],
  triangleBudget: 200,
});

const capacity = param('capacity', '750', { choices: ['500', '750', '1000'], label: 'Capacity (ml)' });
const flask = param('flask', '#536d51', { label: 'Flask' });
const cap = param('cap', '#343a36', { label: 'Cap' });
const loop = param('loop', '#9d7548', { label: 'Carry loop' });

const ml = Number(capacity.value);
const height = 230 + (ml - 500) * 0.12;
const radius = 74 + (ml - 500) * 0.035;
const bottle = assembly('canteen');
bottle.part('flask-body', cylinder(height, radius, 10).scale([1.15, 0.72, 1]).color(flask));
bottle.part('neck', cylinder(48, 38, 10).translate(0, 0, height - 4).color(flask));
bottle.part('cap', cylinder(38, 46, 10).translate(0, 0, height + 38).color(cap));
bottle.part('left-loop-rail', box(24, 34, height * 0.58, true).translate(-radius * 1.15 - 10, 0, height * 0.48).color(loop));
bottle.part('right-loop-rail', box(24, 34, height * 0.58, true).translate(radius * 1.15 + 10, 0, height * 0.48).color(loop));
bottle.part('loop-bridge', box(radius * 2.3 + 20, 34, 24, true).translate(0, 0, height * 0.78).color(loop));

return bottle.model();
