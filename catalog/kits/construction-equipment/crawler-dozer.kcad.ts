// SPDX-License-Identifier: CC0-1.0
// Tracked earthmoving dozer with broad front blade, engine cover and operator canopy.
meta({
  name: "crawler-dozer",
  license: 'CC0-1.0',
  title: "Crawler dozer",
  description: "Tracked earthmoving dozer with broad front blade, engine cover and operator canopy. Material controls: cab glass, equipment enamel paint, tire and grip rubber, exposed structural steel; weathered and highVisibility presets.",
  tags: ['construction equipment', 'roadworks', 'jobsite', 'low poly', 'CC0'],
  kit: 'construction-equipment',
  category: 'prop',
  origin: 'base',
  compat: ['construction', 'roadworks', 'jobsite', 'site-plan'],
  triangleBudget: 2800
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const cabGlassColor = param('cabGlassColor', '#77a4b0', { label: 'Cab glass' });
const equipmentPaintColor = param('equipmentPaintColor', '#e1a31b', { label: 'Equipment enamel paint' });
const tireRubberColor = param('tireRubberColor', '#252a2d', { label: 'Tire and grip rubber' });
const structuralSteelColor = param('structuralSteelColor', '#89969a', { label: 'Exposed structural steel' });
presets({
  weathered: { cabGlassColor: '#66858b', equipmentPaintColor: '#a87b36', tireRubberColor: '#3a3a37', structuralSteelColor: '#716b61' },
  highVisibility: { cabGlassColor: '#91bdc6', equipmentPaintColor: '#f06b26', tireRubberColor: '#292e31', structuralSteelColor: '#c1c7c2' },
});
const p = assembly('crawler-dozer');
const add = (name, shape, finish = equipmentPaintColor) => p.part(name, shape.scale(scale).color(finish));
add('dozer-track--1-belt', box(1026, 225, 260, true).translate(-27, -306, 130), tireRubberColor);
add('dozer-track--1-roller-0', cylinder(207, 114.4, 12).rotateX(90).translate(-396.36, -202.5, 119.6), structuralSteelColor);
add('dozer-track--1-roller-0-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-396.36, -426.06, 119.6), structuralSteelColor);
add('dozer-track--1-roller-0-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-396.36, -185.94, 119.6), structuralSteelColor);
add('dozer-track--1-roller-1', cylinder(207, 114.4, 12).rotateX(90).translate(-211.68, -202.5, 119.6), structuralSteelColor);
add('dozer-track--1-roller-1-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-211.68, -426.06, 119.6), structuralSteelColor);
add('dozer-track--1-roller-1-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-211.68, -185.94, 119.6), structuralSteelColor);
add('dozer-track--1-roller-2', cylinder(207, 114.4, 12).rotateX(90).translate(-27, -202.5, 119.6), structuralSteelColor);
add('dozer-track--1-roller-2-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-27, -426.06, 119.6), structuralSteelColor);
add('dozer-track--1-roller-2-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-27, -185.94, 119.6), structuralSteelColor);
add('dozer-track--1-roller-3', cylinder(207, 114.4, 12).rotateX(90).translate(157.68, -202.5, 119.6), structuralSteelColor);
add('dozer-track--1-roller-3-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(157.68, -426.06, 119.6), structuralSteelColor);
add('dozer-track--1-roller-3-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(157.68, -185.94, 119.6), structuralSteelColor);
add('dozer-track--1-roller-4', cylinder(207, 114.4, 12).rotateX(90).translate(342.36, -202.5, 119.6), structuralSteelColor);
add('dozer-track--1-roller-4-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(342.36, -426.06, 119.6), structuralSteelColor);
add('dozer-track--1-roller-4-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(342.36, -185.94, 119.6), structuralSteelColor);
add('dozer-track--1-idler-front', cylinder(211.5, 122.2, 12).rotateX(90).translate(393.66, -200.25, 124.8), structuralSteelColor);
add('dozer-track--1-idler-front-hub--1', cylinder(33.84, 46.436, 10).rotateX(90).translate(393.66, -428.67, 124.8), structuralSteelColor);
add('dozer-track--1-idler-front-hub-1', cylinder(33.84, 46.436, 10).rotateX(90).translate(393.66, -183.33, 124.8), structuralSteelColor);
add('dozer-track--1-idler-rear', cylinder(211.5, 122.2, 12).rotateX(90).translate(-447.66, -200.25, 124.8), structuralSteelColor);
add('dozer-track--1-idler-rear-hub--1', cylinder(33.84, 46.436, 10).rotateX(90).translate(-447.66, -428.67, 124.8), structuralSteelColor);
add('dozer-track--1-idler-rear-hub-1', cylinder(33.84, 46.436, 10).rotateX(90).translate(-447.66, -183.33, 124.8), structuralSteelColor);
add('dozer-track-1-belt', box(1026, 225, 260, true).translate(-27, 306, 130), tireRubberColor);
add('dozer-track-1-roller-0', cylinder(207, 114.4, 12).rotateX(90).translate(-396.36, 409.5, 119.6), structuralSteelColor);
add('dozer-track-1-roller-0-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-396.36, 185.94, 119.6), structuralSteelColor);
add('dozer-track-1-roller-0-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-396.36, 426.06, 119.6), structuralSteelColor);
add('dozer-track-1-roller-1', cylinder(207, 114.4, 12).rotateX(90).translate(-211.68, 409.5, 119.6), structuralSteelColor);
add('dozer-track-1-roller-1-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-211.68, 185.94, 119.6), structuralSteelColor);
add('dozer-track-1-roller-1-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-211.68, 426.06, 119.6), structuralSteelColor);
add('dozer-track-1-roller-2', cylinder(207, 114.4, 12).rotateX(90).translate(-27, 409.5, 119.6), structuralSteelColor);
add('dozer-track-1-roller-2-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-27, 185.94, 119.6), structuralSteelColor);
add('dozer-track-1-roller-2-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(-27, 426.06, 119.6), structuralSteelColor);
add('dozer-track-1-roller-3', cylinder(207, 114.4, 12).rotateX(90).translate(157.68, 409.5, 119.6), structuralSteelColor);
add('dozer-track-1-roller-3-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(157.68, 185.94, 119.6), structuralSteelColor);
add('dozer-track-1-roller-3-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(157.68, 426.06, 119.6), structuralSteelColor);
add('dozer-track-1-roller-4', cylinder(207, 114.4, 12).rotateX(90).translate(342.36, 409.5, 119.6), structuralSteelColor);
add('dozer-track-1-roller-4-hub--1', cylinder(33.12, 43.472, 10).rotateX(90).translate(342.36, 185.94, 119.6), structuralSteelColor);
add('dozer-track-1-roller-4-hub-1', cylinder(33.12, 43.472, 10).rotateX(90).translate(342.36, 426.06, 119.6), structuralSteelColor);
add('dozer-track-1-idler-front', cylinder(211.5, 122.2, 12).rotateX(90).translate(393.66, 411.75, 124.8), structuralSteelColor);
add('dozer-track-1-idler-front-hub--1', cylinder(33.84, 46.436, 10).rotateX(90).translate(393.66, 183.33, 124.8), structuralSteelColor);
add('dozer-track-1-idler-front-hub-1', cylinder(33.84, 46.436, 10).rotateX(90).translate(393.66, 428.67, 124.8), structuralSteelColor);
add('dozer-track-1-idler-rear', cylinder(211.5, 122.2, 12).rotateX(90).translate(-447.66, 411.75, 124.8), structuralSteelColor);
add('dozer-track-1-idler-rear-hub--1', cylinder(33.84, 46.436, 10).rotateX(90).translate(-447.66, 183.33, 124.8), structuralSteelColor);
add('dozer-track-1-idler-rear-hub-1', cylinder(33.84, 46.436, 10).rotateX(90).translate(-447.66, 428.67, 124.8), structuralSteelColor);
add('dozer-chassis', box(877.5, 450, 220, true).translate(0, 0, 370), structuralSteelColor);
add('engine-hood', box(432, 414, 300, true).translate(-270, 0, 630), equipmentPaintColor);
add('operator-cab', box(337.5, 378, 360, true).translate(216, 0, 650), equipmentPaintColor);
add('cab-roof', box(405, 423, 46, true).translate(216, 0, 853), equipmentPaintColor);
add('blade-face', box(95, 1008, 400, true).translate(648, 0, 290), structuralSteelColor);
add('blade-lift-arm--1', box(432, 72, 75, true).translate(445.5, -342, 317.5), structuralSteelColor);
add('blade-lift-arm-1', box(432, 72, 75, true).translate(445.5, 342, 317.5), structuralSteelColor);

add('front-grille', path().moveTo(-68.40, -113.40).lineTo(68.40, -113.40).lineTo(57.60, 113.40).lineTo(-57.60, 113.40).close().extrude(16).rotateY(90).translate(389.75, 0.00, 578.00), structuralSteelColor);
add('headlamp-near', box(22, 56.70, 34.20, true).translate(394.75, -117.18, 556.40), cabGlassColor);
add('headlamp-far', box(22, 56.70, 34.20, true).translate(394.75, 117.18, 556.40), cabGlassColor);
add('mirror-arm-left', box(42, 18, 24, true).rotateY(-18).translate(310.50, -234.36, 693.20), structuralSteelColor);
add('mirror-arm-right', box(42, 18, 24, true).rotateY(-18).translate(310.50, 234.36, 693.20), structuralSteelColor);
add('mirror-glass-left', box(18, 48, 66, true).translate(334.12, -257.04, 714.80), cabGlassColor);
add('mirror-glass-right', box(18, 48, 66, true).translate(334.12, 257.04, 714.80), cabGlassColor);
add('cab-step', box(94.50, 54, 36, true).translate(263.25, -213.00, 498.80), structuralSteelColor);
add('cab-door-handle', box(28, 16, 12, true).translate(273.38, -199.00, 642.80), structuralSteelColor);
add('cab-windshield', box(16, 234.36, 97.20, true).rotateY(-7).translate(394.75, 0.00, 696.80), cabGlassColor);
add('cab-side-glazing-far', box(101.25, 14, 90.00, true).translate(199.12, 196.00, 743.60), cabGlassColor);

const hydraulicStrut = (from: [number, number, number], to: [number, number, number], radius: number) => {
  const dx = to[0] - from[0]; const dz = to[2] - from[2];
  return cylinder(Math.hypot(dx, dz), radius, 8).rotateY(Math.atan2(dx, dz) * 180 / Math.PI)
    .translate((from[0] + to[0]) / 2, from[1], (from[2] + to[2]) / 2);
};
add('blade-cheek-left', box(125, 76, 338, true).rotateY(-17).translate(622, -454, 300), equipmentPaintColor);
add('blade-cheek-right', box(125, 76, 338, true).rotateY(17).translate(622, 454, 300), equipmentPaintColor);
add('blade-lift-ram-left', hydraulicStrut([353, -318, 345], [532, -318, 455], 29), structuralSteelColor);
add('blade-lift-ram-right', hydraulicStrut([353, 318, 345], [532, 318, 455], 29), structuralSteelColor);

add('dozer-track-shoe-left-1', box(118, 30, 34, true).translate(-390, -421, 255), tireRubberColor);
add('dozer-track-shoe-left-2', box(118, 30, 34, true).translate(-230, -421, 255), tireRubberColor);
add('dozer-track-shoe-left-3', box(118, 30, 34, true).translate(-70, -421, 255), tireRubberColor);
add('dozer-track-shoe-left-4', box(118, 30, 34, true).translate(90, -421, 255), tireRubberColor);
add('dozer-track-shoe-left-5', box(118, 30, 34, true).translate(250, -421, 255), tireRubberColor);
add('dozer-track-shoe-left-6', box(118, 30, 34, true).translate(390, -421, 255), tireRubberColor);
add('dozer-track-shoe-right-1', box(118, 30, 34, true).translate(-390, 421, 255), tireRubberColor);
add('dozer-track-shoe-right-2', box(118, 30, 34, true).translate(-230, 421, 255), tireRubberColor);
add('dozer-track-shoe-right-3', box(118, 30, 34, true).translate(-70, 421, 255), tireRubberColor);
add('dozer-track-shoe-right-4', box(118, 30, 34, true).translate(90, 421, 255), tireRubberColor);
add('dozer-track-shoe-right-5', box(118, 30, 34, true).translate(250, 421, 255), tireRubberColor);
add('dozer-track-shoe-right-6', box(118, 30, 34, true).translate(390, 421, 255), tireRubberColor);

return p.model();