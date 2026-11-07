// SPDX-License-Identifier: CC0-1.0
// Wind-farm pad-mount transformer. Outdoor transformer box with two side cooling banks, top bushings and concrete pad. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "wind-farm-pad-mount-transformer",
  license: 'CC0-1.0',
  title: "Wind-farm pad-mount transformer",
  description: "Outdoor transformer box with two side cooling banks, top bushings and concrete pad. Controls: scale and powder-coated steel, concrete, electrical ceramic, aluminium; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 500,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const powderCoatedSteel = param('powderCoatedSteel', '#287082', { label: 'Powder-coated steel' });
const concrete = param('concrete', '#8b8c84', { label: 'Concrete' });
const ceramic = param('ceramic', '#eee2ca', { label: 'Electrical ceramic' });
const aluminium = param('aluminium', '#aab7bb', { label: 'Aluminium' });

presets({
  weathered: {"powderCoatedSteel": "#1f5765", "concrete": "#96978f"},
  highVisibility: {"powderCoatedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("wind-farm-pad-mount-transformer");
p.part("pad",b(0,0,0,900,700,50).color(concrete));
p.part("tank",b(0,0,50,700,520,650).color(powderCoatedSteel));
p.part("lid",b(0,0,700,760,570,40).color(powderCoatedSteel));
p.part("fin-0",b(-250,-284,300,44,48,400).color(aluminium));
p.part("fin-1",b(-125,-284,300,44,48,400).color(aluminium));
p.part("fin-2",b(0,-284,300,44,48,400).color(aluminium));
p.part("fin-3",b(125,-284,300,44,48,400).color(aluminium));
p.part("fin-4",b(250,-284,300,44,48,400).color(aluminium));
p.part("bushing-base-0",c(-225,-80,740,28,70,10).color(ceramic));
p.part("bushing-base-1",c(0,-80,740,28,70,10).color(ceramic));
p.part("bushing-base-2",c(225,-80,740,28,70,10).color(ceramic));
p.part("bushing-0",c(-225,-80,768,205,52,10).color(ceramic));
p.part("bushing-1",c(0,-80,768,205,52,10).color(ceramic));
p.part("bushing-2",c(225,-80,768,205,52,10).color(ceramic));

return p.model();
