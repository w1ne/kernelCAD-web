// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "powered-roller-conveyor",
  license: 'CC0-1.0',
  title: "Powered roller conveyor",
  description: "Straight motorized roller bed with side frames, six roller bars and four adjustable legs. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#5e7a85", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("powered-roller-conveyor");
p.part("bed-frame", b(0,0,680,620,1200,80).color(color));
p.part("left-side", b(-305,0,720,32,1200,75).color(color));
p.part("right-side", b(305,0,720,32,1200,75).color(color));
p.part("leg-a-left", b(-250,-470,0,55,55,670).color(color));
p.part("leg-a-right", b(250,-470,0,55,55,670).color(color));
p.part("leg-b-left", b(-250,470,0,55,55,670).color(color));
p.part("leg-b-right", b(250,470,0,55,55,670).color(color));
p.part("roller-a", b(0,-400,755,540,34,26).color(color));
p.part("roller-b", b(0,-240,755,540,34,26).color(color));
p.part("roller-c", b(0,-80,755,540,34,26).color(color));
p.part("roller-d", b(0,80,755,540,34,26).color(color));
p.part("roller-e", b(0,240,755,540,34,26).color(color));
p.part("roller-f", b(0,400,755,540,34,26).color(color));
p.part("drive-housing", b(-420,470,620,140,180,120).color(color));

return p.model();
