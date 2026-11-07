// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "sodium-hypochlorite-cabinet",
  license: 'CC0-1.0',
  title: "Hypochlorite dosing cabinet",
  description: "Ventilated chemical cabinet with double doors, low spill tray and pipe stub pair. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#d5d4c7", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("sodium-hypochlorite-cabinet");
p.part("base",b(0,0,0,700,520,50).color(color));
p.part("cabinet",b(0,0,465,650,470,880).color(color));
p.part("roof",b(0,0,925,720,540,55).color(color));
p.part("door-left",b(-155,-240,75,270,22,700).color(color));
p.part("door-right",b(155,-240,75,270,22,700).color(color));
p.part("vent-0",b(-220,-254,145,35,18,90).color(color));
p.part("vent-1",b(-130,-254,145,35,18,90).color(color));
p.part("vent-2",b(-40,-254,145,35,18,90).color(color));
p.part("vent-3",b(50,-254,145,35,18,90).color(color));
p.part("vent-4",b(140,-254,145,35,18,90).color(color));
p.part("pipe-left",c(-220,240,55,180,32,10).color(color));
p.part("pipe-right",c(220,240,55,180,32,10).color(color));

return p.model();
