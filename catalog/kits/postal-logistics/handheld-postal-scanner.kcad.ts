// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "handheld-postal-scanner",
  license: 'CC0-1.0',
  title: "Handheld postal scanner",
  description: "Rugged handheld parcel scanner with a broad reader head, handle and raised control keys. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#4e6c7d", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("handheld-postal-scanner");
p.part("scanner-head", b(0,0,245,210,150,70).color(color));
p.part("reader-window", b(0,-8,315,150,105,20).color(color));
p.part("handle", b(0,-115,140,95,75,220).color(color));
p.part("handle-end", b(0,-115,35,120,90,35).color(color));
p.part("trigger", b(0,-75,220,40,20,50).color(color));
p.part("top-key-a", b(-58,34,320,34,30,16).color(color));
p.part("top-key-b", b(0,34,320,34,30,16).color(color));
p.part("top-key-c", b(58,34,320,34,30,16).color(color));
p.part("battery-pack", b(0,-125,0,88,70,48).color(color));

return p.model();
