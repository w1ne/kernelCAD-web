// SPDX-License-Identifier: CC0-1.0
// Original low-poly telecom scene prop, authored in millimetres, Z up, on z = 0.

meta({
  name: "battery-backup-cabinet",
  license: 'CC0-1.0',
  title: "Battery backup cabinet",
  description: "Compact backup-power enclosure with double front doors, cable entry hood and bottom plinth. Knobs: overall scale and asset color.",
  tags: ['telecom', 'network', 'communications', 'infrastructure', 'low poly'],
  kit: 'telecom-infrastructure',
  category: 'prop',
  origin: 'base',
  compat: ['telecom', 'network', 'infrastructure', 'industrial'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#586b73", { label: 'Asset color' });
const b = (x: number, y: number, z: number, w: number, d: number, h: number) => box(w, d, h, true).translate(x, y, z + h / 2).scale(scale);

const p = assembly("battery-backup-cabinet");
p.part("body", b(0, 0, 70, 1100, 720, 1150).color(color));
p.part("top", b(0, 0, 1255, 1150, 770, 70).color(color));
p.part("door-left", b(-275, -370, 90, 520, 22, 980).color(color));
p.part("door-right", b(275, -370, 90, 520, 22, 980).color(color));
p.part("intake", b(0, -388, 290, 160, 14, 90).color(color));
p.part("plinth", b(0, 0, 0, 1140, 760, 60).color(color));

return p.model();
