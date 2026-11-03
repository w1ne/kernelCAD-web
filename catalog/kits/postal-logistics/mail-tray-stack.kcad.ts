// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mail-tray-stack",
  license: 'CC0-1.0',
  title: "Mail tray stack",
  description: "Stack of four shallow mail trays with reinforced rims and hand-grip openings. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#607b7b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("mail-tray-stack");
p.part("tray-bottom", b(0,0,0,620,430,80).color(color));
p.part("tray-2", b(0,0,95,620,430,80).color(color));
p.part("tray-3", b(0,0,190,620,430,80).color(color));
p.part("tray-top", b(0,0,285,620,430,80).color(color));
p.part("rim-front", b(0,-210,365,620,28,20).color(color));
p.part("rim-back", b(0,210,365,620,28,20).color(color));
p.part("hand-slot-left", b(-280,0,342,30,150,30).color(color));
p.part("hand-slot-right", b(280,0,342,30,150,30).color(color));

return p.model();
