// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "postal-dispatch-cage",
  license: 'CC0-1.0',
  title: "Postal dispatch cage",
  description: "Pallet-base dispatch cage with corner uprights, tie bars and a fitted top rail. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6b7977", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("postal-dispatch-cage");
p.part("pallet-base", b(0,0,0,1100,900,150).color(color));
p.part("skid-a", b(-350,0,0,100,850,85).color(color));
p.part("skid-b", b(0,0,0,100,850,85).color(color));
p.part("skid-c", b(350,0,0,100,850,85).color(color));
p.part("post-left-front", b(-520,-420,150,45,45,1300).color(color));
p.part("post-right-front", b(520,-420,150,45,45,1300).color(color));
p.part("post-left-back", b(-520,420,150,45,45,1300).color(color));
p.part("post-right-back", b(520,420,150,45,45,1300).color(color));
p.part("top-front", b(0,-420,1450,1080,45,45).color(color));
p.part("top-back", b(0,420,1450,1080,45,45).color(color));
p.part("top-left", b(-520,0,1450,45,840,45).color(color));
p.part("top-right", b(520,0,1450,45,840,45).color(color));
p.part("mid-rail", b(0,-420,700,1080,35,35).color(color));

return p.model();
