// SPDX-License-Identifier: CC0-1.0
// Row-crop corn header with multiple tapered snouts, gathering chains and cross auger.
meta({
  name: "corn-header",
  license: 'CC0-1.0',
  title: "Corn header",
  description: "Row-crop corn header with multiple tapered snouts, gathering chains and cross auger. Editable scale and painted steel, exposed steel controls with weathered and high-visibility presets.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });

const paintedSteelColor = param('paintedSteelColor', '#397747', { label: 'Painted steel' });
const steelColor = param('steelColor', '#929b9b', { label: 'Exposed steel' });
presets({
  weathered: { paintedSteelColor: '#53694d', steelColor: '#737d7b' },
  highVisibility: { paintedSteelColor: '#db762c', steelColor: '#abb2ad' },
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
const p = assembly('corn-header');
const groundOffset = 45;
const add = (name, shape, finish = paintedSteelColor) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('header-floor', box(3600, 899, 54, true).translate(0, 0, 97), paintedSteelColor);
add('cutterbar', box(3492, 34, 56, true).translate(0, -551, 123), paintedSteelColor);
add('end-divider--1', box(80, 638, 792, true).translate(-1728, -246.5, 924), paintedSteelColor);
add('end-divider-1', box(80, 638, 792, true).translate(1728, -246.5, 924), paintedSteelColor);
add('row-snout-0', slopedPrism(288, 841, 420).translate(-1548, -638, 255), paintedSteelColor);
add('gathering-chain-0', box(28, 725, 26, true).translate(-1548, 0, 173), steelColor);
add('row-snout-1', slopedPrism(288, 841, 420).translate(-1105.714, -638, 255), paintedSteelColor);
add('gathering-chain-1', box(28, 725, 26, true).translate(-1105.714, 0, 173), steelColor);
add('row-snout-2', slopedPrism(288, 841, 420).translate(-663.429, -638, 255), paintedSteelColor);
add('gathering-chain-2', box(28, 725, 26, true).translate(-663.429, 0, 173), steelColor);
add('row-snout-3', slopedPrism(288, 841, 420).translate(-221.143, -638, 255), paintedSteelColor);
add('gathering-chain-3', box(28, 725, 26, true).translate(-221.143, 0, 173), steelColor);
add('row-snout-4', slopedPrism(288, 841, 420).translate(221.143, -638, 255), paintedSteelColor);
add('gathering-chain-4', box(28, 725, 26, true).translate(221.143, 0, 173), steelColor);
add('row-snout-5', slopedPrism(288, 841, 420).translate(663.429, -638, 255), paintedSteelColor);
add('gathering-chain-5', box(28, 725, 26, true).translate(663.429, 0, 173), steelColor);
add('row-snout-6', slopedPrism(288, 841, 420).translate(1105.714, -638, 255), paintedSteelColor);
add('gathering-chain-6', box(28, 725, 26, true).translate(1105.714, 0, 173), steelColor);
add('row-snout-7', slopedPrism(288, 841, 420).translate(1548, -638, 255), paintedSteelColor);
add('gathering-chain-7', box(28, 725, 26, true).translate(1548, 0, 173), steelColor);
add('cross-auger', box(3276, 60, 60, true).translate(0, 420.5, 390), steelColor);

return p.model();
