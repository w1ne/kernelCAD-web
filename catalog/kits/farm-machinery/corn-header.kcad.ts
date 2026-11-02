// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly corn header scene prop, modeled from scratch.
meta({
  name: "corn-header",
  license: 'CC0-1.0',
  title: "Corn header",
  description: "Row-crop corn header with multiple tapered snouts, gathering chains and cross auger. Knobs: overall scale, body color and accent color.",
  tags: ['farm machinery', 'agriculture', 'field equipment', 'low poly', 'CC0'],
  kit: 'farm-machinery',
  category: 'prop',
  origin: 'base',
  compat: ['farm', 'field', 'agriculture', 'rural-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#5d7f75', { label: 'Body color' });
const accent = param('accent', '#c67b39', { label: 'Accent color' });
const p = assembly('corn-header');
const groundOffset = 45;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, -groundOffset).scale(scale).color(finish));
add('header-floor', box(3600, 899, 54, true).translate(0, 0, 97), body);
add('cutterbar', box(3492, 34, 56, true).translate(0, -551, 123), accent);
add('end-divider--1', box(80, 638, 792, true).translate(-1728, -246.5, 924), body);
add('end-divider-1', box(80, 638, 792, true).translate(1728, -246.5, 924), body);
add('row-snout-0', box(288, 841, 420, true).translate(-1548, -638, 255), accent);
add('gathering-chain-0', box(28, 725, 26, true).translate(-1548, 0, 173), body);
add('row-snout-1', box(288, 841, 420, true).translate(-1105.714, -638, 255), accent);
add('gathering-chain-1', box(28, 725, 26, true).translate(-1105.714, 0, 173), body);
add('row-snout-2', box(288, 841, 420, true).translate(-663.429, -638, 255), accent);
add('gathering-chain-2', box(28, 725, 26, true).translate(-663.429, 0, 173), body);
add('row-snout-3', box(288, 841, 420, true).translate(-221.143, -638, 255), accent);
add('gathering-chain-3', box(28, 725, 26, true).translate(-221.143, 0, 173), body);
add('row-snout-4', box(288, 841, 420, true).translate(221.143, -638, 255), accent);
add('gathering-chain-4', box(28, 725, 26, true).translate(221.143, 0, 173), body);
add('row-snout-5', box(288, 841, 420, true).translate(663.429, -638, 255), accent);
add('gathering-chain-5', box(28, 725, 26, true).translate(663.429, 0, 173), body);
add('row-snout-6', box(288, 841, 420, true).translate(1105.714, -638, 255), accent);
add('gathering-chain-6', box(28, 725, 26, true).translate(1105.714, 0, 173), body);
add('row-snout-7', box(288, 841, 420, true).translate(1548, -638, 255), accent);
add('gathering-chain-7', box(28, 725, 26, true).translate(1548, 0, 173), body);
add('cross-auger', box(3276, 60, 60, true).translate(0, 420.5, 390), body);

return p.model();
