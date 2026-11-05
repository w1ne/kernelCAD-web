// SPDX-License-Identifier: CC0-1.0
// Tower access platform ring. Circular service platform with four guard posts, a curved-look deck and ladder opening. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "access-platform-ring",
  license: 'CC0-1.0',
  title: "Tower access platform ring",
  description: "Circular service platform with four guard posts, a curved-look deck and ladder opening. Controls: scale and galvanized steel, safety paint; weathered and high-visibility presets.",
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
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("access-platform-ring");
p.part("deck",c(0,0,0,80,430,12).color(galvanizedSteel));
p.part("post-0",b(0,-390,80,55,55,680).color(galvanizedSteel));
p.part("post-1",b(390,0,80,55,55,680).color(galvanizedSteel));
p.part("post-2",b(0,390,80,55,55,680).color(galvanizedSteel));
p.part("post-3",b(-390,0,80,55,55,680).color(galvanizedSteel));
p.part("rail-front",b(0,-390,700,780,45,45).color(galvanizedSteel));
p.part("rail-back",b(0,390,700,780,45,45).color(galvanizedSteel));
p.part("opening-bridge",b(0,0,45,160,900,70).color(safetyPaint));

return p.model();
