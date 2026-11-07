// SPDX-License-Identifier: CC0-1.0
// Wind farm meter pedestal. Short metering pedestal with a cabinet head, status light and broad footplate. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "wind-farm-meter-pedestal",
  license: 'CC0-1.0',
  title: "Wind farm meter pedestal",
  description: "Short metering pedestal with a cabinet head, status light and broad footplate. Controls: scale and powder-coated steel, polycarbonate; weathered and high-visibility presets.",
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

const p=assembly("wind-farm-meter-pedestal");
p.part("foot",b(0,0,0,360,360,50).color(powderCoatedSteel));
p.part("post",c(0,0,25,720,50,8).color(powderCoatedSteel));
p.part("head",b(0,0,745,380,300,300).color(powderCoatedSteel));
p.part("screen",b(0,-155,775,200,18,135).color(polycarbonate));
p.part("light",c(120,-170,695,32,22,8).color(polycarbonate));
p.part("hood",b(0,0,915,420,340,40).color(powderCoatedSteel));

return p.model();
