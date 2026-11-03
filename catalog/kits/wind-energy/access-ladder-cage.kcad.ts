// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "access-ladder-cage",
  license: 'CC0-1.0',
  title: "Tower access ladder cage",
  description: "Vertical tower ladder section with side rails, four rungs and a half-hoop safety cage. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#626d6b", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("access-ladder-cage");
p.part("rail-left",b(0,-180,0,45,45,1250).color(color));
p.part("rail-right",b(0,180,0,45,45,1250).color(color));
p.part("rung-0",b(0,0,50,360,50,38).color(color));
p.part("rung-1",b(0,0,270,360,50,38).color(color));
p.part("rung-2",b(0,0,490,360,50,38).color(color));
p.part("rung-3",b(0,0,710,360,50,38).color(color));
p.part("rung-4",b(0,0,930,360,50,38).color(color));
p.part("hoop-0",c(0,0,150,30,260,10).color(color));
p.part("hoop-1",c(0,0,410,30,260,10).color(color));
p.part("hoop-2",c(0,0,670,30,260,10).color(color));
p.part("hoop-3",c(0,0,930,30,260,10).color(color));

return p.model();
