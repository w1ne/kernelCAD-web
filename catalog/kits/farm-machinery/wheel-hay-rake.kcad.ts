// SPDX-License-Identifier: CC0-1.0
// Trailing wheel rake with five star wheels, support frame and adjustable tongue.
meta({
  name: "wheel-hay-rake",
  license: 'CC0-1.0',
  title: "Wheel hay rake",
  description: "Trailing wheel rake with five star wheels, support frame and adjustable tongue. Editable scale and painted steel, rubber, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const rubberColor = param('rubberColor', '#292e2d', { label: 'Rubber' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', steelColor: '#abb2ad' },
});
const p = assembly('wheel-hay-rake');
const groundOffset = 62.5;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('hay-frame', box(1764, 85, 78, true).translate(0, 80, 438), paintedSteelColor);
add('drawbar', box(95, 500, 56, true).translate(0, 430, 503), paintedSteelColor);
add('star-rake-wheel-0', cylinder(34, 270, 12).rotate([0, 1, 0], 90).translate(-899, -180, 332.5), rubberColor);
add('star-rake-wheel-0-hub', cylinder(37.4, 91.8, 10).translate(-900.7, -180, 332.5), steelColor);
add('rake-spoke-0-0', box(24, 430, 15, true).translate(-882, -180, 340), steelColor);
add('rake-spoke-0-1', box(24, 430, 15, true).translate(-882, -180, 340), steelColor);
add('rake-spoke-0-2', box(24, 430, 15, true).translate(-882, -180, 340), steelColor);
add('rake-spoke-0-3', box(24, 430, 15, true).translate(-882, -180, 340), steelColor);
add('rake-spoke-0-4', box(24, 430, 15, true).translate(-882, -180, 340), steelColor);
add('star-rake-wheel-1', cylinder(34, 270, 12).rotate([0, 1, 0], 90).translate(-458, -180, 332.5), rubberColor);
add('star-rake-wheel-1-hub', cylinder(37.4, 91.8, 10).translate(-459.7, -180, 332.5), steelColor);
add('rake-spoke-1-0', box(24, 430, 15, true).translate(-441, -180, 340), steelColor);
add('rake-spoke-1-1', box(24, 430, 15, true).translate(-441, -180, 340), steelColor);
add('rake-spoke-1-2', box(24, 430, 15, true).translate(-441, -180, 340), steelColor);
add('rake-spoke-1-3', box(24, 430, 15, true).translate(-441, -180, 340), steelColor);
add('rake-spoke-1-4', box(24, 430, 15, true).translate(-441, -180, 340), steelColor);
add('star-rake-wheel-2', cylinder(34, 270, 12).rotate([0, 1, 0], 90).translate(-17, -180, 332.5), rubberColor);
add('star-rake-wheel-2-hub', cylinder(37.4, 91.8, 10).translate(-18.7, -180, 332.5), steelColor);
add('rake-spoke-2-0', box(24, 430, 15, true).translate(0, -180, 340), steelColor);
add('rake-spoke-2-1', box(24, 430, 15, true).translate(0, -180, 340), steelColor);
add('rake-spoke-2-2', box(24, 430, 15, true).translate(0, -180, 340), steelColor);
add('rake-spoke-2-3', box(24, 430, 15, true).translate(0, -180, 340), steelColor);
add('rake-spoke-2-4', box(24, 430, 15, true).translate(0, -180, 340), steelColor);
add('star-rake-wheel-3', cylinder(34, 270, 12).rotate([0, 1, 0], 90).translate(424, -180, 332.5), rubberColor);
add('star-rake-wheel-3-hub', cylinder(37.4, 91.8, 10).translate(422.3, -180, 332.5), steelColor);
add('rake-spoke-3-0', box(24, 430, 15, true).translate(441, -180, 340), steelColor);
add('rake-spoke-3-1', box(24, 430, 15, true).translate(441, -180, 340), steelColor);
add('rake-spoke-3-2', box(24, 430, 15, true).translate(441, -180, 340), steelColor);
add('rake-spoke-3-3', box(24, 430, 15, true).translate(441, -180, 340), steelColor);
add('rake-spoke-3-4', box(24, 430, 15, true).translate(441, -180, 340), steelColor);
add('star-rake-wheel-4', cylinder(34, 270, 12).rotate([0, 1, 0], 90).translate(865, -180, 332.5), rubberColor);
add('star-rake-wheel-4-hub', cylinder(37.4, 91.8, 10).translate(863.3, -180, 332.5), steelColor);
add('rake-spoke-4-0', box(24, 430, 15, true).translate(882, -180, 340), steelColor);
add('rake-spoke-4-1', box(24, 430, 15, true).translate(882, -180, 340), steelColor);
add('rake-spoke-4-2', box(24, 430, 15, true).translate(882, -180, 340), steelColor);
add('rake-spoke-4-3', box(24, 430, 15, true).translate(882, -180, 340), steelColor);
add('rake-spoke-4-4', box(24, 430, 15, true).translate(882, -180, 340), steelColor);

return p.model();
