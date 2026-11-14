// SPDX-License-Identifier: CC0-1.0
// Road milling machine with enclosed cutter housing, operator canopy and crawler undercarriage.
meta({
  name: "cold-planer-milling-machine",
  license: 'CC0-1.0',
  title: "Cold planer milling machine",
  description: "Road milling machine with enclosed cutter housing, operator canopy and crawler undercarriage. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('cold-planer-milling-machine');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('milling-track--1-belt', box(1035, 209, 230, true).translate(-27.6, -323, 115), tireRubberColor);
add('milling-track--1-roller-0', cylinder(192.28, 101.2, 12).rotateX(90).translate(-400.2, -226.86, 105.8), structuralSteelColor);
add('milling-track--1-roller-0-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-400.2, -434.522, 105.8), structuralSteelColor);
add('milling-track--1-roller-0-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-400.2, -211.478, 105.8), structuralSteelColor);
add('milling-track--1-roller-1', cylinder(192.28, 101.2, 12).rotateX(90).translate(-151.8, -226.86, 105.8), structuralSteelColor);
add('milling-track--1-roller-1-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-151.8, -434.522, 105.8), structuralSteelColor);
add('milling-track--1-roller-1-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-151.8, -211.478, 105.8), structuralSteelColor);
add('milling-track--1-roller-2', cylinder(192.28, 101.2, 12).rotateX(90).translate(96.6, -226.86, 105.8), structuralSteelColor);
add('milling-track--1-roller-2-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(96.6, -434.522, 105.8), structuralSteelColor);
add('milling-track--1-roller-2-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(96.6, -211.478, 105.8), structuralSteelColor);
add('milling-track--1-roller-3', cylinder(192.28, 101.2, 12).rotateX(90).translate(345, -226.86, 105.8), structuralSteelColor);
add('milling-track--1-roller-3-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(345, -434.522, 105.8), structuralSteelColor);
add('milling-track--1-roller-3-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(345, -211.478, 105.8), structuralSteelColor);
add('milling-track--1-idler-front', cylinder(196.46, 108.1, 12).rotateX(90).translate(396.75, -224.77, 110.4), structuralSteelColor);
add('milling-track--1-idler-front-hub--1', cylinder(31.434, 41.078, 10).rotateX(90).translate(396.75, -436.947, 110.4), structuralSteelColor);
add('milling-track--1-idler-front-hub-1', cylinder(31.434, 41.078, 10).rotateX(90).translate(396.75, -209.053, 110.4), structuralSteelColor);
add('milling-track--1-idler-rear', cylinder(196.46, 108.1, 12).rotateX(90).translate(-451.95, -224.77, 110.4), structuralSteelColor);
add('milling-track--1-idler-rear-hub--1', cylinder(31.434, 41.078, 10).rotateX(90).translate(-451.95, -436.947, 110.4), structuralSteelColor);
add('milling-track--1-idler-rear-hub-1', cylinder(31.434, 41.078, 10).rotateX(90).translate(-451.95, -209.053, 110.4), structuralSteelColor);
add('milling-track-1-belt', box(1035, 209, 230, true).translate(-27.6, 323, 115), tireRubberColor);
add('milling-track-1-roller-0', cylinder(192.28, 101.2, 12).rotateX(90).translate(-400.2, 419.14, 105.8), structuralSteelColor);
add('milling-track-1-roller-0-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-400.2, 211.478, 105.8), structuralSteelColor);
add('milling-track-1-roller-0-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-400.2, 434.522, 105.8), structuralSteelColor);
add('milling-track-1-roller-1', cylinder(192.28, 101.2, 12).rotateX(90).translate(-151.8, 419.14, 105.8), structuralSteelColor);
add('milling-track-1-roller-1-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-151.8, 211.478, 105.8), structuralSteelColor);
add('milling-track-1-roller-1-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(-151.8, 434.522, 105.8), structuralSteelColor);
add('milling-track-1-roller-2', cylinder(192.28, 101.2, 12).rotateX(90).translate(96.6, 419.14, 105.8), structuralSteelColor);
add('milling-track-1-roller-2-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(96.6, 211.478, 105.8), structuralSteelColor);
add('milling-track-1-roller-2-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(96.6, 434.522, 105.8), structuralSteelColor);
add('milling-track-1-roller-3', cylinder(192.28, 101.2, 12).rotateX(90).translate(345, 419.14, 105.8), structuralSteelColor);
add('milling-track-1-roller-3-hub--1', cylinder(30.765, 38.456, 10).rotateX(90).translate(345, 211.478, 105.8), structuralSteelColor);
add('milling-track-1-roller-3-hub-1', cylinder(30.765, 38.456, 10).rotateX(90).translate(345, 434.522, 105.8), structuralSteelColor);
add('milling-track-1-idler-front', cylinder(196.46, 108.1, 12).rotateX(90).translate(396.75, 421.23, 110.4), structuralSteelColor);
add('milling-track-1-idler-front-hub--1', cylinder(31.434, 41.078, 10).rotateX(90).translate(396.75, 209.053, 110.4), structuralSteelColor);
add('milling-track-1-idler-front-hub-1', cylinder(31.434, 41.078, 10).rotateX(90).translate(396.75, 436.947, 110.4), structuralSteelColor);
add('milling-track-1-idler-rear', cylinder(196.46, 108.1, 12).rotateX(90).translate(-451.95, 421.23, 110.4), structuralSteelColor);
add('milling-track-1-idler-rear-hub--1', cylinder(31.434, 41.078, 10).rotateX(90).translate(-451.95, 209.053, 110.4), structuralSteelColor);
add('milling-track-1-idler-rear-hub-1', cylinder(31.434, 41.078, 10).rotateX(90).translate(-451.95, 436.947, 110.4), structuralSteelColor);
add('main-frame', box(993.6, 551, 230, true).translate(0, 0, 355), structuralSteelColor);
add('engine-cover', box(524.4, 475, 391, true).translate(-248.4, 0, 665.5), equipmentPaintColor);
add('operator-deck', box(276, 361, 42, true).translate(248.4, 0, 471), equipmentPaintColor);
add('canopy-posts', box(32, 323, 368, true).translate(248.4, 0, 676), equipmentPaintColor);
add('canopy', box(496.8, 418, 48, true).translate(248.4, 0, 884), equipmentPaintColor);
add('milling-hood', box(345, 779, 250, true).translate(496.8, 0, 165), equipmentPaintColor);
add('cutter-drum', cylinder(712.5, 120, 12).rotateX(90).translate(538.2, 356.25, 120), structuralSteelColor);
add('cutter-drum-hub--1', cylinder(114, 45.6, 10).rotateX(90).translate(538.2, -413.25, 120), structuralSteelColor);
add('cutter-drum-hub-1', cylinder(114, 45.6, 10).rotateX(90).translate(538.2, 413.25, 120), structuralSteelColor);
add('cutting-tooth-0', box(30, 703, 30, true).translate(386.4, 0, 57), equipmentPaintColor);
add('cutting-tooth-1', box(30, 703, 30, true).translate(434.7, 0, 57), equipmentPaintColor);
add('cutting-tooth-2', box(30, 703, 30, true).translate(483, 0, 57), equipmentPaintColor);
add('cutting-tooth-3', box(30, 703, 30, true).translate(531.3, 0, 57), equipmentPaintColor);
add('cutting-tooth-4', box(30, 703, 30, true).translate(579.6, 0, 57), equipmentPaintColor);
add('cutting-tooth-5', box(30, 703, 30, true).translate(627.9, 0, 57), equipmentPaintColor);
add('cutting-tooth-6', box(30, 703, 30, true).translate(676.2, 0, 57), equipmentPaintColor);

return p.model();
