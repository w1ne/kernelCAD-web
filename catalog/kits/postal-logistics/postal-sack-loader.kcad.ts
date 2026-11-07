// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postal-sack-loader",
  license: 'CC0-1.0',
  title: "Postal sack loader",
  description: "Mobile sack-loading stand with a low roller deck, upright handle and alignment stops. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5b747e", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postal-sack-loader");
p.part("base", b(0,0,0,760,650,90).color(color));
p.part("deck", b(0,40,420,700,560,60).color(color));
p.part("roller-a", b(0,-170,455,630,34,24).color(color));
p.part("roller-b", b(0,0,455,630,34,24).color(color));
p.part("roller-c", b(0,170,455,630,34,24).color(color));
p.part("handle-left", b(-300,220,90,55,55,950).color(color));
p.part("handle-right", b(300,220,90,55,55,950).color(color));
p.part("handle-top", b(0,220,1040,650,55,55).color(color));
p.part("stop-left", b(-310,-170,480,40,55,170).color(color));
p.part("stop-right", b(310,-170,480,40,55,170).color(color));
p.part("wheel-front", b(0,-280,0,500,90,120).color(color));

return p.model();
