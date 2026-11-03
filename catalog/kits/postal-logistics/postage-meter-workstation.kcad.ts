// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postage-meter-workstation",
  license: 'CC0-1.0',
  title: "Postage meter workstation",
  description: "Postage meter, small scale platform and mailpiece catch tray arranged on a service stand. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#617780", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postage-meter-workstation");
p.part("cabinet", b(0,0,0,620,420,760).color(color));
p.part("countertop", b(0,0,760,700,500,55).color(color));
p.part("meter-base", b(-90,20,815,280,260,200).color(color));
p.part("meter-head", b(-90,20,1015,260,220,180).color(color));
p.part("display", b(-90,-112,1050,145,18,78).color(color));
p.part("scale-platform", b(220,70,820,190,180,55).color(color));
p.part("catch-tray", b(80,-210,820,410,120,35).color(color));
p.part("paper-roll", b(-280,100,815,95,95,80).color(color));
p.part("lower-door", b(0,-214,250,430,18,360).color(color));

return p.model();
