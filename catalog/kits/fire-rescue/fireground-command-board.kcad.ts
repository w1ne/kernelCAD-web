// SPDX-License-Identifier: CC0-1.0
// Original kernelCAD low-poly fireground command board scene prop, modeled from scratch.
meta({
  name: "fireground-command-board",
  license: 'CC0-1.0',
  title: "Fireground command board",
  description: "Portable incident board with framed panel, status tiles and folding easel. Knobs: overall scale, body color and accent color.",
  tags: ['fire rescue', 'fire service', 'emergency scene', 'low poly', 'CC0'],
  kit: 'fire-rescue',
  category: 'prop',
  origin: 'base',
  compat: ['fire-rescue', 'fireground', 'emergency-scene', 'training-scene'],
  triangleBudget: 2200
});

const scale = param('scale', 1, { label: 'Overall scale', min: 0.7, max: 1.3, step: 0.05 });
const body = param('body', '#78828a', { label: 'Body color' });
const accent = param('accent', '#d74735', { label: 'Accent color' });
const p = assembly("fireground-command-board");
const groundOffset = -431.353;
const add = (name, shape, finish = body) => p.part(name, shape.translate(0, 0, groundOffset).scale(scale).color(finish));
add("board-frame", box(620, 70, 760, true).translate(0, 0, 1250), accent);
add("board-face", box(550, 24, 690, true).translate(0, -43, 1215), body);
add("status-tile-0-0", box(88, 22, 82, true).translate(-195, -65, 1101), accent);
add("status-tile-0-1", box(88, 22, 82, true).translate(-65, -65, 1101), body);
add("status-tile-0-2", box(88, 22, 82, true).translate(65, -65, 1101), accent);
add("status-tile-0-3", box(88, 22, 82, true).translate(195, -65, 1101), body);
add("status-tile-1-0", box(88, 22, 82, true).translate(-195, -65, 916), body);
add("status-tile-1-1", box(88, 22, 82, true).translate(-65, -65, 916), accent);
add("status-tile-1-2", box(88, 22, 82, true).translate(65, -65, 916), body);
add("status-tile-1-3", box(88, 22, 82, true).translate(195, -65, 916), accent);
add("status-tile-2-0", box(88, 22, 82, true).translate(-195, -65, 731), accent);
add("status-tile-2-1", box(88, 22, 82, true).translate(-65, -65, 731), body);
add("status-tile-2-2", box(88, 22, 82, true).translate(65, -65, 731), accent);
add("status-tile-2-3", box(88, 22, 82, true).translate(195, -65, 731), body);
add("easel-leg--1", box(40, 45, 850, true).rotate([0, 1, 0], -8).translate(-245, 0, 855), body);
add("easel-leg-1", box(40, 45, 850, true).rotate([0, 1, 0], 8).translate(245, 0, 855), body);

return p.model();
