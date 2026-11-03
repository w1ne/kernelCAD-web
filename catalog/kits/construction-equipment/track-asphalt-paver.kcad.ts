// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly tracked asphalt paver scene prop, modeled from scratch.
meta({
  name: "track-asphalt-paver",
  license: 'CC0-1.0',
  title: "Tracked asphalt paver",
  description: "Tracked paving machine with front material hopper, operator canopy, feeder deck and rear screed. Knobs: overall scale, body color and accent color.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d29a36', { label: 'Accent color' });
const p = assembly('track-asphalt-paver');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('crawler--1-belt', box(1116, 198, 210, true).translate(-31, -315, 105), body);
add('crawler--1-roller-0', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(-432.76, -223.92, 96.6), "#40474b");
add('crawler--1-roller-0-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-432.76, -420.653, 96.6), accent);
add('crawler--1-roller-0-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-432.76, -209.347, 96.6), accent);
add('crawler--1-roller-1', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(-164.92, -223.92, 96.6), "#40474b");
add('crawler--1-roller-1-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-164.92, -420.653, 96.6), accent);
add('crawler--1-roller-1-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-164.92, -209.347, 96.6), accent);
add('crawler--1-roller-2', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(102.92, -223.92, 96.6), "#40474b");
add('crawler--1-roller-2-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(102.92, -420.653, 96.6), accent);
add('crawler--1-roller-2-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(102.92, -209.347, 96.6), accent);
add('crawler--1-roller-3', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(370.76, -223.92, 96.6), "#40474b");
add('crawler--1-roller-3-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(370.76, -420.653, 96.6), accent);
add('crawler--1-roller-3-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(370.76, -209.347, 96.6), accent);
add('crawler--1-idler-front', cylinder(186.12, 98.7, 12).rotate([1, 0, 0], 90).translate(426.56, -221.94, 100.8), "#40474b");
add('crawler--1-idler-front-hub--1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(426.56, -422.95, 100.8), accent);
add('crawler--1-idler-front-hub-1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(426.56, -207.05, 100.8), accent);
add('crawler--1-idler-rear', cylinder(186.12, 98.7, 12).rotate([1, 0, 0], 90).translate(-488.56, -221.94, 100.8), "#40474b");
add('crawler--1-idler-rear-hub--1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(-488.56, -422.95, 100.8), accent);
add('crawler--1-idler-rear-hub-1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(-488.56, -207.05, 100.8), accent);
add('crawler-1-belt', box(1116, 198, 210, true).translate(-31, 315, 105), body);
add('crawler-1-roller-0', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(-432.76, 406.08, 96.6), "#40474b");
add('crawler-1-roller-0-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-432.76, 209.347, 96.6), accent);
add('crawler-1-roller-0-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-432.76, 420.653, 96.6), accent);
add('crawler-1-roller-1', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(-164.92, 406.08, 96.6), "#40474b");
add('crawler-1-roller-1-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-164.92, 209.347, 96.6), accent);
add('crawler-1-roller-1-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(-164.92, 420.653, 96.6), accent);
add('crawler-1-roller-2', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(102.92, 406.08, 96.6), "#40474b");
add('crawler-1-roller-2-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(102.92, 209.347, 96.6), accent);
add('crawler-1-roller-2-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(102.92, 420.653, 96.6), accent);
add('crawler-1-roller-3', cylinder(182.16, 92.4, 12).rotate([1, 0, 0], 90).translate(370.76, 406.08, 96.6), "#40474b");
add('crawler-1-roller-3-hub--1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(370.76, 209.347, 96.6), accent);
add('crawler-1-roller-3-hub-1', cylinder(29.146, 35.112, 10).rotate([1, 0, 0], 90).translate(370.76, 420.653, 96.6), accent);
add('crawler-1-idler-front', cylinder(186.12, 98.7, 12).rotate([1, 0, 0], 90).translate(426.56, 408.06, 100.8), "#40474b");
add('crawler-1-idler-front-hub--1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(426.56, 207.05, 100.8), accent);
add('crawler-1-idler-front-hub-1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(426.56, 422.95, 100.8), accent);
add('crawler-1-idler-rear', cylinder(186.12, 98.7, 12).rotate([1, 0, 0], 90).translate(-488.56, 408.06, 100.8), "#40474b");
add('crawler-1-idler-rear-hub--1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(-488.56, 207.05, 100.8), accent);
add('crawler-1-idler-rear-hub-1', cylinder(29.779, 37.506, 10).rotate([1, 0, 0], 90).translate(-488.56, 422.95, 100.8), accent);
add('main-deck', box(1116, 522, 230, true).translate(0, 0, 335), body);
add('material-hopper', box(372, 648, 360, true).translate(527, 0, 480), accent);
add('hopper-wing-left', box(310, 72, 340, true).translate(527, -306, 480), body);
add('hopper-wing-right', box(310, 72, 340, true).translate(527, 306, 480), body);
add('operator-platform', box(387.5, 378, 50, true).translate(-201.5, 0, 475), accent);
add('canopy-posts', box(32, 315, 320, true).translate(-186, 0, 660), body);
add('canopy-roof', box(651, 495, 50, true).translate(-186, 0, 845), accent);
add('feeder-deck', box(527, 378, 85, true).translate(-573.5, 0, 192.5), body);
add('screed-main', box(68, 828, 120, true).translate(-744, 0, 125), accent);
add('screed-wing--1', box(70, 162, 95, true).translate(-744, -468, 127.5), body);
add('screed-arm--1', box(418.5, 35, 38, true).translate(-496, -306, 199), accent);
add('screed-wing-1', box(70, 162, 95, true).translate(-744, 468, 127.5), body);
add('screed-arm-1', box(418.5, 35, 38, true).translate(-496, 306, 199), accent);
add('feed-auger', cylinder(558, 48, 10).translate(-418.5, 0, 180), body);

return p.model();
