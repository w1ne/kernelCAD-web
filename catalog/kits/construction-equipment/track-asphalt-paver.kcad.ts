// SPDX-License-Identifier: CC0-1.0
// Tracked paving machine with front material hopper, operator canopy, feeder deck and rear screed.
meta({
  name: "track-asphalt-paver",
  license: 'CC0-1.0',
  title: "Tracked asphalt paver",
  description: "Tracked paving machine with front material hopper, operator canopy, feeder deck and rear screed. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('track-asphalt-paver');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('crawler--1-belt', box(1116, 198, 210, true).translate(-31, -315, 105), tireRubberColor);
add('crawler--1-roller-0', cylinder(182.16, 92.4, 12).rotateX(90).translate(-432.76, -223.92, 96.6), structuralSteelColor);
add('crawler--1-roller-0-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-432.76, -420.653, 96.6), structuralSteelColor);
add('crawler--1-roller-0-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-432.76, -209.347, 96.6), structuralSteelColor);
add('crawler--1-roller-1', cylinder(182.16, 92.4, 12).rotateX(90).translate(-164.92, -223.92, 96.6), structuralSteelColor);
add('crawler--1-roller-1-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-164.92, -420.653, 96.6), structuralSteelColor);
add('crawler--1-roller-1-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-164.92, -209.347, 96.6), structuralSteelColor);
add('crawler--1-roller-2', cylinder(182.16, 92.4, 12).rotateX(90).translate(102.92, -223.92, 96.6), structuralSteelColor);
add('crawler--1-roller-2-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(102.92, -420.653, 96.6), structuralSteelColor);
add('crawler--1-roller-2-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(102.92, -209.347, 96.6), structuralSteelColor);
add('crawler--1-roller-3', cylinder(182.16, 92.4, 12).rotateX(90).translate(370.76, -223.92, 96.6), structuralSteelColor);
add('crawler--1-roller-3-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(370.76, -420.653, 96.6), structuralSteelColor);
add('crawler--1-roller-3-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(370.76, -209.347, 96.6), structuralSteelColor);
add('crawler--1-idler-front', cylinder(186.12, 98.7, 12).rotateX(90).translate(426.56, -221.94, 100.8), structuralSteelColor);
add('crawler--1-idler-front-hub--1', cylinder(29.779, 37.506, 10).rotateX(90).translate(426.56, -422.95, 100.8), structuralSteelColor);
add('crawler--1-idler-front-hub-1', cylinder(29.779, 37.506, 10).rotateX(90).translate(426.56, -207.05, 100.8), structuralSteelColor);
add('crawler--1-idler-rear', cylinder(186.12, 98.7, 12).rotateX(90).translate(-488.56, -221.94, 100.8), structuralSteelColor);
add('crawler--1-idler-rear-hub--1', cylinder(29.779, 37.506, 10).rotateX(90).translate(-488.56, -422.95, 100.8), structuralSteelColor);
add('crawler--1-idler-rear-hub-1', cylinder(29.779, 37.506, 10).rotateX(90).translate(-488.56, -207.05, 100.8), structuralSteelColor);
add('crawler-1-belt', box(1116, 198, 210, true).translate(-31, 315, 105), tireRubberColor);
add('crawler-1-roller-0', cylinder(182.16, 92.4, 12).rotateX(90).translate(-432.76, 406.08, 96.6), structuralSteelColor);
add('crawler-1-roller-0-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-432.76, 209.347, 96.6), structuralSteelColor);
add('crawler-1-roller-0-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-432.76, 420.653, 96.6), structuralSteelColor);
add('crawler-1-roller-1', cylinder(182.16, 92.4, 12).rotateX(90).translate(-164.92, 406.08, 96.6), structuralSteelColor);
add('crawler-1-roller-1-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-164.92, 209.347, 96.6), structuralSteelColor);
add('crawler-1-roller-1-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(-164.92, 420.653, 96.6), structuralSteelColor);
add('crawler-1-roller-2', cylinder(182.16, 92.4, 12).rotateX(90).translate(102.92, 406.08, 96.6), structuralSteelColor);
add('crawler-1-roller-2-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(102.92, 209.347, 96.6), structuralSteelColor);
add('crawler-1-roller-2-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(102.92, 420.653, 96.6), structuralSteelColor);
add('crawler-1-roller-3', cylinder(182.16, 92.4, 12).rotateX(90).translate(370.76, 406.08, 96.6), structuralSteelColor);
add('crawler-1-roller-3-hub--1', cylinder(29.146, 35.112, 10).rotateX(90).translate(370.76, 209.347, 96.6), structuralSteelColor);
add('crawler-1-roller-3-hub-1', cylinder(29.146, 35.112, 10).rotateX(90).translate(370.76, 420.653, 96.6), structuralSteelColor);
add('crawler-1-idler-front', cylinder(186.12, 98.7, 12).rotateX(90).translate(426.56, 408.06, 100.8), structuralSteelColor);
add('crawler-1-idler-front-hub--1', cylinder(29.779, 37.506, 10).rotateX(90).translate(426.56, 207.05, 100.8), structuralSteelColor);
add('crawler-1-idler-front-hub-1', cylinder(29.779, 37.506, 10).rotateX(90).translate(426.56, 422.95, 100.8), structuralSteelColor);
add('crawler-1-idler-rear', cylinder(186.12, 98.7, 12).rotateX(90).translate(-488.56, 408.06, 100.8), structuralSteelColor);
add('crawler-1-idler-rear-hub--1', cylinder(29.779, 37.506, 10).rotateX(90).translate(-488.56, 207.05, 100.8), structuralSteelColor);
add('crawler-1-idler-rear-hub-1', cylinder(29.779, 37.506, 10).rotateX(90).translate(-488.56, 422.95, 100.8), structuralSteelColor);
add('main-deck', box(1116, 522, 230, true).translate(0, 0, 335), equipmentPaintColor);
const hopperProfile = (width: number, depth: number) => path()
  .moveTo(-width / 2, -depth / 2).lineTo(width / 2, -depth / 2)
  .lineTo(width / 2, depth / 2).lineTo(-width / 2, depth / 2).close();
const paverHopper = hopperProfile(280, 430).loft([hopperProfile(470, 720)], {
  planes: [
    { plane: 'XY' as const, origin: [527, 0, 300] as [number, number, number] },
    { plane: 'XY' as const, origin: [527, 0, 660] as [number, number, number] },
  ], ruled: true,
});
add('material-hopper', paverHopper, equipmentPaintColor);
add('hopper-wing-left', box(310, 72, 340, true).translate(527, -306, 480), equipmentPaintColor);
add('hopper-wing-right', box(310, 72, 340, true).translate(527, 306, 480), equipmentPaintColor);
add('operator-platform', box(387.5, 378, 50, true).translate(-201.5, 0, 475), equipmentPaintColor);
add('canopy-posts', box(32, 315, 320, true).translate(-186, 0, 660), equipmentPaintColor);
add('canopy-roof', box(651, 495, 50, true).translate(-186, 0, 845), equipmentPaintColor);
add('feeder-deck', box(527, 378, 85, true).translate(-573.5, 0, 192.5), equipmentPaintColor);
add('screed-main', box(68, 828, 120, true).translate(-744, 0, 125), structuralSteelColor);
add('screed-wing--1', box(70, 162, 95, true).translate(-744, -468, 127.5), structuralSteelColor);
add('screed-arm--1', box(418.5, 35, 38, true).translate(-496, -306, 199), structuralSteelColor);
add('screed-wing-1', box(70, 162, 95, true).translate(-744, 468, 127.5), structuralSteelColor);
add('screed-arm-1', box(418.5, 35, 38, true).translate(-496, 306, 199), structuralSteelColor);
add('feed-auger', cylinder(558, 48, 10).translate(-418.5, 0, 180), equipmentPaintColor);

add('paver-track-shoe-left-1', box(124, 30, 28, true).translate(-390, -414, 210), tireRubberColor);
add('paver-track-shoe-left-2', box(124, 30, 28, true).translate(-220, -414, 210), tireRubberColor);
add('paver-track-shoe-left-3', box(124, 30, 28, true).translate(-50, -414, 210), tireRubberColor);
add('paver-track-shoe-left-4', box(124, 30, 28, true).translate(120, -414, 210), tireRubberColor);
add('paver-track-shoe-left-5', box(124, 30, 28, true).translate(290, -414, 210), tireRubberColor);
add('paver-track-shoe-left-6', box(124, 30, 28, true).translate(430, -414, 210), tireRubberColor);
add('paver-track-shoe-right-1', box(124, 30, 28, true).translate(-390, 414, 210), tireRubberColor);
add('paver-track-shoe-right-2', box(124, 30, 28, true).translate(-220, 414, 210), tireRubberColor);
add('paver-track-shoe-right-3', box(124, 30, 28, true).translate(-50, 414, 210), tireRubberColor);
add('paver-track-shoe-right-4', box(124, 30, 28, true).translate(120, 414, 210), tireRubberColor);
add('paver-track-shoe-right-5', box(124, 30, 28, true).translate(290, 414, 210), tireRubberColor);
add('paver-track-shoe-right-6', box(124, 30, 28, true).translate(430, 414, 210), tireRubberColor);

return p.model();
