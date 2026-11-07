// SPDX-License-Identifier: CC0-1.0
// Tower base flange. Circular tower base flange with raised center sleeve and eight anchor bosses. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "tower-base-flange",
  license: 'CC0-1.0',
  title: "Tower base flange",
  description: "Circular tower base flange with raised center sleeve and eight anchor bosses. Controls: scale and structural steel, stainless steel; weathered and high-visibility presets.",
  tags: ['wind', 'energy', 'renewable', 'low poly', 'scene prop'],
  kit: 'wind-energy',
  category: 'prop',
  origin: 'base',
  compat: ['wind', 'energy', 'industrial', 'scene'],
  triangleBudget: 900,
});

const scale = param('scale', 1, { min: 0.7, max: 1.3, step: 0.05, label: 'Overall scale' });
const structuralSteel = param('structuralSteel', '#556971', { label: 'Structural steel' });
const stainlessSteel = param('stainlessSteel', '#b8c2c5', { label: 'Stainless steel' });

presets({
  weathered: {"structuralSteel": "#425258", "stainlessSteel": "#c7d2d5"},
  highVisibility: {"structuralSteel": "#d8a62b"},
});

const c=(x:number,y:number,z:number,h:number,r:number,n=8)=>cylinder(h,r,n).translate(x,y,z).scale(scale);

const p=assembly("tower-base-flange");
p.part("flange",c(0,0,0,90,310,12).color(structuralSteel));
p.part("sleeve",c(0,0,90,540,120,8).color(structuralSteel));
p.part("anchor-0",c(0,-250,0,70,32,8).color(stainlessSteel));
p.part("anchor-1",c(177,-177,0,70,32,8).color(stainlessSteel));
p.part("anchor-2",c(250,0,0,70,32,8).color(stainlessSteel));
p.part("anchor-3",c(177,177,0,70,32,8).color(stainlessSteel));
p.part("anchor-4",c(0,250,0,70,32,8).color(stainlessSteel));
p.part("anchor-5",c(-177,177,0,70,32,8).color(stainlessSteel));
p.part("anchor-6",c(-250,0,0,70,32,8).color(stainlessSteel));
p.part("anchor-7",c(-177,-177,0,70,32,8).color(stainlessSteel));

return p.model();
