// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "carrier-satchel",
  license: 'CC0-1.0',
  title: "Carrier satchel",
  description: "Postal carrier shoulder bag with flap, side gussets, strap loops and a broad carrying strap. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596f7e", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("carrier-satchel");
p.part("bag-body", b(0,0,0,420,210,370).color(color));
p.part("front-pocket", b(0,-112,60,310,28,160).color(color));
p.part("flap", b(0,-8,330,450,245,80).color(color));
p.part("side-gusset-left", b(-225,0,0,35,200,350).color(color));
p.part("side-gusset-right", b(225,0,0,35,200,350).color(color));
p.part("strap-left", b(-190,40,300,42,42,310).color(color));
p.part("strap-right", b(190,40,300,42,42,310).color(color));
p.part("shoulder-strap", b(0,40,600,440,42,40).color(color));
p.part("strap-end-left", b(-170,70,300,90,45,70).color(color));
p.part("strap-end-right", b(170,70,300,90,45,70).color(color));

return p.model();
