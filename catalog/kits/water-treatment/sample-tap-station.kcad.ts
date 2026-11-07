// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sample-tap-station",
  license: 'CC0-1.0',
  title: "Water sample tap station",
  description: "Freestanding sampling point with cabinet, short spout, drip tray and two pipe supports. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#83847a", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("sample-tap-station");
p.part("base",b(0,0,0,460,380,50).color(color));
p.part("cabinet",b(0,0,305,360,300,560).color(color));
p.part("hood",b(0,0,605,410,350,45).color(color));
p.part("spout",c(0,-190,325,180,26,10).color(color));
p.part("drip-tray",b(0,-250,295,250,100,30).color(color));
p.part("pipe-left",c(-140,0,55,180,35,10).color(color));
p.part("pipe-right",c(140,0,55,180,35,10).color(color));

return p.model();
