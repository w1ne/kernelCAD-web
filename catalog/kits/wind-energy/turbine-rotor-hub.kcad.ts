// SPDX-License-Identifier: CC0-1.0
// Turbine rotor hub. Three-arm rotor hub with central barrel, front cap and three blade-root sockets. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "turbine-rotor-hub",
  license: 'CC0-1.0',
  title: "Turbine rotor hub",
  description: "Three-arm rotor hub with central barrel, front cap and three blade-root sockets. Controls: scale and painted steel, cast steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 550,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const paintedSteel = param('paintedSteel', '#53727c', { label: 'Painted steel' });
const castSteel = param('castSteel', '#59666b', { label: 'Cast steel' });

presets({
  weathered: {"paintedSteel": "#415961", "castSteel": "#606e74"},
  highVisibility: {"paintedSteel": "#d8a62b"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("turbine-rotor-hub");
p.part("hub",c(0,0,0,260,190,8).color(castSteel));
p.part("nose",c(0,-190,70,100,110,8).color(paintedSteel));
p.part("arm-up",b(0,0,280,100,100,440).color(paintedSteel));
p.part("arm-left",b(-300,0,0,600,100,100).color(paintedSteel));
p.part("arm-right",b(300,0,0,600,100,100).color(paintedSteel));
p.part("root-0",c(0,0,680,110,75,8).color(castSteel));
p.part("root-1",c(-600,0,0,110,75,8).color(castSteel));
p.part("root-2",c(600,0,0,110,75,8).color(castSteel));

return p.model();
