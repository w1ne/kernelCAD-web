// SPDX-License-Identifier: CC0-1.0
// Original low-poly wind-energy scene prop, millimetres, Z up, base at z = 0.

meta({
  name: "cable-trench-cover",
  license: 'CC0-1.0',
  title: "Cable trench cover",
  description: "Rectangular cable trench lid with reinforced cross ribs and lift slots. Knobs: overall scale and asset color.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 2200,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const color = param('color', "#727976", { label: 'Asset color' });
const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("cable-trench-cover");
p.part("lid",b(0,0,0,1200,520,90).color(color));
p.part("rib-0",b(-450,0,50,55,540,35).color(color));
p.part("rib-1",b(-150,0,50,55,540,35).color(color));
p.part("rib-2",b(150,0,50,55,540,35).color(color));
p.part("rib-3",b(450,0,50,55,540,35).color(color));
p.part("slot-left",b(-430,0,75,110,35,15).color(color));
p.part("slot-right",b(430,0,75,110,35,15).color(color));

return p.model();
