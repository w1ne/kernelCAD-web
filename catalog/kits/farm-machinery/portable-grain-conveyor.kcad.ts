// SPDX-License-Identifier: CC0-1.0
// Mobile belt conveyor with a raised delivery end, tubular frame, hopper and axle wheels.
meta({
  name: "portable-grain-conveyor",
  license: 'CC0-1.0',
  title: "Portable grain conveyor",
  description: "Mobile belt conveyor with a raised delivery end, tubular frame, hopper and axle wheels. Editable scale and painted steel, rubber, exposed steel, crop material controls with weathered and high-visibility presets.",
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
const cropMaterialColor = param('cropMaterialColor', '#b59a54', { label: 'Crop material' });
presets({
  weathered: { paintedSteelColor: '#53694d', rubberColor: '#252927', steelColor: '#737d7b', cropMaterialColor: '#947d49' },
  highVisibility: { paintedSteelColor: '#db762c', rubberColor: '#292e2d', steelColor: '#abb2ad', cropMaterialColor: '#d0ae4f' },
});
const slopedPrism = (width:number, depth:number, height:number) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const inset = width * 0.16;
  return path().moveTo(-halfWidth, -halfHeight)
    .lineTo(halfWidth, -halfHeight)
    .lineTo(halfWidth - inset, halfHeight)
    .lineTo(-halfWidth + inset, halfHeight)
    .close().extrude(depth).rotate([1, 0, 0], 90).translate(0, depth / 2, 0);
};
const p = assembly('portable-grain-conveyor');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('intake-hopper', slopedPrism(800, 420, 360).translate(0, -1080, 280), paintedSteelColor);
add('inclined-belt-bed', box(880, 2600, 85, true).rotate([1, 0, 0], 38).translate(0, -100, 1180), paintedSteelColor);
add('rubber-conveyor-belt', box(760, 2500, 26, true).rotate([1, 0, 0], 38).translate(0, -100, 1235), rubberColor);
add('side-rail-left', box(60, 2600, 135, true).rotate([1, 0, 0], 38).translate(-455, -100, 1230), steelColor);
add('side-rail-right', box(60, 2600, 135, true).rotate([1, 0, 0], 38).translate(455, -100, 1230), steelColor);
add('belt-roller-0', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, -943.2, 520.9), steelColor);
add('belt-roller-1', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, -702.8, 708.8), steelColor);
add('belt-roller-2', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, -462.5, 896.6), steelColor);
add('belt-roller-3', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, -222.1, 1084.5), steelColor);
add('belt-roller-4', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, 18.2, 1272.4), steelColor);
add('belt-roller-5', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, 258.5, 1460.3), steelColor);
add('belt-roller-6', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, 498.9, 1648.2), steelColor);
add('belt-roller-7', cylinder(780, 26, 10).rotate([0, 1, 0], 90).translate(-390, 739.2, 1836.0), steelColor);
add('discharge-chute', slopedPrism(300, 260, 250).rotate([1, 0, 0], 38).translate(0, 940, 1940), paintedSteelColor);
add('transport-axle', cylinder(1080, 34, 12).rotate([0, 1, 0], 90).translate(-540, -850, 140), steelColor);
add('transport-wheel-left', cylinder(75, 145, 12).rotate([0, 1, 0], 90).translate(-590, -850, 145), rubberColor);
add('transport-wheel-right', cylinder(75, 145, 12).rotate([0, 1, 0], 90).translate(515, -850, 145), rubberColor);
add('support-leg-left', box(60, 60, 570, true).translate(-400, -850, 285), steelColor);
add('support-leg-right', box(60, 60, 570, true).translate(400, -850, 285), steelColor);
add('wheel-crossmember', box(850, 70, 70, true).translate(0, -850, 570), steelColor);
add('grain-feed', box(480, 180, 130, true).translate(0, -1050, 510), cropMaterialColor);
return p.model();
