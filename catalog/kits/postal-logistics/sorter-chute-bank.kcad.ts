// SPDX-License-Identifier: CC0-1.0
// Original low-poly postal logistics scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sorter-chute-bank",
  license: 'CC0-1.0',
  title: "Sorter chute bank",
  description: "Multi-lane parcel discharge bank with numbered-looking bays and a high support frame. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['postal logistics', 'mail', 'parcel', 'package processing', 'low poly', 'scene prop'],
  kit: 'postal-logistics',
  category: 'prop',
  origin: 'base',
  compat: ['postal', 'postal-processing', 'mailroom', 'logistics', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6d7775", { label: 'Asset color' });
const b = (x:number,y:number,z:number,w:number,d:number,h:number) => box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p = assembly("sorter-chute-bank");
p.part("base", b(0,0,0,1380,800,80).color(color));
p.part("upright-left", b(-620,0,80,55,760,1280).color(color));
p.part("upright-right", b(620,0,80,55,760,1280).color(color));
p.part("top-beam", b(0,0,1280,1300,75,65).color(color));
p.part("bay-divider-a", b(-400,0,360,32,700,880).color(color));
p.part("bay-divider-b", b(-130,0,360,32,700,880).color(color));
p.part("bay-divider-c", b(140,0,360,32,700,880).color(color));
p.part("bay-divider-d", b(410,0,360,32,700,880).color(color));
p.part("chute-shelf-a", b(-400,80,180,220,800,45).color(color));
p.part("chute-shelf-b", b(-130,80,180,220,800,45).color(color));
p.part("chute-shelf-c", b(140,80,180,220,800,45).color(color));
p.part("chute-shelf-d", b(410,80,180,220,800,45).color(color));
p.part("front-label-rail", b(0,-390,310,1200,30,45).color(color));

return p.model();
