// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "water-filter-cartridge-housing",
  license: 'CC0-1.0',
  title: "Cartridge filter housing",
  description: "Short cartridge-filter housing with clamp lid, inlet outlet nozzles and a three-leg stand. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#6a7474", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("water-filter-cartridge-housing");
p.part("canister",c(0,0,70,420,210,12).color(color));
p.part("lid",c(0,0,490,80,230,12).color(color));
p.part("clamp-ring",c(0,0,455,38,245,12).color(color));
p.part("inlet",c(0,-255,340,110,58,10).color(color));
p.part("outlet",c(0,255,340,110,58,10).color(color));
p.part("leg--130",b(-130,0,0,55,65,90).color(color));
p.part("leg-0",b(0,0,0,55,65,90).color(color));
p.part("leg-130",b(130,0,0,55,65,90).color(color));

return p.model();
