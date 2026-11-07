// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "carrier-route-sequence-rack",
  license: 'CC0-1.0',
  title: "Carrier route sequence rack",
  description: "Wall-mounted route rack with repeated sequence slots, label strips and a lower shelf. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#697a79", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("carrier-route-sequence-rack");
p.part("backboard", b(0,0,0,1000,70,1570).color(color));
p.part("top-cap", b(0,0,1570,1080,100,65).color(color));
p.part("left-side", b(-490,0,0,55,100,1570).color(color));
p.part("right-side", b(490,0,0,55,100,1570).color(color));
p.part("shelf-a", b(0,-75,660,930,250,45).color(color));
p.part("shelf-b", b(0,-75,880,930,250,45).color(color));
p.part("divider-a", b(-300,-75,685,28,240,190).color(color));
p.part("divider-b", b(-100,-75,685,28,240,190).color(color));
p.part("divider-c", b(100,-75,685,28,240,190).color(color));
p.part("divider-d", b(300,-75,685,28,240,190).color(color));
p.part("label-rail-a", b(0,-215,715,930,22,38).color(color));
p.part("label-rail-b", b(0,-215,935,930,22,38).color(color));

return p.model();
