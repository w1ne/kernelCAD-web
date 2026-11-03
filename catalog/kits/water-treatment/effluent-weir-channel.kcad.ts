// SPDX-License-Identifier: CC0-1.0
// Original low-poly water-treatment scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "effluent-weir-channel",
  license: 'CC0-1.0',
  title: "Effluent weir channel",
  description: "Open effluent channel with end walls, notched weir plate and side collection trough. Knobs: overall scale and asset color.",
  tags: ['water treatment', 'water utility', 'infrastructure', 'low poly', 'scene prop'],
  kit: 'water-treatment',
  category: 'prop',
  origin: 'base',
  compat: ['water-treatment', 'utility', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#637b77", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("effluent-weir-channel");
p.part("floor",b(0,0,0,1200,700,40).color(color));
p.part("wall-front",b(0,-320,20,1200,50,360).color(color));
p.part("wall-back",b(0,320,20,1200,50,360).color(color));
p.part("weir-plate",b(280,0,100,50,620,280).color(color));
p.part("notch-0",b(-430,0,380,45,580,30).color(color));
p.part("notch-1",b(-345,0,380,45,580,30).color(color));
p.part("notch-2",b(-260,0,380,45,580,30).color(color));
p.part("notch-3",b(-175,0,380,45,580,30).color(color));
p.part("notch-4",b(-90,0,380,45,580,30).color(color));
p.part("notch-5",b(-5,0,380,45,580,30).color(color));
p.part("notch-6",b(80,0,380,45,580,30).color(color));
p.part("notch-7",b(165,0,380,45,580,30).color(color));
p.part("notch-8",b(250,0,380,45,580,30).color(color));
p.part("collection-trough",b(520,0,350,100,760,60).color(color));

return p.model();
