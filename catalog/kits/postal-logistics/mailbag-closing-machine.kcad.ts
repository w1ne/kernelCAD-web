// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "mailbag-closing-machine",
  license: 'CC0-1.0',
  title: "Mailbag closing machine",
  description: "Industrial bag-closing head mounted above a work surface with a sack guide and foot control. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#657a7c", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("mailbag-closing-machine");
p.part("tabletop", b(0,0,760,880,560,55).color(color));
p.part("leg-left", b(-350,-190,0,55,55,760).color(color));
p.part("leg-right", b(350,-190,0,55,55,760).color(color));
p.part("rear-leg-left", b(-350,190,0,55,55,760).color(color));
p.part("rear-leg-right", b(350,190,0,55,55,760).color(color));
p.part("machine-head", b(-110,0,815,260,220,250).color(color));
p.part("thread-post", b(-250,110,815,38,38,440).color(color));
p.part("thread-guide", b(-250,110,1255,180,38,35).color(color));
p.part("bag-guide", b(190,0,815,240,280,100).color(color));
p.part("foot-pedal", b(220,-220,0,170,130,55).color(color));
p.part("crossbar", b(0,190,210,760,55,45).color(color));

return p.model();
