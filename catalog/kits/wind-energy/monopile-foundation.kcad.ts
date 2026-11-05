// SPDX-License-Identifier: CC0-1.0
// Monopile foundation. Short offshore monopile foundation with top rim, four fender blocks and a flat seabed shoe. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "monopile-foundation",
  license: 'CC0-1.0',
  title: "Monopile foundation",
  description: "Short offshore monopile foundation with top rim, four fender blocks and a flat seabed shoe. Controls: scale and marine steel, elastomer, safety paint; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const marineSteel = param('marineSteel', '#335868', { label: 'Marine steel' });
const elastomer = param('elastomer', '#30383a', { label: 'Elastomer' });
const safetyPaint = param('safetyPaint', '#efb532', { label: 'Safety paint' });

presets({
  weathered: {"marineSteel": "#284551", "elastomer": "#343c3f"},
  highVisibility: {"safetyPaint": "#f7c331", "marineSteel": "#2d4d5c"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("monopile-foundation");
p.part("pile",c(0,0,30,800,260,8).color(marineSteel));
p.part("rim",c(0,0,780,80,290,8).color(marineSteel));
p.part("shoe",b(0,0,0,720,720,60).color(safetyPaint));
p.part("fender-0",b(0,-290,80,150,150,520).color(elastomer));
p.part("fender-1",b(290,0,80,150,150,520).color(elastomer));
p.part("fender-2",b(0,290,80,150,150,520).color(elastomer));
p.part("fender-3",b(-290,0,80,150,150,520).color(elastomer));

return p.model();
