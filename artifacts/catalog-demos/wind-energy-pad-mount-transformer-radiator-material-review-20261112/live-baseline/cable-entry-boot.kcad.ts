// SPDX-License-Identifier: CC0-1.0
// Cable entry boot. Flexible-looking cable entry boot with base plate, raised collar and short conduit riser. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "cable-entry-boot",
  license: 'CC0-1.0',
  title: "Cable entry boot",
  description: "Flexible-looking cable entry boot with base plate, raised collar and short conduit riser. Controls: scale and galvanized steel, insulating polymer; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 400,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const galvanizedSteel = param('galvanizedSteel', '#8b9c9e', { label: 'Galvanized steel' });
const insulatingPolymer = param('insulatingPolymer', '#263e47', { label: 'Insulating polymer' });

presets({
  weathered: {"galvanizedSteel": "#6c7a7b", "insulatingPolymer": "#29434d"},
  highVisibility: {"galvanizedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("cable-entry-boot");
p.part("plate",b(0,0,0,460,380,50).color(galvanizedSteel));
p.part("boot",c(0,0,25,160,140,8).color(insulatingPolymer));
p.part("collar",c(0,0,185,60,115,8).color(galvanizedSteel));
p.part("conduit",c(0,0,245,370,50,8).color(galvanizedSteel));
p.part("cap",c(0,0,615,35,66,8).color(galvanizedSteel));

return p.model();
