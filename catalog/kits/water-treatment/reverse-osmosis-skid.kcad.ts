// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "reverse-osmosis-skid",
  license: 'CC0-1.0',
  title: "Reverse osmosis skid",
  description: "Compact reverse-osmosis skid with membrane tubes, feed pump block and paired pipe headers. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#596d69", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("reverse-osmosis-skid");
p.part("skid",b(0,0,0,1100,650,50).color(color));
p.part("pressure-tube-0",c(0,-220,195,650,75,10).color(color));
p.part("pressure-tube-1",c(0,0,195,650,75,10).color(color));
p.part("pressure-tube-2",c(0,220,195,650,75,10).color(color));
p.part("header-front",b(0,-310,225,900,55,55).color(color));
p.part("header-back",b(0,310,225,900,55,55).color(color));
p.part("feed-pump",c(-420,0,75,180,115,10).color(color));
p.part("control-box",b(390,0,110,210,170,270).color(color));

return p.model();
