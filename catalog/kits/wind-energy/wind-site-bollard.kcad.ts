// SPDX-License-Identifier: CC0-1.0
// Wind site bollard. Low site bollard with a rounded cap, square foot and two raised reflector bands. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "wind-site-bollard",
  license: 'CC0-1.0',
  title: "Wind site bollard",
  description: "Low site bollard with a rounded cap, square foot and two raised reflector bands. Controls: scale and safety paint, stainless steel, concrete; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });
const concrete = param('concrete', '#8b8c84', { label: 'Concrete' });

presets({
  weathered: {"safetyPaint": "#ba8d27", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"safetyPaint": "#d29f2c"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("wind-site-bollard");
p.part("foot",b(0,0,0,220,220,40).color(concrete));
p.part("post",c(0,0,20,730,55,8).color(safetyPaint));
p.part("band-low",c(0,0,220,40,63,8).color(stainlessSteel));
p.part("band-high",c(0,0,530,40,63,8).color(stainlessSteel));
p.part("cap",c(0,0,750,40,70,8).color(safetyPaint));

return p.model();
