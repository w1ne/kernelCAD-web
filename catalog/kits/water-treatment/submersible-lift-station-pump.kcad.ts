// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "submersible-lift-station-pump",
  license: 'CC0-1.0',
  title: "Submersible lift station pump",
  description: "Vertical submersible pump with lifting handle, motor body, screened intake and cable tail. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#525f60", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("submersible-lift-station-pump");
p.part("motor-body",c(0,0,60,430,145,12).color(color));
p.part("pump-head",c(0,0,490,90,115,10).color(color));
p.part("intake-base",c(0,0,0,60,185,12).color(color));
p.part("intake-slot-0",b(-80,-155,15,16,25,85).color(color));
p.part("intake-slot-1",b(-48,-155,15,16,25,85).color(color));
p.part("intake-slot-2",b(-16,-155,15,16,25,85).color(color));
p.part("intake-slot-3",b(16,-155,15,16,25,85).color(color));
p.part("intake-slot-4",b(48,-155,15,16,25,85).color(color));
p.part("intake-slot-5",b(80,-155,15,16,25,85).color(color));
p.part("handle-left",b(-75,0,520,32,35,140).color(color));
p.part("handle-right",b(75,0,520,32,35,140).color(color));
p.part("cable",b(100,0,540,28,28,300).color(color));

return p.model();
