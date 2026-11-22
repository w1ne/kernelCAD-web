// SPDX-License-Identifier: CC0-1.0
// Wind farm warning sign. Field warning placard with two posts, reinforced top edge and weighted feet. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "wind-farm-warning-sign",
  license: 'CC0-1.0',
  title: "Wind farm warning sign",
  description: "Field warning placard with two posts, reinforced top edge and weighted feet. Controls: scale and safety paint, galvanized steel, concrete; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const concrete = param('concrete', '#8b8c84', { label: 'Concrete' });

presets({
  weathered: {"safetyPaint": "#ba8d27", "galvanizedSteel": "#96a8ab"},
  highVisibility: {"safetyPaint": "#d29f2c"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);

const p=assembly("wind-farm-warning-sign");
p.part("panel",b(0,0,950,850,45,560).color(safetyPaint));
p.part("top-edge",b(0,0,1240,870,65,40).color(safetyPaint));
p.part("post--300",b(-300,0,30,55,55,900).color(galvanizedSteel));
p.part("post-300",b(300,0,30,55,55,900).color(galvanizedSteel));
p.part("foot--300",b(-300,0,0,180,180,50).color(concrete));
p.part("foot-300",b(300,0,0,180,180,50).color(concrete));

return p.model();
