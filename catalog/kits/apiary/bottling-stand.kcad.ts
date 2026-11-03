// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "bottling-stand",
  license: 'CC0-1.0',
  title: "Honey bottling stand",
  description: "Small bottling platform with raised support rails, bottle seat and valve clearance. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#927c55", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("bottling-stand");
p.part("base",b(0,0,0,560,430,55).color(color));
p.part("back-post",b(0,180,55,60,70,390).color(color));
p.part("top-rail",b(0,180,430,460,60,55).color(color));
p.part("left-guide",b(-180,-20,55,45,220,130).color(color));
p.part("right-guide",b(180,-20,55,45,220,130).color(color));
p.part("bottle-stop",b(0,-175,55,350,35,85).color(color));
p.part("front-feet",b(0,-170,0,420,45,45).color(color));

return p.model();
