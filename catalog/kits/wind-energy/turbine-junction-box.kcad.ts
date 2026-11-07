// SPDX-License-Identifier: CC0-1.0
// Turbine junction box. Compact sealed junction box with four cable glands, lid lip and mounting feet. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-junction-box",
  license: 'CC0-1.0',
  title: "Turbine junction box",
  description: "Compact sealed junction box with four cable glands, lid lip and mounting feet. Controls: scale and powder-coated steel, insulating polymer; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 450,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel = param('powderCoatedSteel', '#287082', { label: 'Powder-coated steel' });
const insulatingPolymer = param('insulatingPolymer', '#263e47', { label: 'Insulating polymer' });

presets({
  weathered: {"powderCoatedSteel": "#1f5765", "insulatingPolymer": "#29434d"},
  highVisibility: {"powderCoatedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-junction-box");
p.part("case",b(0,0,100,420,300,200).color(powderCoatedSteel));
p.part("lid",b(0,0,215,450,330,30).color(powderCoatedSteel));
p.part("gland-0",c(-135,0,0,100,28,8).color(insulatingPolymer));
p.part("gland-1",c(-45,0,0,100,28,8).color(insulatingPolymer));
p.part("gland-2",c(45,0,0,100,28,8).color(insulatingPolymer));
p.part("gland-3",c(135,0,0,100,28,8).color(insulatingPolymer));
p.part("foot--160",b(-160,0,0,80,90,65).color(powderCoatedSteel));
p.part("foot-160",b(160,0,0,80,90,65).color(powderCoatedSteel));

return p.model();
