// Original kernelCAD handheld baggage scale with a display and lower hook.
// Millimetres, Z up, base sits at z = 0.
meta({
  name: 'luggage-scale', license: 'CC0-1.0', title: 'Luggage scale',
  description: 'Handheld baggage scale with an upper grip, display and selectable lower hook size. Knobs: scale size, hook, body and strap colors.',
  tags: ['luggage scale', 'baggage scale', 'travel', 'weighing scale', 'luggage'],
  kit: 'travel-gear', category: 'prop', origin: 'base', compat: ['travel', 'airport', 'luggage'], triangleBudget: 320,
});

const size = param('size', 'compact', { choices: ['compact', 'large'], label: 'Scale size' });
const hook = param('hook', 'standard', { choices: ['standard', 'wide'], label: 'Lower hook' });
const body = param('body', '#4e6472', { label: 'Scale housing' });
const strap = param('strap', '#25292c', { label: 'Grip and hook' });
const s = size.value === 'compact' ? 0.82 : 1.12;
const hookWidth = hook.value === 'wide' ? 76 : 50;
const scale = assembly('luggage-scale');
scale.part('housing', box(116 * s, 58 * s, 176 * s, true).translate(0, 0, 150 * s).color(body));
scale.part('display', box(72 * s, 8 * s, 38 * s, true).translate(0, -32 * s, 190 * s).color(strap));
scale.part('button', cylinder(12 * s, 18 * s, 10).translate(0, -34 * s, 126 * s).color(strap));
scale.part('grip-left', box(24 * s, 48 * s, 56 * s, true).translate(-43 * s, 0, 273 * s).color(strap));
scale.part('grip-right', box(24 * s, 48 * s, 56 * s, true).translate(43 * s, 0, 273 * s).color(strap));
scale.part('grip-bridge', box(110 * s, 48 * s, 24 * s, true).translate(0, 0, 301 * s).color(strap));
scale.part('hook-stem', cylinder(48 * s, 14 * s, 8).translate(0, 0, 16 * s).color(strap));
scale.part('hook-bar', box(hookWidth * s, 18 * s, 16 * s, true).translate(0, 0, 8 * s).color(strap));

return scale.model();
