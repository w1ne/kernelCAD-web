// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly crawler dozer scene prop, modeled from scratch.
meta({
  name: "crawler-dozer",
  license: 'CC0-1.0',
  title: "Crawler dozer",
  description: "Tracked earthmoving dozer with broad front blade, engine cover and operator canopy. Knobs: overall scale, body color and accent color.",
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
const p = assembly('crawler-dozer');
const add = (name, shape, finish = body) => p.part(name, shape.scale(scale).color(finish));
add('dozer-track--1-belt', box(1026, 225, 260, true).translate(-27, -306, 130), body);
add('dozer-track--1-roller-0', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(-396.36, -202.5, 119.6), "#40474b");
add('dozer-track--1-roller-0-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-396.36, -426.06, 119.6), accent);
add('dozer-track--1-roller-0-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-396.36, -185.94, 119.6), accent);
add('dozer-track--1-roller-1', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(-211.68, -202.5, 119.6), "#40474b");
add('dozer-track--1-roller-1-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-211.68, -426.06, 119.6), accent);
add('dozer-track--1-roller-1-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-211.68, -185.94, 119.6), accent);
add('dozer-track--1-roller-2', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(-27, -202.5, 119.6), "#40474b");
add('dozer-track--1-roller-2-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-27, -426.06, 119.6), accent);
add('dozer-track--1-roller-2-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-27, -185.94, 119.6), accent);
add('dozer-track--1-roller-3', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(157.68, -202.5, 119.6), "#40474b");
add('dozer-track--1-roller-3-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(157.68, -426.06, 119.6), accent);
add('dozer-track--1-roller-3-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(157.68, -185.94, 119.6), accent);
add('dozer-track--1-roller-4', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(342.36, -202.5, 119.6), "#40474b");
add('dozer-track--1-roller-4-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(342.36, -426.06, 119.6), accent);
add('dozer-track--1-roller-4-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(342.36, -185.94, 119.6), accent);
add('dozer-track--1-idler-front', cylinder(211.5, 122.2, 12).rotate([1, 0, 0], 90).translate(393.66, -200.25, 124.8), "#40474b");
add('dozer-track--1-idler-front-hub--1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(393.66, -428.67, 124.8), accent);
add('dozer-track--1-idler-front-hub-1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(393.66, -183.33, 124.8), accent);
add('dozer-track--1-idler-rear', cylinder(211.5, 122.2, 12).rotate([1, 0, 0], 90).translate(-447.66, -200.25, 124.8), "#40474b");
add('dozer-track--1-idler-rear-hub--1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(-447.66, -428.67, 124.8), accent);
add('dozer-track--1-idler-rear-hub-1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(-447.66, -183.33, 124.8), accent);
add('dozer-track-1-belt', box(1026, 225, 260, true).translate(-27, 306, 130), body);
add('dozer-track-1-roller-0', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(-396.36, 409.5, 119.6), "#40474b");
add('dozer-track-1-roller-0-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-396.36, 185.94, 119.6), accent);
add('dozer-track-1-roller-0-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-396.36, 426.06, 119.6), accent);
add('dozer-track-1-roller-1', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(-211.68, 409.5, 119.6), "#40474b");
add('dozer-track-1-roller-1-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-211.68, 185.94, 119.6), accent);
add('dozer-track-1-roller-1-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-211.68, 426.06, 119.6), accent);
add('dozer-track-1-roller-2', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(-27, 409.5, 119.6), "#40474b");
add('dozer-track-1-roller-2-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-27, 185.94, 119.6), accent);
add('dozer-track-1-roller-2-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(-27, 426.06, 119.6), accent);
add('dozer-track-1-roller-3', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(157.68, 409.5, 119.6), "#40474b");
add('dozer-track-1-roller-3-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(157.68, 185.94, 119.6), accent);
add('dozer-track-1-roller-3-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(157.68, 426.06, 119.6), accent);
add('dozer-track-1-roller-4', cylinder(207, 114.4, 12).rotate([1, 0, 0], 90).translate(342.36, 409.5, 119.6), "#40474b");
add('dozer-track-1-roller-4-hub--1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(342.36, 185.94, 119.6), accent);
add('dozer-track-1-roller-4-hub-1', cylinder(33.12, 43.472, 10).rotate([1, 0, 0], 90).translate(342.36, 426.06, 119.6), accent);
add('dozer-track-1-idler-front', cylinder(211.5, 122.2, 12).rotate([1, 0, 0], 90).translate(393.66, 411.75, 124.8), "#40474b");
add('dozer-track-1-idler-front-hub--1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(393.66, 183.33, 124.8), accent);
add('dozer-track-1-idler-front-hub-1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(393.66, 428.67, 124.8), accent);
add('dozer-track-1-idler-rear', cylinder(211.5, 122.2, 12).rotate([1, 0, 0], 90).translate(-447.66, 411.75, 124.8), "#40474b");
add('dozer-track-1-idler-rear-hub--1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(-447.66, 183.33, 124.8), accent);
add('dozer-track-1-idler-rear-hub-1', cylinder(33.84, 46.436, 10).rotate([1, 0, 0], 90).translate(-447.66, 428.67, 124.8), accent);
add('dozer-chassis', box(877.5, 450, 220, true).translate(0, 0, 370), body);
add('engine-hood', box(432, 414, 300, true).translate(-270, 0, 630), accent);
add('operator-cab', box(337.5, 378, 360, true).translate(216, 0, 650), body);
add('cab-roof', box(405, 423, 46, true).translate(216, 0, 853), accent);
add('blade-face', box(95, 1008, 400, true).translate(648, 0, 290), accent);
add('blade-lift-arm--1', box(432, 72, 75, true).translate(445.5, -342, 317.5), body);
add('blade-lift-arm-1', box(432, 72, 75, true).translate(445.5, 342, 317.5), body);

return p.model();
