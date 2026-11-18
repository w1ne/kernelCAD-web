// SPDX-License-Identifier: CC0-1.0
// Portable grain auger with intake hopper, segmented tube, transport wheels and support stand.
meta({
  name: "farm-grain-auger",
  license: 'CC0-1.0',
  title: "Farm grain auger",
  description: "Portable grain auger with intake hopper, segmented tube, transport wheels and support stand. Editable scale and painted steel, rubber, exposed steel, crop material controls with weathered and high-visibility presets.",
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
const p = assembly('farm-grain-auger');
const groundOffset = 0;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('intake-hopper', slopedPrism(620, 420, 360).translate(0, -1050, 300), paintedSteelColor);
add('inclined-auger-tube', cylinder(2500, 78, 16).rotate([1, 0, 0], -38).translate(0, -1050, 420), steelColor);
add('auger-inlet-collar', cylinder(120, 92, 16).rotate([1, 0, 0], -38).translate(0, -1058, 415), paintedSteelColor);
add('discharge-head', box(220, 250, 180, true).rotate([1, 0, 0], -38).translate(0, 895, 1945), paintedSteelColor);
add('support-rail-left', box(55, 2700, 55, true).rotate([1, 0, 0], 38).translate(-128, 14, 1112), steelColor);
add('support-rail-right', box(55, 2700, 55, true).rotate([1, 0, 0], 38).translate(128, 14, 1112), steelColor);
add('wheel-axle', cylinder(680, 34, 12).rotate([0, 1, 0], 90).translate(-340, -850, 140), steelColor);
add('transport-wheel-left', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(-390, -850, 140), rubberColor);
add('transport-wheel-right', cylinder(70, 140, 12).rotate([0, 1, 0], 90).translate(320, -850, 140), rubberColor);
add('lower-crossmember', box(500, 65, 65, true).translate(0, -850, 500), steelColor);
add('support-leg-left', box(55, 55, 340, true).translate(-128, -850, 330), steelColor);
add('support-leg-right', box(55, 55, 340, true).translate(128, -850, 330), steelColor);
add('grain-feed', box(360, 150, 110, true).translate(0, -980, 475), cropMaterialColor);
return p.model();
