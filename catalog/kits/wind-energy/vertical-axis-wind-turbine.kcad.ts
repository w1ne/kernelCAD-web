const radialRotorBlade = (height: number, z: number, angle: number) => {
  const outline = path()
    .moveTo(170, -28).lineTo(270, -28).lineTo(305, -14)
    .lineTo(305, 14).lineTo(270, 28).lineTo(170, 28).lineTo(158, 0).close();
  return outline.extrude(height).rotateZ(angle).translate(0, 0, z).scale(scale);
};
// SPDX-License-Identifier: CC0-1.0
// Vertical-axis wind turbine. Three-blade vertical-axis rotor with an open frame, central shaft, and radial supports. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "vertical-axis-wind-turbine",
  license: 'CC0-1.0',
  title: "Vertical-axis wind turbine",
  description: "Three-blade vertical-axis rotor with an open frame, central shaft, and radial supports. Controls: scale and galvanized steel, fiberglass composite, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 550,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const galvanizedSteel = param('galvanizedSteel', '#52727c', { label: 'Galvanized steel' });
const fiberglassComposite = param('fiberglassComposite', '#e7ebe1', { label: 'Fiberglass composite' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"galvanizedSteel": "#415961", "fiberglassComposite": "#f9fef3"},
  highVisibility: {"fiberglassComposite": "#e48d35"},
});

const b=(x:number,y:number,z:number,w:number,d:number,h:number)=>box(w,d,h,true).translate(x,y,z+h/2).scale(scale);
const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("vertical-axis-wind-turbine");
p.part("shaft",c(0,0,60,980,36,10).color(stainlessSteel));
p.part("blade-a",radialRotorBlade(920,90,0).color(fiberglassComposite));
p.part("blade-b",radialRotorBlade(920,90,120).color(fiberglassComposite));
p.part("blade-c",radialRotorBlade(920,90,240).color(fiberglassComposite));
p.part("lower-arm-a",b(135,0,110,270,32,28).color(galvanizedSteel));
p.part("lower-arm-b",b(135,0,110,270,32,28).rotateZ(120).color(galvanizedSteel));
p.part("lower-arm-c",b(135,0,110,270,32,28).rotateZ(240).color(galvanizedSteel));
p.part("upper-arm-a",b(135,0,925,270,32,28).color(galvanizedSteel));
p.part("upper-arm-b",b(135,0,925,270,32,28).rotateZ(120).color(galvanizedSteel));
p.part("upper-arm-c",b(135,0,925,270,32,28).rotateZ(240).color(galvanizedSteel));
p.part("lower-bearing",c(0,0,70,70,72,10).color(stainlessSteel));
p.part("upper-bearing",c(0,0,960,70,72,10).color(stainlessSteel));
p.part("base",b(0,0,0,680,540,50).color(galvanizedSteel));

return p.model();
