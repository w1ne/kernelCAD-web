// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "chlorine-dosing-skid",
  license: 'CC0-1.0',
  title: "Chlorine dosing skid",
  description: "Chemical dosing skid with metering pump, small day tank, tube rack and spill tray. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#a19b7d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("chlorine-dosing-skid");
p.part("tray",b(0,0,0,880,520,50).color(color));
p.part("day-tank",c(-240,0,50,460,170,12).color(color));
p.part("pump",b(230,-80,70,210,170,190).color(color));
p.part("control",b(230,140,115,230,150,280).color(color));
p.part("tube-0",b(-100,-210,65,25,30,260).color(color));
p.part("tube-1",b(-20,-210,65,25,30,260).color(color));
p.part("tube-2",b(60,-210,65,25,30,260).color(color));
p.part("tube-3",b(140,-210,65,25,30,260).color(color));
p.part("top-rail",b(0,0,435,820,40,40).color(color));

return p.model();
