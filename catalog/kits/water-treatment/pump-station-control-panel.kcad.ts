// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "pump-station-control-panel",
  license: 'CC0-1.0',
  title: "Pump station control panel",
  description: "Floor-mounted pump control panel with rain hood, paired access doors and status lamps. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#737c76", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=10)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("pump-station-control-panel");
p.part("plinth",b(0,0,0,580,380,50).color(color));
p.part("body",b(0,0,475,520,330,900).color(color));
p.part("hood",b(0,0,945,620,410,60).color(color));
p.part("door-left",b(-125,-170,85,220,22,700).color(color));
p.part("door-right",b(125,-170,85,220,22,700).color(color));
p.part("lamp-0",c(-120,-190,805,34,22,10).color(color));
p.part("lamp-1",c(0,-190,805,34,22,10).color(color));
p.part("lamp-2",c(120,-190,805,34,22,10).color(color));
p.part("handle",b(210,-195,435,35,24,170).color(color));

return p.model();
