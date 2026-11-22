// SPDX-License-Identifier: CC0-1.0
// Tower base skirt. Low polygon tower base fairing with a circular foot, raised skirt and access cutout panel. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-base-skirt",
  license: 'CC0-1.0',
  title: "Tower base skirt",
  description: "Low polygon tower base fairing with a circular foot, raised skirt and access cutout panel. Controls: scale and structural steel, concrete, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const concrete = param('concrete', '#8b8c84', { label: 'Concrete' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"structuralSteel": "#425258", "concrete": "#96978f"},
  highVisibility: {"safetyPaint": "#f7c331", "structuralSteel": "#4b5c63"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-base-skirt");
p.part("foot",c(0,0,0,60,330,8).color(concrete));
p.part("skirt",c(0,0,60,420,250,8).color(structuralSteel));
p.part("access-panel",b(0,-258,180,220,18,260).color(safetyPaint));
p.part("rim",c(0,0,480,35,270,8).color(structuralSteel));

return p.model();
