// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "carrier-caseload-sorter",
  license: 'CC0-1.0',
  title: "Carrier caseload sorter",
  description: "Portable multi-compartment case for staging route bundles with a broad carry handle. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#59727e", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("carrier-caseload-sorter");
p.part("base", b(0,0,0,680,430,65).color(color));
p.part("left-wall", b(-315,0,65,50,430,420).color(color));
p.part("right-wall", b(315,0,65,50,430,420).color(color));
p.part("back-wall", b(0,190,65,680,50,420).color(color));
p.part("front-wall", b(0,-190,65,680,50,420).color(color));
p.part("divider-a", b(-165,0,115,28,380,320).color(color));
p.part("divider-b", b(0,0,115,28,380,320).color(color));
p.part("divider-c", b(165,0,115,28,380,320).color(color));
p.part("handle-left", b(-210,0,485,45,45,70).color(color));
p.part("handle-right", b(210,0,485,45,45,70).color(color));
p.part("handle", b(0,0,520,470,45,45).color(color));

return p.model();
