// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "parcel-tray-transfer-cart",
  license: 'CC0-1.0',
  title: "Parcel tray transfer cart",
  description: "Low transfer cart with wide deck, raised stops, four wheel blocks and a push bar. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#607982", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("parcel-tray-transfer-cart");
p.part("deck", b(0,0,220,880,650,70).color(color));
p.part("front-stop", b(0,-300,290,820,45,115).color(color));
p.part("back-stop", b(0,300,290,820,45,115).color(color));
p.part("wheel-left-front", b(-340,-245,0,120,95,220).color(color));
p.part("wheel-right-front", b(340,-245,0,120,95,220).color(color));
p.part("wheel-left-back", b(-340,245,0,120,95,220).color(color));
p.part("wheel-right-back", b(340,245,0,120,95,220).color(color));
p.part("handle-left", b(-390,245,290,55,55,750).color(color));
p.part("handle-right", b(390,245,290,55,55,750).color(color));
p.part("handle", b(0,245,1040,800,55,55).color(color));
p.part("tray-rack", b(0,0,330,740,500,45).color(color));

return p.model();
