// SPDX-License-Identifier: CC0-1.0
// Original low-poly apiary scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "pollen-trap",
  license: 'CC0-1.0',
  title: "Hive pollen trap",
  description: "Entrance trap box with a removable drawer, comb grid and front landing board. Stylized scene geometry. Knobs: overall scale and asset color.",
  tags: ['apiary', 'beekeeping', 'honey', 'agriculture', 'low poly', 'scene prop'],
  kit: 'apiary',
  category: 'prop',
  origin: 'base',
  compat: ['apiary', 'beekeeping', 'agriculture', 'scene'],
  triangleBudget: 1800,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#8a795d", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("pollen-trap");
p.part("trap-body",b(0,0,70,430,300,190).color(color));
p.part("base",b(0,0,40,470,330,30).color(color));
p.part("grid",b(0,-160,100,360,18,130).color(color));
p.part("grid-bar-0",b(-150,-174,100,12,15,130).color(color));
p.part("grid-bar-1",b(-100,-174,100,12,15,130).color(color));
p.part("grid-bar-2",b(-50,-174,100,12,15,130).color(color));
p.part("grid-bar-3",b(0,-174,100,12,15,130).color(color));
p.part("grid-bar-4",b(50,-174,100,12,15,130).color(color));
p.part("grid-bar-5",b(100,-174,100,12,15,130).color(color));
p.part("grid-bar-6",b(150,-174,100,12,15,130).color(color));
p.part("drawer",b(0,0,0,350,260,45).color(color));
p.part("landing",b(0,-220,40,560,110,30).color(color));

return p.model();
