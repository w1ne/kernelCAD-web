// SPDX-License-Identifier: CC0-1.0
// Self-propelled slab saw with operator seat, blade guard and water tank.
meta({
  name: "ride-on-concrete-saw",
  license: 'CC0-1.0',
  title: "Ride-on concrete saw",
  description: "Self-propelled slab saw with operator seat, blade guard and water tank. Material controls: equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
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
const p = assembly('ride-on-concrete-saw');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('saw-wheel-0--1', cylinder(64, 100, 12).rotateX(90).translate(-273, -180.38, 100), tireRubberColor);
add('saw-wheel-0--1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(-273, -249.5, 100), structuralSteelColor);
add('saw-wheel-0--1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(-273, -175.26, 100), structuralSteelColor);
add('saw-wheel-0-1', cylinder(64, 100, 12).rotateX(90).translate(-273, 244.38, 100), tireRubberColor);
add('saw-wheel-0-1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(-273, 175.26, 100), structuralSteelColor);
add('saw-wheel-0-1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(-273, 249.5, 100), structuralSteelColor);
add('saw-wheel-1--1', cylinder(64, 100, 12).rotateX(90).translate(283.5, -180.38, 100), tireRubberColor);
add('saw-wheel-1--1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(283.5, -249.5, 100), structuralSteelColor);
add('saw-wheel-1--1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(283.5, -175.26, 100), structuralSteelColor);
add('saw-wheel-1-1', cylinder(64, 100, 12).rotateX(90).translate(283.5, 244.38, 100), tireRubberColor);
add('saw-wheel-1-1-hub--1', cylinder(10.24, 38, 10).rotateX(90).translate(283.5, 175.26, 100), structuralSteelColor);
add('saw-wheel-1-1-hub-1', cylinder(10.24, 38, 10).rotateX(90).translate(283.5, 249.5, 100), structuralSteelColor);
add('saw-frame', box(756, 420, 100, true).translate(0, 0, 230), structuralSteelColor);
add('engine-cover', box(336, 336, 278.8, true).translate(126, 0, 419.4), equipmentPaintColor);
add('blade', cylinder(42, 205, 12).translate(357, 0, 95), structuralSteelColor);
add('blade-guard', box(100, 364, 246, true).translate(357, 0, 223), structuralSteelColor);
add('operator-seat', box(180, 170, 90, true).translate(-210, 0, 335), equipmentPaintColor);
add('water-tank', box(190, 252, 130, true).translate(-126, 0, 435), equipmentPaintColor);

return p.model();
