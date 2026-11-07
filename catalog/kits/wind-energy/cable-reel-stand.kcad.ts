// SPDX-License-Identifier: CC0-1.0
// Power cable reel stand. Freestanding cable drum stand with two side supports, bottom tie and central axle. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "cable-reel-stand",
  license: 'CC0-1.0',
  title: "Power cable reel stand",
  description: "Freestanding cable drum stand with two side supports, bottom tie and central axle. Controls: scale and structural steel, stainless steel, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"structuralSteel": "#425258", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"safetyPaint": "#f7c331", "structuralSteel": "#4b5c63"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("cable-reel-stand");
p.part("foot-left",b(-360,0,0,130,700,60).color(structuralSteel));
p.part("foot-right",b(360,0,0,130,700,60).color(structuralSteel));
p.part("upright-left",b(-360,0,340,70,90,680).color(structuralSteel));
p.part("upright-right",b(360,0,340,70,90,680).color(structuralSteel));
p.part("axle",c(0,0,550,90,45,8).color(stainlessSteel));
p.part("reel",c(0,0,290,180,240,8).color(structuralSteel));
p.part("crossbar",b(0,0,660,790,70,55).color(safetyPaint));

return p.model();
