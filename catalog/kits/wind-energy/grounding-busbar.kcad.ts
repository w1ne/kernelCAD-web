// SPDX-License-Identifier: CC0-1.0
// Turbine grounding busbar. Grounding bar with six terminal studs, two insulators and a broad mounting rail. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "grounding-busbar",
  license: 'CC0-1.0',
  title: "Turbine grounding busbar",
  description: "Grounding bar with six terminal studs, two insulators and a broad mounting rail. Controls: scale and copper, electrical ceramic, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 600,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const copper = param('copper', '#b7734e', { label: 'Copper' });
const ceramic = param('ceramic', '#eee2ca', { label: 'Electrical ceramic' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"copper": "#8f5a3d", "ceramic": "#fff4da"},
  highVisibility: {"copper": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("grounding-busbar");
p.part("rail",b(0,0,85,850,100,80).color(copper));
p.part("insulator-left",b(-350,0,0,100,130,70).color(ceramic));
p.part("insulator-right",b(350,0,0,100,130,70).color(ceramic));
p.part("stud-0",c(-300,0,125,85,23,8).color(stainlessSteel));
p.part("stud-1",c(-180,0,125,85,23,8).color(stainlessSteel));
p.part("stud-2",c(-60,0,125,85,23,8).color(stainlessSteel));
p.part("stud-3",c(60,0,125,85,23,8).color(stainlessSteel));
p.part("stud-4",c(180,0,125,85,23,8).color(stainlessSteel));
p.part("stud-5",c(300,0,125,85,23,8).color(stainlessSteel));

return p.model();
