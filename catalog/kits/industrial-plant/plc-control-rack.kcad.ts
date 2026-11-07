// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly plc control rack scene prop, modeled from scratch.
meta({
  name: 'plc-control-rack',
  license: 'CC0-1.0',
  title: 'PLC control rack',
  description: 'Open PLC rack with modular I/O cards, side rails, a communication module and wire duct. Knobs: overall scale, body color and accent color.',
  tags: ['industrial plant', 'factory', 'process equipment', 'low poly', 'CC0'],
  kit: 'industrial-plant',
  category: 'prop',
  origin: 'base',
  compat: ['industrial-plant', 'factory', 'manufacturing', 'industrial-scene'],
  triangleBudget: 1400
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.65, max: 1.35, step: 0.05 });
const body = param('body', '#667984', { label: 'Body color' });
const accent = param('accent', '#dfa844', { label: 'Accent color' });
const p = assembly('plc-control-rack');
p.part('rack-base', box(460, 210, 32, true).translate(0, 0, 16).scale(scale).color(accent));
p.part('backplane', box(349.6, 24, 421.2, true).translate(0, 0, 291.6).scale(scale).color(body));
p.part('top-crossbar', box(414, 36, 26, true).translate(0, 0, 518.4).scale(scale).color(accent));
p.part('io-card-0', box(36.8, 42, 334.8, true).translate(-156.4, -28, 280.8).scale(scale).color(accent));
p.part('card-led-0-0', box(9, 8, 9, true).translate(-161.4, -51, 189).scale(scale).color(accent));
p.part('card-led-0-1', box(9, 8, 9, true).translate(-161.4, -51, 213).scale(scale).color(accent));
p.part('card-led-0-2', box(9, 8, 9, true).translate(-161.4, -51, 237).scale(scale).color(accent));
p.part('io-card-1', box(36.8, 42, 334.8, true).translate(-104.3, -28, 280.8).scale(scale).color(body));
p.part('card-led-1-0', box(9, 8, 9, true).translate(-109.3, -51, 189).scale(scale).color(accent));
p.part('card-led-1-1', box(9, 8, 9, true).translate(-109.3, -51, 213).scale(scale).color(accent));
p.part('card-led-1-2', box(9, 8, 9, true).translate(-109.3, -51, 237).scale(scale).color(accent));
p.part('io-card-2', box(36.8, 42, 334.8, true).translate(-52.1, -28, 280.8).scale(scale).color(body));
p.part('card-led-2-0', box(9, 8, 9, true).translate(-57.1, -51, 189).scale(scale).color(accent));
p.part('card-led-2-1', box(9, 8, 9, true).translate(-57.1, -51, 213).scale(scale).color(accent));
p.part('card-led-2-2', box(9, 8, 9, true).translate(-57.1, -51, 237).scale(scale).color(accent));
p.part('io-card-3', box(36.8, 42, 334.8, true).translate(0, -28, 280.8).scale(scale).color(body));
p.part('card-led-3-0', box(9, 8, 9, true).translate(-5, -51, 189).scale(scale).color(accent));
p.part('card-led-3-1', box(9, 8, 9, true).translate(-5, -51, 213).scale(scale).color(accent));
p.part('card-led-3-2', box(9, 8, 9, true).translate(-5, -51, 237).scale(scale).color(accent));
p.part('io-card-4', box(36.8, 42, 334.8, true).translate(52.1, -28, 280.8).scale(scale).color(body));
p.part('card-led-4-0', box(9, 8, 9, true).translate(47.1, -51, 189).scale(scale).color(accent));
p.part('card-led-4-1', box(9, 8, 9, true).translate(47.1, -51, 213).scale(scale).color(accent));
p.part('card-led-4-2', box(9, 8, 9, true).translate(47.1, -51, 237).scale(scale).color(accent));
p.part('io-card-5', box(36.8, 42, 334.8, true).translate(104.3, -28, 280.8).scale(scale).color(body));
p.part('card-led-5-0', box(9, 8, 9, true).translate(99.3, -51, 189).scale(scale).color(accent));
p.part('card-led-5-1', box(9, 8, 9, true).translate(99.3, -51, 213).scale(scale).color(accent));
p.part('card-led-5-2', box(9, 8, 9, true).translate(99.3, -51, 237).scale(scale).color(accent));
p.part('io-card-6', box(36.8, 42, 334.8, true).translate(156.4, -28, 280.8).scale(scale).color(body));
p.part('card-led-6-0', box(9, 8, 9, true).translate(151.4, -51, 189).scale(scale).color(accent));
p.part('card-led-6-1', box(9, 8, 9, true).translate(151.4, -51, 213).scale(scale).color(accent));
p.part('card-led-6-2', box(9, 8, 9, true).translate(151.4, -51, 237).scale(scale).color(accent));
p.part('wire-duct', box(441.6, 48, 60, true).translate(0, -46.2, 64.8).scale(scale).color(body));

return p.model();
