// SPDX-License-Identifier: CC0-1.0
// Foundation anchor cage. Circular anchor cage ring with eight vertical bolts and a central tower socket. Stylized catalog geometry, millimetres, Z up.

meta({
  name: "foundation-anchor-cage",
  license: 'CC0-1.0',
  title: "Foundation anchor cage",
  description: "Circular anchor cage ring with eight vertical bolts and a central tower socket. Controls: scale and structural steel, stainless steel; weathered and high-visibility presets.",
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

const p=assembly("foundation-anchor-cage");
p.part("ring",c(0,0,0,70,350,12).color(stainlessSteel));
p.part("socket",c(0,0,70,300,145,8).color(structuralSteel));
p.part("bolt-0",c(0,-300,0,240,24,8).color(stainlessSteel));
p.part("bolt-1",c(212,-212,0,240,24,8).color(stainlessSteel));
p.part("bolt-2",c(300,0,0,240,24,8).color(stainlessSteel));
p.part("bolt-3",c(212,212,0,240,24,8).color(stainlessSteel));
p.part("bolt-4",c(0,300,0,240,24,8).color(stainlessSteel));
p.part("bolt-5",c(-212,212,0,240,24,8).color(stainlessSteel));
p.part("bolt-6",c(-300,0,0,240,24,8).color(stainlessSteel));
p.part("bolt-7",c(-212,-212,0,240,24,8).color(stainlessSteel));

return p.model();
