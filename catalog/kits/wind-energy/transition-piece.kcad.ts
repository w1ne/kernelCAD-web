// SPDX-License-Identifier: CC0-1.0
// Offshore transition piece. Offshore tower transition collar with a broad flange, inspection door and two boat-landing rails. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "transition-piece",
  license: 'CC0-1.0',
  title: "Offshore transition piece",
  description: "Offshore tower transition collar with a broad flange, inspection door and two boat-landing rails. Controls: scale and marine steel, galvanized steel, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 350,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const marineSteel = param('marineSteel', '#335868', { label: 'Marine steel' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"marineSteel": "#284551", "galvanizedSteel": "#96a8ab"},
  highVisibility: {"safetyPaint": "#f7c331", "marineSteel": "#2d4d5c"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("transition-piece");
p.part("lower-flange",c(0,0,0,90,360,12).color(galvanizedSteel));
p.part("body",c(0,0,90,1000,235,12).color(marineSteel));
p.part("top-flange",c(0,0,1090,90,280,12).color(galvanizedSteel));
p.part("door",b(0,-238,400,260,20,500).color(safetyPaint));
p.part("boat-rail-left",b(-210,-310,160,50,55,760).color(galvanizedSteel));
p.part("boat-rail-right",b(210,-310,160,50,55,760).color(galvanizedSteel));

return p.model();
