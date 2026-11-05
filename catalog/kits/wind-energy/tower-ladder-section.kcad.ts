// SPDX-License-Identifier: CC0-1.0
// Tower ladder section. Straight internal ladder segment with side rails, rungs and two wall mounts. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "tower-ladder-section",
  license: 'CC0-1.0',
  title: "Tower ladder section",
  description: "Straight internal ladder segment with side rails, rungs and two wall mounts. Controls: scale and galvanized steel, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"galvanizedSteel": "#6c7a7b", "safetyPaint": "#ffc336"},
  highVisibility: {"safetyPaint": "#f7c331", "galvanizedSteel": "#7a898b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("tower-ladder-section");
p.part("rail-left",b(0,-130,0,45,45,1200).color(galvanizedSteel));
p.part("rail-right",b(0,130,0,45,45,1200).color(galvanizedSteel));
p.part("rung-0",b(0,0,55,260,45,40).color(safetyPaint));
p.part("rung-1",b(0,0,200,260,45,40).color(safetyPaint));
p.part("rung-2",b(0,0,345,260,45,40).color(safetyPaint));
p.part("rung-3",b(0,0,490,260,45,40).color(safetyPaint));
p.part("rung-4",b(0,0,635,260,45,40).color(safetyPaint));
p.part("rung-5",b(0,0,780,260,45,40).color(safetyPaint));
p.part("rung-6",b(0,0,925,260,45,40).color(safetyPaint));
p.part("rung-7",b(0,0,1070,260,45,40).color(safetyPaint));
p.part("mount-low",b(0,100,175,400,40,55).color(galvanizedSteel));
p.part("mount-high",b(0,100,925,400,40,55).color(galvanizedSteel));

return p.model();
