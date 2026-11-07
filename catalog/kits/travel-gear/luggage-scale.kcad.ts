// SPDX-License-Identifier: CC0-1.0
// Handheld digital luggage scale. What makes it one rather than a block: a
// palm-sized moulded body that is a T-handle grip with rubber finger pads on
// the underside, a backlit LCD reading the weight in a bezel on top, a power
// and a units button beside it, and a webbing strap that runs out of the
// load cell at the front and back round through a metal buckle hook that
// clips round the suitcase handle. Generic visualization geometry at real
// size (body 120 x 38 x 30 mm), millimetres, Z up, lying on its back on z = 0
// with the strap laid out towards -Y.
meta({
  name: 'luggage-scale',
  license: 'CC0-1.0',
  title: 'Luggage scale',
  description: 'Handheld digital luggage scale lying flat: moulded T-grip body with rubber finger pads, backlit LCD in a bezel, power and units buttons, webbing strap looped through a metal buckle hook. Compact or large body; strap loop or wide steel hook. Material controls: housing plastic, grip rubber, strap webbing, hook metal, LCD backlight; graphite, travelOrange and silverGrey presets.',
  tags: ['luggage scale', 'baggage scale', 'digital scale', 'travel', 'weighing', 'airport', 'low poly'],
  kit: 'travel-gear',
  category: 'prop',
  origin: 'base',
  compat: ['travel', 'airport', 'hotel'],
  triangleBudget: 1200,
});

const size = param('size', 'compact', { choices: ['compact', 'large'], label: 'Scale size' });
const hook = param('hook', 'standard', { choices: ['standard', 'wide'], label: 'Lower hook' });
const housing = param('housing', '#3c4650', { label: 'Housing (ABS plastic)' });
const gripRubber = param('gripRubber', '#1d2023', { label: 'Finger pads and buttons (rubber)' });
const strapWebbing = param('strapWebbing', '#2a2d30', { label: 'Strap (nylon webbing)' });
const hookMetal = param('hookMetal', '#b9c0c6', { label: 'Buckle hook (zinc alloy)' });
const lcd = param('lcd', '#9fd0c2', { label: 'Display backlight (LCD)' });
presets({
  graphite: { housing: '#2b3036', gripRubber: '#141619', strapWebbing: '#1f2124', hookMetal: '#9aa2a8', lcd: '#9fd0c2' },
  travelOrange: { housing: '#e46b2e', gripRubber: '#2a2a2c', strapWebbing: '#303236', hookMetal: '#c8ced2', lcd: '#c8e6f0' },
  silverGrey: { housing: '#c3c8cc', gripRubber: '#3a3f44', strapWebbing: '#2f3a48', hookMetal: '#e0e4e7', lcd: '#f2c76a' },
});

const p = assembly('luggage-scale');
const k = size.value === 'large' ? 1.2 : 1;
const add = (name, shape) => p.part(name, shape.scale(k));
const L = 120;  // grip length (X)
const B = 38;   // grip width (Y)
const T = 30;   // thickness (Z)

// T-shaped body: the grip bar and the load-cell nose in one rounded moulding.
add('grip-bar', extrudeRoundedRect(L, B, 16, T - 6).translate(0, 0, 3).color(housing));
add('load-cell', extrudeRoundedRect(42, 34, 10, T - 10).translate(0, -B / 2 - 14, 5).color(housing));
// Rubber pads under the grip (the side facing down here) and a rim band.
add('rim-band', extrudeRoundedRect(L + 2, B + 2, 17, 4).translate(0, 0, T * 0.45).color(gripRubber));
for (const x of [-36, -12, 12, 36]) {
  add(`finger-pad-${x}`, extrudeRoundedRect(20, B - 6, 8, 3).translate(x, 0, 0).color(gripRubber));
}
// LCD bezel, screen and digits on top.
add('bezel', extrudeRoundedRect(62, 26, 5, 2).translate(-14, 0, T - 3).color(gripRubber));
add('screen', extrudeRoundedRect(54, 18, 3, 2).translate(-14, 0, T - 2).color(lcd));
for (const [i, x] of [-32, -22, -12, -2].entries()) {
  add(`digit-${i}`, box(6, 11, 1, true).translate(x, 0, T + 0.4).color(housing));
}
// Power and units buttons.
for (const [i, x] of [28, 44].entries()) add(`button-${i}`, cylinder(3, 5.5, 12).translate(x, 0, T - 3).color(gripRubber));

// Webbing strap: out of the load cell, round a loop, back in, with the buckle hook.
const SY = -B / 2 - 32;
const LOOP = hook.value === 'wide' ? 34 : 24;
for (const sx of [-1, 1]) {
  add(`strap-run-${sx}`, box(14, 70, 2.5, true).rotateZ(sx * 10).translate(sx * 10, SY - 32, 3).color(strapWebbing));
}
add('strap-loop', torus(LOOP, 3, 8).scale([1, 0.7, 0.5]).intersect(box(100, 50, 10).translate(-50, -50, -5))
  .translate(0, SY - 66, 3).color(strapWebbing));
// Buckle hook: a flat metal plate with a hook bent off it and a spring gate.
add('buckle-plate', extrudeRoundedRect(LOOP * 2 + 8, 16, 5, 4).translate(0, SY - 66 - LOOP * 0.7, 1.5).color(hookMetal));
add('hook-bar', torus(LOOP * 0.6, 3, 8).intersect(box(100, 50, 10).translate(-50, -50, -5))
  .translate(0, SY - 70 - LOOP * 0.7, 3).color(hookMetal));

return p.model();
