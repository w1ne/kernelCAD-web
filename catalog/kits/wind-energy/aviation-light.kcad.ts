// SPDX-License-Identifier: CC0-1.0
// Turbine aviation light. Low polygon aviation beacon with a square bracket, cylindrical lamp and cap. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "aviation-light",
  license: 'CC0-1.0',
  title: "Turbine aviation light",
  description: "Low polygon aviation beacon with a square bracket, cylindrical lamp and cap. Controls: scale and powder-coated steel, polycarbonate; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 300,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel = param('powderCoatedSteel', '#287082', { label: 'Powder-coated steel' });
const polycarbonate = param('polycarbonate', '#d8b546', { label: 'Polycarbonate' });

presets({
  weathered: {"powderCoatedSteel": "#1f5765", "polycarbonate": "#e9c34c"},
  highVisibility: {"polycarbonate": "#f2b92e"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("aviation-light");
p.part("mount",b(0,0,0,200,200,40).color(powderCoatedSteel));
p.part("stem",c(0,0,20,100,28,8).color(powderCoatedSteel));
p.part("lamp",c(0,0,120,100,75,8).color(polycarbonate));
p.part("cap",c(0,0,220,30,82,8).color(powderCoatedSteel));

return p.model();
