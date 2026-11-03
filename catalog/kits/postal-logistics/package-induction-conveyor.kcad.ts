// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "package-induction-conveyor",
  license: 'CC0-1.0',
  title: "Package induction conveyor",
  description: "Parcel induction belt with side rails, support legs and raised roller rows. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#52758b", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("package-induction-conveyor");
p.part("belt", b(0,0,735,580,1050,55).color(color));
p.part("side-rail-left", b(-280,0,790,20,1050,65).color(color));
p.part("side-rail-right", b(280,0,790,20,1050,65).color(color));
p.part("leg-front-left", b(-220,-410,0,55,55,720).color(color));
p.part("leg-front-right", b(220,-410,0,55,55,720).color(color));
p.part("leg-back-left", b(-220,410,0,55,55,720).color(color));
p.part("leg-back-right", b(220,410,0,55,55,720).color(color));
p.part("roller-row-a", b(0,-330,790,500,35,24).color(color));
p.part("roller-row-b", b(0,-165,790,500,35,24).color(color));
p.part("roller-row-c", b(0,0,790,500,35,24).color(color));
p.part("roller-row-d", b(0,165,790,500,35,24).color(color));
p.part("roller-row-e", b(0,330,790,500,35,24).color(color));

return p.model();
