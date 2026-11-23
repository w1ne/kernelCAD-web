// SPDX-License-Identifier: CC0-1.0
// Tower base flange. Circular base flange under a tower shell stub; eight galvanized anchor studs with nuts stand on the flange around the shell. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "tower-base-flange",
  license: 'CC0-1.0',
  title: "Tower base flange",
  description: "Circular tower base flange with a raised shell stub and eight galvanized anchor studs with nuts on the bolt circle. Controls: scale and structural steel, galvanized anchor steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 1100,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const anchorSteel = param('anchorSteel', '#a9b6b7', { label: 'Galvanized anchor steel' });

presets({
  weathered: {"structuralSteel": "#425258", "anchorSteel": "#8c9896"},
  highVisibility: {"structuralSteel": "#d8a62b"},
});

const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("tower-base-flange");
p.part("flange",c(0,0,0,90,310,12).color(structuralSteel));
p.part("sleeve",c(0,0,90,540,190,12).color(structuralSteel));
p.part("anchor-0",c(0,-250,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-0",c(0,-250,90,28,30,6).color(anchorSteel));
p.part("anchor-1",c(177,-177,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-1",c(177,-177,90,28,30,6).color(anchorSteel));
p.part("anchor-2",c(250,0,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-2",c(250,0,90,28,30,6).color(anchorSteel));
p.part("anchor-3",c(177,177,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-3",c(177,177,90,28,30,6).color(anchorSteel));
p.part("anchor-4",c(0,250,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-4",c(0,250,90,28,30,6).color(anchorSteel));
p.part("anchor-5",c(-177,177,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-5",c(-177,177,90,28,30,6).color(anchorSteel));
p.part("anchor-6",c(-250,0,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-6",c(-250,0,90,28,30,6).color(anchorSteel));
p.part("anchor-7",c(-177,-177,60,90,16,8).color(anchorSteel));
p.part("anchor-nut-7",c(-177,-177,90,28,30,6).color(anchorSteel));

return p.model();
