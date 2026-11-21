// SPDX-License-Identifier: CC0-1.0
// Turbine number placard. Small numbered turbine ID plate on a short post with a broad mounting foot. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-number-placard",
  license: 'CC0-1.0',
  title: "Turbine number placard",
  description: "Small numbered turbine ID plate on a short post with a broad mounting foot. Controls: scale and safety paint, galvanized steel, concrete; weathered and high-visibility presets.",
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
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-number-placard");
p.part("plate",b(0,0,620,420,35,240).color(safetyPaint));
p.part("post",c(0,0,50,550,34,8).color(galvanizedSteel));
p.part("foot",b(0,0,0,200,200,50).color(concrete));
p.part("border",b(0,-20,620,360,12,190).color(safetyPaint));

return p.model();
