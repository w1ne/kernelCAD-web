// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "delivery-sequence-case",
  license: 'CC0-1.0',
  title: "Delivery sequence case",
  description: "Tall compartment case with numbered-looking bays, top cover and lower return-mail pocket. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#667b78", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("delivery-sequence-case");
p.part("case-body", b(0,0,0,740,360,1040).color(color));
p.part("top-lip", b(0,0,1040,790,410,55).color(color));
p.part("left-side", b(-350,0,55,38,340,950).color(color));
p.part("right-side", b(350,0,55,38,340,950).color(color));
p.part("divider-a", b(-245,0,110,25,330,820).color(color));
p.part("divider-b", b(-120,0,110,25,330,820).color(color));
p.part("divider-c", b(5,0,110,25,330,820).color(color));
p.part("divider-d", b(130,0,110,25,330,820).color(color));
p.part("divider-e", b(255,0,110,25,330,820).color(color));
p.part("return-pocket", b(0,-195,150,650,35,260).color(color));
p.part("carry-handle", b(0,0,1095,260,65,55).color(color));

return p.model();
