// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "cable-splice-pit-frame",
  license: 'CC0-1.0',
  title: "Cable splice pit frame",
  description: "Square access pit frame with thick rim, inset lid and paired lifting recesses. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#717571", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("cable-splice-pit-frame");
p.part("outer-rim", b(0, 0, 0, 850, 850, 70).color(color));
p.part("lid", b(0, 0, 45, 700, 700, 35).color(color));
p.part("slot-left", b(-210, 0, 70, 90, 36, 14).color(color));
p.part("slot-right", b(210, 0, 70, 90, 36, 14).color(color));
p.part("inner-lip", b(0, 0, 70, 620, 620, 18).color(color));

return p.model();
