// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "conveyor-drive-unit",
  license: 'CC0-1.0',
  title: "Conveyor drive unit",
  description: "Compact conveyor motor and gearbox assembly on a mounting plate with raised vent banks. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#69777a", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("conveyor-drive-unit");
p.part("mounting-plate", b(0,0,0,520,390,65).color(color));
p.part("motor-body", b(-90,0,65,260,310,310).color(color));
p.part("motor-end", b(-90,0,375,280,330,42).color(color));
p.part("gearbox", b(180,0,100,250,300,260).color(color));
p.part("output-block", b(310,0,190,95,130,90).color(color));
p.part("vent-a", b(-90,-165,150,210,30,35).color(color));
p.part("vent-b", b(-90,-165,210,210,30,35).color(color));
p.part("vent-c", b(-90,-165,270,210,30,35).color(color));
p.part("terminal-box", b(-70,0,375,120,120,90).color(color));
p.part("foot-left", b(-200,0,0,75,390,60).color(color));
p.part("foot-right", b(200,0,0,75,390,60).color(color));

return p.model();
